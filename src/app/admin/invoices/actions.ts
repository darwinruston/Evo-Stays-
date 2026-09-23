"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { InvoiceCadence } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/authz";
import { generateInvoices, formatHours } from "@/lib/invoices";
import { logAudit } from "@/lib/audit";

function str(formData: FormData, key: string): string | null {
  const raw = formData.get(key);
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed === "" ? null : trimmed;
}

function float(formData: FormData, key: string): number | null {
  const raw = str(formData, key);
  if (raw === null) return null;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// <input type="date"> submits "YYYY-MM-DD". new Date("YYYY-MM-DD") parses
// that as UTC midnight, which would silently shift the boundary by the
// server's offset -- built from parts instead, same local-time reasoning as
// toDateTimeLocalValue elsewhere in the app.
function localDateFromInput(formData: FormData, key: string): Date | null {
  const raw = str(formData, key);
  if (!raw) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function updateBillingCadence(formData: FormData) {
  await requireStaff();

  const cadence = str(formData, "cadence");
  const valid: InvoiceCadence[] = ["WEEKLY", "FORTNIGHTLY", "MONTHLY"];
  if (!cadence || !valid.includes(cadence as InvoiceCadence)) {
    throw new Error("Pick a cadence");
  }

  await prisma.billingSettings.upsert({
    where: { id: "singleton" },
    update: { cadence: cadence as InvoiceCadence },
    create: { id: "singleton", cadence: cadence as InvoiceCadence },
  });

  revalidatePath("/admin/invoices");
}

export async function runInvoiceGeneration(formData: FormData) {
  await requireStaff();

  const periodStart = localDateFromInput(formData, "periodStart");
  // The form's "To" is the last included day; generateInvoices wants an
  // exclusive upper bound, so the actual boundary is one day later.
  const lastIncludedDay = localDateFromInput(formData, "periodEnd");
  if (!periodStart || !lastIncludedDay) throw new Error("Pick a start and end date");
  const periodEnd = new Date(lastIncludedDay);
  periodEnd.setDate(periodEnd.getDate() + 1);
  if (periodEnd <= periodStart) throw new Error("End date must be on or after the start date");

  const result = await generateInvoices(periodStart, periodEnd);

  revalidatePath("/admin/invoices");

  const params = new URLSearchParams();
  params.set("created", String(result.createdInvoiceIds.length));
  if (result.skippedCleanerNames.length > 0) {
    params.set("skipped", result.skippedCleanerNames.join(", "));
  }
  redirect(`/admin/invoices?${params.toString()}`);
}

// Overrides what a single visit bills for, without touching the underlying
// arrivedAt/departedAt -- those stay the real record of when the cleaner was
// actually on site (e.g. a visit with an obviously bad checkout timestamp,
// like one minute on site, still needs a paper trail of what really
// happened). Locked once the invoice is marked paid, same as everything else
// about a paid invoice -- unmark it first to make a correction.
export async function adjustInvoiceLineHours(lineId: string, formData: FormData) {
  const session = await requireStaff();

  const hours = float(formData, "hours");
  if (hours === null) throw new Error("Enter a number of hours (0 or more)");

  const line = await prisma.invoiceLine.findUniqueOrThrow({
    where: { id: lineId },
    include: { invoice: true },
  });

  if (line.invoice.paidAt) {
    throw new Error("Mark the invoice unpaid before adjusting a visit.");
  }

  const amount = hours * line.invoice.hourlyRate;
  const previousHours = line.hours;

  await prisma.$transaction(async (tx) => {
    await tx.invoiceLine.update({ where: { id: lineId }, data: { hours, amount, adjusted: true } });
    const lines = await tx.invoiceLine.findMany({ where: { invoiceId: line.invoiceId } });
    await tx.invoice.update({
      where: { id: line.invoiceId },
      data: {
        totalHours: lines.reduce((sum, l) => sum + l.hours, 0),
        totalAmount: lines.reduce((sum, l) => sum + l.amount, 0),
      },
    });
  });

  await logAudit({
    actorId: session.user.id,
    entityType: "Invoice",
    entityId: line.invoiceId,
    summary: `Adjusted a visit's billed hours from ${formatHours(previousHours)} to ${formatHours(hours)}`,
  });

  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/invoices/${line.invoiceId}`);
}

export async function setInvoicePaid(id: string, paid: boolean) {
  await requireStaff();

  await prisma.invoice.update({
    where: { id },
    data: { paidAt: paid ? new Date() : null },
  });

  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/invoices/${id}`);
}
