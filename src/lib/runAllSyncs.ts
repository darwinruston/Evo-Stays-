import { prisma } from "@/lib/prisma";
import { syncCalendarFeed } from "@/lib/icalSync";
import { syncHostifyListing } from "@/lib/hostifySync";
import { ensureSystemSyncUser } from "@/lib/systemUser";

// Shared by the in-process scheduler (src/lib/syncScheduler.ts) and the
// externally-triggerable POST /api/sync route -- every iCal feed and every
// Hostify-linked property, one after another. Sequential rather than
// concurrent: both sync functions never throw (a bad feed/listing just
// records its own error and the loop moves on), and at the property counts
// this app runs at, sequential stays trivially inside Hostify's 1000
// req/min rate limit without needing to think about it.
export async function runAllSyncs(): Promise<{ feedsSynced: number; listingsSynced: number }> {
  const systemUserId = await ensureSystemSyncUser();

  const feeds = await prisma.propertyCalendarFeed.findMany({ select: { id: true } });
  for (const feed of feeds) {
    await syncCalendarFeed(feed.id, systemUserId);
  }

  const properties = await prisma.property.findMany({
    where: { hostifyListingId: { not: null } },
    select: { id: true },
  });
  for (const property of properties) {
    await syncHostifyListing(property.id, systemUserId);
  }

  return { feedsSynced: feeds.length, listingsSynced: properties.length };
}
