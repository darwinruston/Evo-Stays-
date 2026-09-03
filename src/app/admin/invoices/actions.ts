"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { InvoiceCadence } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/authz";
import { generateInvoices } from "@/lib/invoices";

function str(formData: FormData, key: string): string | null {
  const raw = formData.get(key);
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed === "" ? null : trimmed;
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

export async function setInvoicePaid(id: string, paid: boolean) {
  await requireStaff();

  await prisma.invoice.update({
    where: { id },
    data: { paidAt: paid ? new Date() : null },
  });

  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/invoices/${id}`);
}
