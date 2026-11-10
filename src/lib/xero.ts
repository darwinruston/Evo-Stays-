import { createHash } from "crypto";
import { decrypt, encrypt } from "@/lib/encryption";
import { propertyDisplayName } from "@/lib/address";
import { formatDate, toIsoDate } from "@/lib/schedule";
import { formatHours } from "@/lib/invoices";
import { currentRegion } from "@/lib/region";
import type { ScopedPrismaClient } from "@/lib/prisma";

// Sends a company's cleaner invoices to its own Xero account as bills, and
// records the payment against the bill when the invoice is marked paid here.
//
// Each company connects its own Xero organisation through Xero's sign-in page
// (OAuth 2.0); this app never sees a Xero password. The tokens it is given are
// stored encrypted on XeroConnection. The app itself is registered once with
// Xero by whoever runs this server, and its key and secret are server settings
// (XERO_CLIENT_ID, XERO_CLIENT_SECRET), not per company.
//
// Amounts are sent as they are: no tax is added or worked out (the bill lines
// go in as "no tax"), and the currency is the company's own (see
// src/lib/region.ts), which Xero must already have switched on for the
// organisation.

// Overridable only so a local stand-in for Xero can be used to test this
// without a real account.
const AUTH_URL = process.env.XERO_AUTH_URL ?? "https://login.xero.com/identity/connect/authorize";
const IDENTITY_URL = process.env.XERO_IDENTITY_URL ?? "https://identity.xero.com/connect";
const API_URL = process.env.XERO_API_URL ?? "https://api.xero.com";

// Xero's newer, narrower permissions: bills, their payments, suppliers, and
// reading the chart of accounts and bank accounts. offline_access is what
// allows staying connected without signing in to Xero every half hour.
export const XERO_SCOPES = "offline_access accounting.invoices accounting.payments accounting.contacts accounting.settings.read";

export class XeroError extends Error {}

export function xeroConfigured(): boolean {
  return !!process.env.XERO_CLIENT_ID && !!process.env.XERO_CLIENT_SECRET;
}

// The exact address registered in Xero's developer portal for this app. APP_URL
// when it is set (the public address of this server), otherwise the address the
// request came in on.
export function xeroRedirectUri(requestOrigin: string): string {
  const base = (process.env.APP_URL ?? requestOrigin).replace(/\/+$/, "");
  return `${base}/api/xero/callback`;
}

export function xeroAuthorizeUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.XERO_CLIENT_ID ?? "",
    redirect_uri: redirectUri,
    scope: XERO_SCOPES,
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

