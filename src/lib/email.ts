import nodemailer, { type Transporter } from "nodemailer";

// Plain SMTP rather than a specific provider's SDK -- any of them (Postmark,
// SES, Mailgun, a Google Workspace relay...) speaks SMTP, so switching
// providers is an env change, not a code change. Entirely optional: with
// SMTP_HOST unset, emailConfigured() is false and notifications stay
// in-app only (see src/lib/notify.ts), which is exactly how local dev runs.
//
//   SMTP_HOST, SMTP_PORT (default 587), SMTP_USER, SMTP_PASS,
//   SMTP_FROM (e.g. "Evo Stays <ops@example.com>"),
//   APP_URL (e.g. "https://ops.example.com") -- to turn a notification's
//   in-app path into a link that works from an inbox.
let transporter: Transporter | null = null;

export function emailConfigured(): boolean {
  return !!process.env.SMTP_HOST && !!process.env.SMTP_FROM;
}

function getTransporter(): Transporter {
  if (!transporter) {
    const port = Number.parseInt(process.env.SMTP_PORT ?? "", 10) || 587;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      // 465 is implicit TLS; everything else (587, 25) upgrades via STARTTLS.
      secure: port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

// An in-app path ("/cleaner/cleans/abc") as an absolute URL for an email
// body. Null when APP_URL isn't set -- better no link than a relative one
// that goes nowhere from a mail client.
export function absoluteUrl(path: string): string | null {
  const base = process.env.APP_URL?.replace(/\/+$/, "");
  return base ? `${base}${path}` : null;
}

export async function sendEmail(input: { to: string; subject: string; text: string }): Promise<void> {
  if (!emailConfigured()) return;
  await getTransporter().sendMail({ from: process.env.SMTP_FROM, ...input });
}
