import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { xeroAuthorizeUrl, xeroConfigured, xeroRedirectUri } from "@/lib/xero";

// Starts connecting a company to Xero: sends the signed-in admin to Xero's own
// sign-in page. The random "state" is kept in a cookie and checked when Xero
// sends them back (see the callback), so a link someone else crafted cannot
// attach their Xero account to this company.
export async function GET(req: NextRequest) {
  await requireAdmin();
  if (!xeroConfigured()) return NextResponse.redirect(new URL("/admin/settings?xero=notconfigured", req.url));

  const state = randomBytes(24).toString("hex");
  const res = NextResponse.redirect(xeroAuthorizeUrl(xeroRedirectUri(new URL(req.url).origin), state));
  res.cookies.set("xero_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: req.nextUrl.protocol === "https:",
    maxAge: 600,
    path: "/api/xero",
  });
  return res;
}