type TokenResponse = { access_token: string; refresh_token: string; expires_in: number };

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const basic = Buffer.from(`${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`).toString("base64");
  const res = await fetch(`${IDENTITY_URL}/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
    signal: AbortSignal.timeout(15000),
  });
  const data = (await res.json().catch(() => null)) as (Partial<TokenResponse> & { error?: string }) | null;
  if (!res.ok || !data?.access_token || !data.refresh_token || !data.expires_in) {
    throw new XeroError(
      data?.error === "invalid_grant"
        ? "Xero no longer accepts this connection. Connect to Xero again from Settings."
        : `Xero would not sign us in (${res.status}).`,
    );
  }
  return { access_token: data.access_token, refresh_token: data.refresh_token, expires_in: data.expires_in };
}

// Finishes the sign-in: swaps the one-off code Xero sent back for tokens, and
// finds which Xero organisation was authorised (the first one, when several
// were ticked).
export async function exchangeCode(code: string, redirectUri: string) {
  const tokens = await tokenRequest({ grant_type: "authorization_code", code, redirect_uri: redirectUri });
  const res = await fetch(`${API_URL}/connections`, {
    headers: { Authorization: `Bearer ${tokens.access_token}`, Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  const connections = (await res.json().catch(() => null)) as { tenantId: string; tenantName: string; tenantType?: string }[] | null;
  const tenant = connections?.find((c) => c.tenantType !== "PRACTICE") ?? connections?.[0];
  if (!res.ok || !tenant) throw new XeroError("Xero did not say which organisation was connected.");
  return {
    tenantId: tenant.tenantId,
    tenantName: tenant.tenantName,
    accessTokenEnc: encrypt(tokens.access_token),
    refreshTokenEnc: encrypt(tokens.refresh_token),
    accessExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
  };
}

// Xero hands out a new refresh token every time one is used and the old one
// stops working, so two refreshes at once for the same company would lock it
// out. One at a time per company.
const refreshing = new Map<string, Promise<string>>();

async function accessToken(db: ScopedPrismaClient): Promise<{ token: string; tenantId: string }> {
  const conn = await db.xeroConnection.findUnique({ where: { organizationId: db.organizationId } });
  if (!conn) throw new XeroError("Xero is not connected. Connect it from Settings.");
  if (conn.accessExpiresAt.getTime() - Date.now() > 60_000) {
    return { token: decrypt(conn.accessTokenEnc), tenantId: conn.tenantId };
  }
  let pending = refreshing.get(conn.organizationId);
  if (!pending) {
    pending = (async () => {
      const tokens = await tokenRequest({ grant_type: "refresh_token", refresh_token: decrypt(conn.refreshTokenEnc) });
      await db.xeroConnection.update({
        where: { organizationId: conn.organizationId },
        data: {
          accessTokenEnc: encrypt(tokens.access_token),
          refreshTokenEnc: encrypt(tokens.refresh_token),
          accessExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        },
      });
      return tokens.access_token;
    })().finally(() => refreshing.delete(conn.organizationId));
    refreshing.set(conn.organizationId, pending);
  }
  return { token: await pending, tenantId: conn.tenantId };
}

// What Xero said was wrong, in a sentence: its validation messages when it
// gives them, otherwise the status.
function describeFailure(status: number, data: unknown, retryAfter: string | null): string {
  if (status === 429) return `Xero asked us to slow down. Try again in ${retryAfter ?? "a minute"}${retryAfter ? " seconds" : ""}.`;
  if (status === 401 || status === 403) return "Xero refused permission. Connect to Xero again from Settings.";
  const body = data as {
    Message?: string;
    Detail?: string;
    Elements?: { ValidationErrors?: { Message: string }[] }[];
    Invoices?: { ValidationErrors?: { Message: string }[] }[];
  } | null;
  const messages = [
    ...(body?.Elements ?? []).flatMap((e) => (e.ValidationErrors ?? []).map((v) => v.Message)),
    ...(body?.Invoices ?? []).flatMap((e) => (e.ValidationErrors ?? []).map((v) => v.Message)),
  ];
  if (messages.length > 0) return `Xero said: ${[...new Set(messages)].join(" ")}`;
  if (body?.Message) return `Xero said: ${body.Message}`;
  if (body?.Detail) return `Xero said: ${body.Detail}`;
  return `Xero returned an error (${status}).`;
}

// Xero refuses a retry that reuses a duplicate-protection key with different
// contents, so the key carries a fingerprint of the request: the same request
// sent twice is de-duplicated, a corrected one goes through.
function keyFor(base: string, body: unknown): string {
  return `${base}-${createHash("sha1").update(JSON.stringify(body)).digest("hex").slice(0, 12)}`;
}

async function xeroFetch<T>(
  db: ScopedPrismaClient,
  method: "GET" | "POST" | "PUT",
  path: string,
  options: { body?: unknown; idempotencyKey?: string } = {},
): Promise<T> {
  const { token, tenantId } = await accessToken(db);
  const res = await fetch(`${API_URL}/api.xro/2.0/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "xero-tenant-id": tenantId,
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.idempotencyKey ? { "Idempotency-Key": keyFor(options.idempotencyKey, options.body) } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new XeroError(describeFailure(res.status, data, res.headers.get("retry-after")));
  return data as T;
}

export type XeroAccount = { id: string; code: string | null; name: string };

type RawAccount = { AccountID: string; Code?: string; Name: string; Type: string; Class?: string; Status?: string };

// The accounts a company can pick in Settings: where bills are coded to
// (expense accounts, which need a code) and which bank account payments come
// out of.
export async function listXeroAccounts(db: ScopedPrismaClient): Promise<{ expense: XeroAccount[]; bank: XeroAccount[] }> {
  const data = await xeroFetch<{ Accounts?: RawAccount[] }>(db, "GET", "Accounts");
  const active = (data.Accounts ?? []).filter((a) => a.Status === "ACTIVE" || a.Status === undefined);
  const map = (a: RawAccount): XeroAccount => ({ id: a.AccountID, code: a.Code ?? null, name: a.Name });
  return {
    expense: active.filter((a) => a.Class === "EXPENSE" && a.Code).map(map),
    bank: active.filter((a) => a.Type === "BANK").map(map),
  };
}

