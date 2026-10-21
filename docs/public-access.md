# Letting people in without Tailscale

The app runs on the home server and is reached over the tailnet. To let a few
outside testers in, we expose it with **Tailscale Funnel**. Funnel gives the
`evostays` node a public HTTPS address,
`https://evostays.<your-tailnet>.ts.net`. Visitors just open that link. They
don't install Tailscale, no router ports are opened, and the home IP address
stays hidden.

From then on, the login page is the only thing between the internet and the
data. So do the checklist below **before** turning Funnel on.

## 1. Before going public

- [ ] **Deploy this version of the app.** It adds the login protections
      described under "What the app does" below. The new database column is
      added automatically when the container starts (`prisma migrate deploy`).
- [ ] **Get rid of the demo logins.** A fresh database is seeded with
      `admin@`, `office@`, `cleaner@` and `cleaner2@evostays.test`, all with
      the password `password123`, which is published in this repo. Edit each one
      under Staff logins / Cleaners: give it a real email and a strong password,
      or remove it. A production server now refuses `password123` anyway, but
      don't rely on that.
- [ ] **Check `AUTH_SECRET`.** It must be a long random value that is not
      committed anywhere. If you're unsure, generate a new one with
      `openssl rand -base64 32`. Changing it signs everyone out, which is
      harmless.
- [ ] **Set `AUTH_URL` and `APP_URL`** to the public address,
      `https://evostays.<your-tailnet>.ts.net`. Sign-in redirects and the links
      in notification emails then point somewhere testers can actually reach.
- [ ] **Give each tester their own login.** Admins add them under Staff
      logins or Cleaners. Pick the lowest role that works: Cleaner sees only
      properties they have a clean at, Office can't manage logins, Admin can do
      everything. Don't share logins. Removing a person then cuts off only that
      person.
- [ ] **Decide what data testers should see.** Property access notes
      contain key safe and alarm codes. If testers shouldn't see real ones,
      give them Cleaner logins, which only see properties they're assigned
      to, or use dummy properties.

## 2. Turn Funnel on

Funnel has to be allowed for the node in the tailnet policy
(admin console → Access controls). Add a `nodeAttrs` entry for the tag the
`evostays` node uses:

```json
"nodeAttrs": [
  { "target": ["tag:evostays"], "attr": ["funnel"] }
]
```

Then switch it on. Which way depends on how Tailscale runs on the server.

**Tailscale sidecar container** (a `tailscale/tailscale` container with
`TS_SERVE_CONFIG`): add `AllowFunnel` to the serve config JSON and restart
the sidecar.

```json
{
  "TCP": { "443": { "HTTPS": true } },
  "Web": {
    "${TS_CERT_DOMAIN}:443": {
      "Handlers": { "/": { "Proxy": "http://127.0.0.1:3000" } }
    }
  },
  "AllowFunnel": { "${TS_CERT_DOMAIN}:443": true }
}
```

**Tailscale installed on the host**:

```bash
sudo tailscale funnel --bg 3000
```

Check it with `tailscale funnel status`, then open the URL on a phone with
mobile data so you're definitely off the tailnet. You should see the landing
page, and any other page should redirect to the login.

To take the app off the internet again, remove `AllowFunnel` (or run
`sudo tailscale funnel --bg 3000 off`). Tailnet access carries on as before.

## What the app does to protect itself

- **Login rate limiting.** After 5 failed attempts on one email, or 20 from
  one IP address, within 15 minutes, further attempts are refused until the
  window passes. Even the correct password is refused. A restart clears the
  counts.
- **Demo password refused** in production. To get back in if this locks you
  out, set `ALLOW_DEMO_PASSWORD=true`, log in, change the password, and
  remove the variable.
- **Sessions are re-checked on every request.** Removing a login, changing
  its role, or setting a new password takes effect immediately. Previously an
  existing session kept working for up to 30 days. Changing your own
  password signs you out too, so log in again with the new one.
- **Unknown emails take as long to reject as wrong passwords**, so the
  login page doesn't reveal who has an account.
- **Security headers** on every page: HSTS, no framing (clickjacking),
  `nosniff`, a strict referrer policy.
- **`/api/sync` refuses requests from the public URL.** Syncing is only
  triggered by the server's own scheduler or from inside the tailnet.
- Already in place: role checks on every admin and cleaner page and action,
  photos served only to signed-in users with permission for that property,
  and Hostify API keys encrypted at rest.

## Known limits

- Someone who knows a tester's email can lock that login out for 15 minutes
  by deliberately failing 5 times. That's the price of the per-email limit.
  At this scale it's an annoyance, not a breach.
- Funnel is meant for light traffic, with bandwidth caps set by Tailscale.
  Fine for a handful of testers.
- The address contains your tailnet name. If you'd rather have your own
  domain (for example `app.evostays.co.uk`), Cloudflare Tunnel is the next
  step up. It works the same way with no open ports, and adds Cloudflare's
  own rate limiting and bot filtering in front. The app already handles its
  headers.
- There's no two-factor login and no self-service password reset. An admin
  sets passwords. Both are worth adding before opening up beyond a small,
  known group.
