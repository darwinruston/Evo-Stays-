# Installable app and push notifications

Evo Stays can be added to a phone's home screen (it opens full screen like an
app) and can send push alerts: a notification on the lock screen when a clean
is assigned, moved or cancelled, when a linen delivery changes, and so on.
There is no app store and nothing to build: it is the same website.

## What has to be in place

**1. Push keys (once per server).** Alerts are signed with a pair of keys. Make
a pair with:

```bash
npx web-push generate-vapid-keys
```

and set them as environment variables on the server (and in `.env` locally):

```
VAPID_PUBLIC_KEY="..."
VAPID_PRIVATE_KEY="..."
```

Keep the private key secret, and do not change the pair later: every phone that
has turned alerts on is tied to the public key, and would have to turn them on
again. Optionally set `VAPID_SUBJECT` (a `mailto:` or `https:` contact for the
push services); it defaults to `APP_URL`.

With the keys unset, nothing breaks: alerts simply stay in the app (and email).

**2. HTTPS.** Browsers only allow the home-screen install and push on a secure
address. `http://localhost` counts, so it works on the machine running the
app, but a phone reaching a PC over plain `http://192.168...` will not get the
install prompt or alerts. Use an HTTPS address, such as the public address the
app is deployed at, or a private HTTPS link made with Tailscale
(`tailscale serve`).

**3. Database.** Devices that have turned alerts on are kept in the
`PushSubscription` table (migration `20261025100000_push_subscription`).

## How people turn it on

- **Android (Chrome):** a card at the top of the cleaner and linen screens
  offers "Add to home screen" and "Turn on alerts". Alerts can also be switched
  on, off and tested from the Alerts page.
- **iPhone (iOS 16.4 or later):** Safari must first add the app to the home
  screen (Share, then Add to Home Screen) and it must be opened from that icon.
  Only then will iOS allow alerts. The card explains this.
- Each phone or browser is switched on separately and can be switched off from
  the Alerts page.

## What is and is not covered

- Every notification the app already creates (see `src/lib/notify.ts`) is also
  sent as a push to the person's devices, and tapping it opens the right page
  and marks it read.
- The service worker (`public/sw.js`) shows alerts and, with no connection,
  shows a plain "you're offline" page. It deliberately does not store the app's
  own pages or data, so nobody is ever shown a stale schedule.
- A thin banner appears at the top while the phone has no connection.
- It does not queue photo uploads or form submissions taken while offline.
  That would be a separate piece of work.

## Checking it works

The Alerts page has a "Send a test" button for the device you are on.