// A bill needs a supplier. Cleaners are looked up by name and made if missing,
// so the same person is the same supplier every time (Xero keeps names unique).
async function supplierFor(db: ScopedPrismaClient, name: string, email: string | null): Promise<string> {
  const escaped = name.replace(/"/g, '\\"');
  const found = await xeroFetch<{ Contacts?: { ContactID: string }[] }>(
    db,
    "GET",
    `Contacts?where=${encodeURIComponent(`Name=="${escaped}"`)}`,
  );
  const existing = found.Contacts?.[0]?.ContactID;
  if (existing) return existing;
  const created = await xeroFetch<{ Contacts?: { ContactID: string }[] }>(db, "POST", "Contacts", {
    body: { Contacts: [{ Name: name, ...(email ? { EmailAddress: email } : {}) }] },
  });
  const id = created.Contacts?.[0]?.ContactID;
  if (!id) throw new XeroError("Xero did not create the supplier.");
  return id;
}

export type XeroSendResult = { error: string } | { ok: true };

const invoiceInclude = {
  cleaner: { select: { name: true, email: true } },
  property: { select: { nickname: true, name: true, address: true } },
  lines: { orderBy: { arrivedAt: "asc" as const } },
};

// A short, stable bill number: the last characters of the invoice's own id.
function billNumber(invoiceId: string): string {
  return `EVO-${invoiceId.slice(-8).toUpperCase()}`;
}

// Creates the bill in Xero for one invoice (once: an invoice already sent is
// left alone), and records the payment too when the invoice is already marked
// paid. Never throws for a Xero problem: the reason is saved on the invoice and
// returned, so the page can show it with a retry button.
export async function sendInvoiceToXero(db: ScopedPrismaClient, invoiceId: string): Promise<XeroSendResult> {
  try {
    const conn = await db.xeroConnection.findUnique({ where: { organizationId: db.organizationId } });
    if (!conn) return { error: "Xero is not connected. Connect it from Settings." };
    if (!conn.expenseAccountCode) return { error: "Choose the Xero account bills are coded to in Settings first." };

    const invoice = await db.invoice.findUnique({ where: { id: invoiceId }, include: invoiceInclude });
    if (!invoice) return { error: "Invoice not found." };

    let xeroInvoiceId = invoice.xeroInvoiceId;
    if (!xeroInvoiceId) {
      const contactId = await supplierFor(db, invoice.cleaner.name, invoice.cleaner.email);
      const property = propertyDisplayName(invoice.property);
      const lastDay = new Date(invoice.periodEnd.getTime() - 1);
      const created = await xeroFetch<{ Invoices?: { InvoiceID: string }[] }>(db, "POST", "Invoices", {
        // The same invoice sent twice (a double click, a retry after a dropped
        // connection) is one bill, not two.
        idempotencyKey: `evo-${invoice.id}`,
        body: {
          Invoices: [
            {
              Type: "ACCPAY",
              Contact: { ContactID: contactId },
              Date: toIsoDate(lastDay),
              // Xero will not take a bill without one. Fourteen days after the
              // period ends, since nothing here records agreed payment terms.
              DueDate: toIsoDate(new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate() + 14)),
              InvoiceNumber: billNumber(invoice.id),
              Reference: `${property}, ${formatDate(invoice.periodStart)} to ${formatDate(lastDay)}`,
              CurrencyCode: currentRegion().currency,
              LineAmountType: "NoTax",
              Status: "AUTHORISED",
              LineItems: invoice.lines.map((line) => ({
                Description: `${formatDate(line.arrivedAt)}, ${property}, ${
                  line.flatFee !== null ? "flat fee" : `${line.teamSize > 1 ? `${line.teamSize} people x ` : ""}${formatHours(line.hours / line.teamSize)}`
                }`,
                Quantity: 1,
                UnitAmount: line.amount,
                AccountCode: conn.expenseAccountCode,
                // Said on every line: without it Xero applies the expense
                // account's usual tax rate (20% VAT in the UK) and the bill
                // comes out higher than the invoice here.
                TaxType: "NONE",
              })),
            },
          ],
        },
      });
      xeroInvoiceId = created.Invoices?.[0]?.InvoiceID ?? null;
      if (!xeroInvoiceId) throw new XeroError("Xero did not create the bill.");
      await db.invoice.update({
        where: { id: invoice.id },
        data: { xeroInvoiceId, xeroSyncedAt: new Date(), xeroError: null },
      });
    }

    if (invoice.paidAt && !invoice.xeroPaymentId) {
      const paid = await recordXeroPayment(db, invoice.id);
      if ("error" in paid) return paid;
    }
    return { ok: true };
  } catch (err) {
    const message = err instanceof XeroError ? err.message : "Could not reach Xero. Try again in a moment.";
    await db.invoice.update({ where: { id: invoiceId }, data: { xeroError: message } }).catch(() => undefined);
    return { error: message };
  }
}

