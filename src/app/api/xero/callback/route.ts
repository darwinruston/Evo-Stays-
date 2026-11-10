import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { exchangeCode, xeroRedirectUri } from "@/lib/xero";

function same(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

// Where Xero sends the admin back after they approve (or refuse) the
// connection. Only trusted if the state matches the one set when they left.
export async function GET(req: NextRequest) {
  const { session, db } = await requireAdmin();
  const back = (result: string) => {
    const res = NextResponse.redirect(new URL(`/admin/settings?xero=${result}`, req.url));
    res.cookies.delete({ name: "xero_state", path: "/api/xero" });
    return res;
  };

  const params = req.nextUrl.searchParams;
  const expected = req.cookies.get("xero_state")?.value;
  const state = params.get("state");
  const code = params.get("code");
  if (params.get("error")) return back("declined");
  if (!expected || !state || !same(expected, state) || !code) return back("failed");

  try {
    const link = await exchangeCode(code, xeroRedirectUri(new URL(req.url).origin));
    await db.xeroConnection.upsert({
      where: { organizationId: session.user.organizationId },
      // A different Xero organisation than before means the old account
      // choices no longer mean anything.
      update: { ...link, expenseAccountCode: null, bankAccountId: null },
      create: { organizationId: session.user.organizationId, ...link },
    });
    await logAudit(db, {
      actorId: session.user.id,
      entityType: "Staff",
      entityId: session.user.id,
      summary: `Connected Xero (${link.tenantName})`,
    });
    return back("connected");
  } catch {
    return back("failed");
  }
}
