import { prisma, scopedDb } from "@/lib/prisma";
import { syncCalendarFeed } from "@/lib/icalSync";
import { syncHostifyListing } from "@/lib/hostifySync";
import { ensureSystemSyncUser } from "@/lib/systemUser";

// Shared by the in-process scheduler (src/lib/syncScheduler.ts) and the
// externally-triggerable POST /api/sync route -- every organization, and
// within each, every iCal feed and every Hostify-linked property, one after
// another. The outer loop over Organization is the one place this uses the
// raw, unscoped `prisma` -- there's no organization to scope into yet until
// it's picked one. Everything inside the loop runs against that
// organization's own scoped `db`, exactly like a request would.
//
// Sequential rather than concurrent: both sync functions never throw (a bad
// feed/listing just records its own error and the loop moves on), and at the
// property counts this app runs at, sequential stays trivially inside
// Hostify's 1000 req/min rate limit without needing to think about it.
export async function runAllSyncs(): Promise<{ feedsSynced: number; listingsSynced: number }> {
  const organizations = await prisma.organization.findMany({ select: { id: true } });

  let feedsSynced = 0;
  let listingsSynced = 0;

  for (const org of organizations) {
    const db = scopedDb(org.id);
    const systemUserId = await ensureSystemSyncUser(db, org.id);

    const feeds = await db.propertyCalendarFeed.findMany({ select: { id: true } });
    for (const feed of feeds) {
      await syncCalendarFeed(db, feed.id, systemUserId);
    }
    feedsSynced += feeds.length;

    const properties = await db.property.findMany({
      where: { hostifyListingId: { not: null } },
      select: { id: true },
    });
    for (const property of properties) {
      await syncHostifyListing(db, property.id, systemUserId);
    }
    listingsSynced += properties.length;
  }

  return { feedsSynced, listingsSynced };
}
