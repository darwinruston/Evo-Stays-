import { headers } from "next/headers";
import { scopedDb } from "@/lib/prisma";
import { InfoTooltip } from "@/components/InfoTooltip";
import { SubmitButton } from "@/components/SubmitButton";
import { button, card, inputCompact } from "@/lib/ui";
import { listXeroAccounts, xeroConfigured, xeroRedirectUri, type XeroAccount } from "@/lib/xero";
import { disconnectXeroAction, saveXeroAccounts } from "./actions";

const NOTICES: Record<string, { tone: "good" | "bad"; text: string }> = {
  connected: { tone: "good", text: "Connected to Xero. Choose your accounts below." },
  declined: { tone: "bad", text: "Xero did not connect: the request was cancelled in Xero." },
  failed: { tone: "bad", text: "Xero did not connect. Try again, and if it keeps failing check the server's Xero settings." },
  notconfigured: { tone: "bad", text: "Xero has not been set up on this server yet." },
};

export async function XeroSettings({ organizationId, notice }: { organizationId: string; notice?: string }) {
  const db = scopedDb(organizationId);
  const connection = await db.xeroConnection.findUnique({ where: { organizationId } });
  const configured = xeroConfigured();

  // Xero's list of accounts, for the two pickers. A failure here (Xero down, or
  // the connection no longer accepted) is shown rather than hiding the section.
  let accounts: { expense: XeroAccount[]; bank: XeroAccount[] } | null = null;
  let accountsError: string | null = null;
  if (connection && configured) {
    try {
      accounts = await listXeroAccounts(db);
    } catch (err) {
      accountsError = err instanceof Error ? err.message : "Could not load your Xero accounts.";
    }
  }

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost"}`;
  const shown = notice ? NOTICES[notice] : undefined;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-medium text-zinc-500">Xero</h2>
        <InfoTooltip text="Send each cleaner invoice to your Xero account as a bill from that cleaner, and record the payment in Xero when you mark the invoice paid here. You choose when each one is sent. No tax is added: bills go in as no tax, in your company's currency, which must already be switched on in Xero." />
      </div>

      {shown && (
        <p role="status" className={`rounded-lg px-3 py-2 text-sm ${shown.tone === "good" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
          {shown.text}
        </p>
      )}

      {!configured ? (
        <div className={card("flex flex-col gap-2 p-4 text-sm text-zinc-600")}>
          <p>Xero has not been set up on this server yet. Whoever runs the server needs to register Evo Stays at developer.xero.com, then add these settings and restart:</p>
          <ul className="list-disc pl-5">
            <li>
              <code>XERO_CLIENT_ID</code> and <code>XERO_CLIENT_SECRET</code>, from the Xero app
            </li>
            <li>
              The redirect address in Xero set to <code>{xeroRedirectUri(origin)}</code>
            </li>
          </ul>
        </div>
      ) : !connection ? (
        <div className={card("flex items-center justify-between gap-4 p-4")}>
          <p className="text-sm text-zinc-600">Not connected. You will sign in on Xero&apos;s own page, and can disconnect at any time.</p>
          <a href="/api/xero/connect" className={button("primary", "sm")}>
            Connect to Xero
          </a>
        </div>
      ) : (
        <div className={card("flex flex-col gap-4 p-4")}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm">
              Connected to <strong>{connection.tenantName}</strong>
            </p>
            <form action={disconnectXeroAction}>
              <button type="submit" className={button("secondary", "sm")}>
                Disconnect
              </button>
            </form>
          </div>

          {accountsError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{accountsError}</p>}

          {accounts && (
            <form action={saveXeroAccounts} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Code bills to</span>
                <select name="expenseAccountCode" defaultValue={connection.expenseAccountCode ?? ""} className={inputCompact}>
                  <option value="">Choose an account…</option>
                  {accounts.expense.map((a) => (
                    <option key={a.id} value={a.code ?? ""}>
                      {a.code} {a.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Pay from</span>
                <select name="bankAccountId" defaultValue={connection.bankAccountId ?? ""} className={inputCompact}>
                  <option value="">Choose a bank account…</option>
                  {accounts.bank.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <SubmitButton pendingLabel="Saving…">Save Xero accounts</SubmitButton>
              </div>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
