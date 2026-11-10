# Connecting Xero

Evo Stays can send each cleaner invoice to a company's own Xero account as a
bill from that cleaner, and record the payment in Xero when the invoice is
marked paid here. The company chooses when each invoice is sent.

## One-off setup, by whoever runs the server

1. In [developer.xero.com](https://developer.xero.com), create an app of type
   "Web app".
2. Set its redirect address to `<your address>/api/xero/callback`, for example
   `https://ops.example.com/api/xero/callback`. Settings > Xero shows the exact
   address to use while Xero is not set up yet. Set `APP_URL` to the public
   address of the server so it is the same every time.
3. Add the app's key and secret to the server's `.env` and restart:

   ```
   XERO_CLIENT_ID=...
   XERO_CLIENT_SECRET=...
   ```

The app asks for these permissions: `offline_access`, `accounting.invoices`,
`accounting.payments`, `accounting.contacts` and `accounting.settings.read`.

A new app on Xero's free tier can connect up to 5 Xero organisations; beyond
that Xero asks for one of its paid plans (Manage Plan in the developer portal).
Check Xero's current terms before offering this to many companies.

The redirect address must be exact. `http://localhost:3100/api/xero/callback`
works for testing on one computer; add the live server's https address as a
second redirect when it is set up. The "Company or application URL" in the app's
details must be a public https address.

Test against Xero's **Demo Company** (switch to it from the organisation menu in
Xero), not real books. In the consent screen pick it from the organisation list.

## Per company

An admin opens Settings > Xero, signs in on Xero's own page, then chooses:

- **Code bills to**: the expense account bills are filed under.
- **Pay from**: the bank account payments are recorded from.

## What is sent

- One bill per invoice, dated the last day of the invoice period, one line per
  visit. The supplier is the cleaner, created in Xero if it does not exist yet.
- Lines go in as "no tax" (`TaxType: NONE` on every line, otherwise Xero adds
  the expense account's usual VAT and the bill comes out higher), in the
  company's currency (which must already be switched on in Xero). No VAT or sales
  tax is worked out.
- Bills are due 14 days after the period ends (Xero requires a due date).
- Marking the invoice paid records a payment for the full amount on the chosen
  bank account. Marking it unpaid again deletes that payment, unless it has
  already been reconciled in Xero, in which case it has to be removed there.
- Once an invoice is in Xero its hours can no longer be changed here.
- If Xero refuses something, the reason is shown on the invoice with a button to
  try again.

Xero treats a bill number it already knows as "edit that bill", so each invoice
gets its own number (`EVO-` plus the end of its id). Do not reuse an id.

Tested for real against the Demo Company: connect, choose accounts, send a bill,
record the payment, reverse it, record it again.

Not done yet: tax, invoices that change after being sent, and reading anything
back from Xero.
