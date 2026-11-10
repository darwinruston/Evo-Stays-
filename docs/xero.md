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

Xero limits what an app that has not been through its app-certification process
can do (for example how many Xero organisations can connect). Check Xero's
current developer terms before offering this to many companies.

## Per company

An admin opens Settings > Xero, signs in on Xero's own page, then chooses:

- **Code bills to**: the expense account bills are filed under.
- **Pay from**: the bank account payments are recorded from.

## What is sent

- One bill per invoice, dated the last day of the invoice period, one line per
  visit. The supplier is the cleaner, created in Xero if it does not exist yet.
- Lines go in as "no tax", in the company's currency (which must already be
  switched on in Xero). No VAT or sales tax is worked out.
- Marking the invoice paid records a payment for the full amount on the chosen
  bank account. Marking it unpaid again deletes that payment, unless it has
  already been reconciled in Xero, in which case it has to be removed there.
- Once an invoice is in Xero its hours can no longer be changed here.
- If Xero refuses something, the reason is shown on the invoice with a button to
  try again.

Not done yet: tax, invoices that change after being sent, and reading anything
back from Xero.
