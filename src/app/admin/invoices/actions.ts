"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { InvoiceCadence } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/authz";
import { assertModule } from "@/lib/modules";
// prisma (the raw client) is used once below, deliberately -- see the
// comment on adjustInvoiceLineHours.
import { generateInvoices, formatHours } from "@/lib/invoices";
import { logAudit } from "@/lib/audit";
import { recordXeroPayment, reverseXeroPayment, sendInvoiceToXero } from "@/lib/xero";

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
  const { session, db } = await requireStaff();
  await assertModule(session.user.organizationId, "invoicing");

  const cadence = str(formData, "cadence");
  const valid: InvoiceCadence[] = ["WEEKLY", "FORTNIGHTLY", "MONTHLY"];
  if (!cadence || !valid.includes(cadence as InvoiceCadence)) {
    throw new Error("Pick a cadence");
  }

  await db.billingSettings.upsert({
    where: { organizationId: session.user.organizationId },
    update: { cadence: cadence as InvoiceCadence },
    create: { organizationId: session.user.organizationId, cadence: cadence as InvoiceCadence },
  });

  revalidatePath("/admin/invoices");
}

export async function runInvoiceGeneration(formData: FormData) {
  const { session, db } = await requireStaff();
  await assertModule(session.user.organizationId, "invoicing");

  const periodStart = localDateFromInput(formData, "periodStart");
  // The form's "To" is the last included day; generateInvoices wants an
  // exclusive upper bound, so the actual boundary is one day later.
  const lastIncludedDay = localDateFromInput(formData, "periodEnd");
  if (!periodStart || !lastIncludedDay) throw new Error("Pick a start and end date");
  const periodEnd = new Date(lastIncludedDay);
  periodEnd.setDate(periodEnd.getDate() + 1);
  if (periodEnd <= periodStart) throw new Error("End date must be on or after the start date");

  const result = await generateInvoices(db, periodStart, periodEnd);

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
  const { session, db } = await requireStaff();

  const hours = float(formData, "hours");
  if (hours === null) throw new Error("Enter a number of hours (0 or more)");

  const line = await db.invoiceLine.findUniqueOrThrow({
    where: { id: lineId },
    include: { invoice: true },
  });

  if (line.invoice.paidAt) {
    throw new Error("Mark the invoice unpaid before adjusting a visit.");
  }
  if (line.invoice.xeroInvoiceId) {
    throw new Error("This invoice has been sent to Xero. Change the bill in Xero instead.");
  }
  if (line.flatFee !== null) {
    throw new Error("This visit is billed at a flat fee, so its hours don't change what's paid.");
  }

  const amount = hours * line.invoice.hourlyRate;
  const previousHours = line.hours;

  // The two writes below need to be atomic with each other (a line's hours
  // and its invoice's totals must never be seen out of step), which needs a
  // real interactive transaction -- something the scoped `db` extension
  // can't provide (each of its calls opens its own transaction to carry the
  // set_config, so nesting one interactive transaction inside that would
  // just open a second, unrelated one). Falls back to the raw `prisma`
  // client's own $transaction instead, setting the same RLS session
  // variable by hand at the top so both statements stay correctly scoped.
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_organization_id', ${session.user.organizationId}, TRUE)`;
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

  await logAudit(db, {
    actorId: session.user.id,
    entityType: "Invoice",
    entityId: line.invoiceId,
    summary: `Adjusted a visit's billed hours from ${formatHours(previousHours)} to ${formatHours(hours)}`,
  });

  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/invoices/${line.invoiceId}`);
}

export async function setInvoicePaid(id: string, paid: boolean) {
  const { db } = await requireStaff();

  await db.invoice.update({
    where: { id },
    data: { paidAt: paid ? new Date() : null },
  });

  // An invoice already in Xero follows: paying it records the payment there,
  // and un-paying it takes that payment back. A Xero problem never blocks the
  // change here: it is saved on the invoice, shown on its page, and sending
  // it again retries.
  const invoice = await db.invoice.findUnique({ where: { id }, select: { xeroInvoiceId: true } });
  if (invoice?.xeroInvoiceId) {
    await (paid ? recordXeroPayment(db, id) : reverseXeroPayment(db, id));
  }

  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/invoices/${id}`);
}

// Sends one invoice to Xero as a bill (and its payment, if it is already paid).
export async function sendInvoiceToXeroAction(id: string) {
  const { session, db } = await requireStaff();
  await assertModule(session.user.organizationId, "invoicing");
  const result = await sendInvoiceToXero(db, id);
  if (!("error" in result)) {
    await logAudit(db, { actorId: session.user.id, entityType: "Invoice", entityId: id, summary: "Sent to Xero" });
  }
  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/invoices/${id}`);
}

// Sends every invoice not yet in Xero, one after another, then says how many
// went and how many Xero refused (each refusal is shown on its own invoice).
export async function sendUnsentToXero() {
  const { session, db } = await requireStaff();
  await assertModule(session.user.organizationId, "invoicing");
  const unsent = await db.invoice.findMany({
    where: { xeroInvoiceId: null },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  let sent = 0;
  let failed = 0;
  for (const { id } of unsent) {
    const result = await sendInvoiceToXero(db, id);
    if ("error" in result) {
      failed += 1;
      // The same fault (not connected, no account chosen) repeats for every
      // invoice, so stop at the first rather than hammering Xero.
      break;
    }
    sent += 1;
    await logAudit(db, { actorId: session.user.id, entityType: "Invoice", entityId: id, summary: "Sent to Xero" });
  }
  revalidatePath("/admin/invoices");
  redirect(`/admin/invoices?xeroSent=${sent}&xeroFailed=${failed}`);
}