// Records the payment against an invoice's bill, from the bank account chosen
// in Settings. Only does something for an invoice that is in Xero and paid
// here; an invoice not sent yet gets its payment when it is sent.
export async function recordXeroPayment(db: ScopedPrismaClient, invoiceId: string): Promise<XeroSendResult> {
  try {
    const conn = await db.xeroConnection.findUnique({ where: { organizationId: db.organizationId } });
    const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
    if (!conn || !invoice?.xeroInvoiceId || !invoice.paidAt || invoice.xeroPaymentId) return { ok: true };
    if (!conn.bankAccountId) {
      return { error: "Choose the Xero bank account payments come from in Settings, then send this again." };
    }
    const data = await xeroFetch<{ Payments?: { PaymentID: string }[] }>(db, "PUT", "Payments", {
      // Per payment, so paying again after an undo is a new payment, not the old
      // (deleted) one handed back.
      idempotencyKey: `evo-pay-${invoice.id}-${invoice.paidAt.getTime()}`,
      body: {
        Payments: [
          {
            Invoice: { InvoiceID: invoice.xeroInvoiceId },
            Account: { AccountID: conn.bankAccountId },
            Date: toIsoDate(invoice.paidAt),
            Amount: invoice.totalAmount,
          },
        ],
      },
    });
    const paymentId = data.Payments?.[0]?.PaymentID;
    if (!paymentId) throw new XeroError("Xero did not record the payment.");
    await db.invoice.update({ where: { id: invoice.id }, data: { xeroPaymentId: paymentId, xeroError: null } });
    return { ok: true };
  } catch (err) {
    const message = err instanceof XeroError ? err.message : "Could not reach Xero. Try again in a moment.";
    await db.invoice.update({ where: { id: invoiceId }, data: { xeroError: message } }).catch(() => undefined);
    return { error: message };
  }
}

// Undoes that payment when an invoice is marked unpaid here again. Xero will
// not delete a payment that has already been reconciled with a bank statement:
// then the reason comes back and the payment is left in Xero to be removed there.
export async function reverseXeroPayment(db: ScopedPrismaClient, invoiceId: string): Promise<XeroSendResult> {
  try {
    const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice?.xeroPaymentId) return { ok: true };
    await xeroFetch(db, "POST", `Payments/${invoice.xeroPaymentId}`, {
      body: { Payments: [{ PaymentID: invoice.xeroPaymentId, Status: "DELETED" }] },
    });
    await db.invoice.update({ where: { id: invoice.id }, data: { xeroPaymentId: null, xeroError: null } });
    return { ok: true };
  } catch (err) {
    const message = err instanceof XeroError ? err.message : "Could not reach Xero. Try again in a moment.";
    await db.invoice.update({ where: { id: invoiceId }, data: { xeroError: message } }).catch(() => undefined);
    return { error: message };
  }
}

// The page in Xero where the bill can be opened.
export function xeroBillUrl(xeroInvoiceId: string): string {
  return `https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=${xeroInvoiceId}`;
}

// Cuts the link: tells Xero to forget the connection (best effort) and deletes
// the stored tokens. Bills already in Xero stay there, and invoices here keep
// their record of having been sent.
export async function disconnectXero(db: ScopedPrismaClient): Promise<void> {
  const conn = await db.xeroConnection.findUnique({ where: { organizationId: db.organizationId } });
  if (!conn) return;
  try {
    const basic = Buffer.from(`${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`).toString("base64");
    await fetch(`${IDENTITY_URL}/revocation`, {
      method: "POST",
      headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: decrypt(conn.refreshTokenEnc) }),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    // Deleting our copy is what matters; Xero's own list of connected apps can
    // still be cleared from inside Xero.
  }
  await db.xeroConnection.delete({ where: { organizationId: db.organizationId } });
}
