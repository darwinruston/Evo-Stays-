import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { runAllSyncs } from "@/lib/runAllSyncs";

function isAuthorized(request: NextRequest, expected: string): boolean {
  const auth = request.headers.get("authorization");
  const provided = auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length) : null;
  if (!provided) return false;

  // Constant-time compare so a wrong guess can't be narrowed down from
  // response timing -- cheap to do properly for an auth check.
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Manual/external trigger for the same sync the in-process scheduler
// (src/lib/syncScheduler.ts) already runs on a timer -- useful for testing,
// an immediate re-sync without waiting for the interval, or an external
// cron/host crontab if the in-process scheduler is ever turned off. Not
// required for day-to-day automation, which the scheduler already handles.
// No staff session exists here, so this is protected by a bearer secret
// instead of requireStaff().
export async function POST(request: NextRequest) {
  const expected = process.env.SYNC_API_KEY;
  if (!expected) {
    return NextResponse.json({ error: "SYNC_API_KEY is not configured" }, { status: 500 });
  }

  if (!isAuthorized(request, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runAllSyncs();
  return NextResponse.json({ success: true, ...result });
}
