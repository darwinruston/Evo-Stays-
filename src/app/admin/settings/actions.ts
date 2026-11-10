"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { isCountryCode, isCurrencyCode } from "@/lib/region";
import { logAudit } from "@/lib/audit";
import { disconnectXero, listXeroAccounts } from "@/lib/xero";

// Switching a part off only hides it and refuses new work in it: nothing
// already recorded is deleted, so turning it back on brings it all back.
export async function updateModules(formData: FormData) {
  const { session } = await requireAdmin();

  await prisma.organization.update({
    where: { id: session.user.organizationId },
    data: {
      syncEnabled: formData.get("sync") === "on",
      invoicingEnabled: formData.get("invoicing") === "on",
      laundryEnabled: formData.get("laundry") === "on",
      stockEnabled: formData.get("stock") === "on",
    },
  });

  revalidatePath("/admin", "layout");
  revalidatePath("/cleaner", "layout");
}

// The country the company works in decides how dates, money and the clock are
// written (see src/lib/region.ts). Changing the currency only changes how
// amounts are written: no recorded amount is converted.
export async function updateRegion(formData: FormData) {
  const { session } = await requireAdmin();

  const country = formData.get("country");
  const currency = formData.get("currency");
  if (!isCountryCode(country) || !isCurrencyCode(currency)) return;

  await prisma.organization.update({
    where: { id: session.user.organizationId },
    data: { country, currency },
  });

  revalidatePath("/admin", "layout");
  revalidatePath("/cleaner", "layout");
  revalidatePath("/linen", "layout");
}

// Which Xero accounts bills are coded to and payments are taken from. Checked
// against Xero's own list, so a tampered form cannot point at an account that
// is not in the company's chart of accounts.
export async function saveXeroAccounts(formData: FormData) {
  const { session, db } = await requireAdmin();
  const expense = formData.get("expenseAccountCode");
  const bank = formData.get("bankAccountId");
  if (typeof expense !== "string" || typeof bank !== "string") return;

  const accounts = await listXeroAccounts(db);
  const expenseOk = expense === "" || accounts.expense.some((a) => a.code === expense);
  const bankOk = bank === "" || accounts.bank.some((a) => a.id === bank);
  if (!expenseOk || !bankOk) return;

  await db.xeroConnection.update({
    where: { organizationId: session.user.organizationId },
    data: { expenseAccountCode: expense || null, bankAccountId: bank || null },
  });
  revalidatePath("/admin/settings");
}

export async function disconnectXeroAction() {
  const { session, db } = await requireAdmin();
  await disconnectXero(db);
  await logAudit(db, {
    actorId: session.user.id,
    entityType: "Staff",
    entityId: session.user.id,
    summary: "Disconnected Xero",
  });
  revalidatePath("/admin/settings");
  revalidatePath("/admin/invoices");
}
