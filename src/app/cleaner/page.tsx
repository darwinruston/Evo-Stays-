import { prisma } from "@/lib/prisma";
import { requireCleaner } from "@/lib/authz";
import { propertyDisplayName } from "@/lib/address";
import { CleanList, type CleanRow } from "@/components/CleanList";
import { isCleanFinished } from "@/lib/cleans";
import { cleanPrep } from "@/lib/cleanPrep";

export const metadata = { title: "My cleans" };

export default async function CleanerHomePage() {
  const session = await requireCleaner();

  const cleaner = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { scheduleHorizonDays: true },
  });
  // Only ever bounds how far ahead this shows -- never the past, so overdue
  // and completed work is unaffected regardless of this setting.
  const horizonCutoff =
    cleaner.scheduleHorizonDays !== null
      ? new Date(new Date().getTime() + cleaner.scheduleHorizonDays * 24 * 60 * 60 * 1000)
      : null;

  const cleans = await prisma.clean.findMany({
    where: {
      // Only ever this cleaner's own work -- never anyone else's.
      assignedToId: session.user.id,
      ...(horizonCutoff
        ? { OR: [{ scheduledFor: null }, { scheduledFor: { lte: horizonCutoff } }] }
        : {}),
    },
    orderBy: [{ scheduledFor: "asc" }, { createdAt: "asc" }],
    include: {
      property: {
        select: { name: true, address: true, bedrooms: true, bathrooms: true, maxOccupancy: true, sofaBedSleeps: true },
      },
    },
  });

  const rows: CleanRow[] = cleans.map((c) => ({
    id: c.id,
    href: `/cleaner/cleans/${c.id}`,
    title: propertyDisplayName(c.property),
    status: c.status,
    scheduledFor: c.scheduledFor,
    prep: isCleanFinished(c.status) ? null : cleanPrep(c.property, c.guestCount),
  }));

  // Only worth a query when a horizon is actually set -- tells the cleaner
  // work exists past their own cutoff, rather than the list just quietly
  // ending and looking complete when it isn't.
  const hiddenCount = horizonCutoff
    ? await prisma.clean.count({
        where: { assignedToId: session.user.id, scheduledFor: { gt: horizonCutoff } },
      })
    : 0;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold tracking-tight">My cleans</h1>
      <CleanList cleans={rows} empty="Nothing assigned to you yet." />
      {hiddenCount > 0 && (
        <p className="text-sm text-zinc-500">
          {hiddenCount} more {hiddenCount === 1 ? "clean is" : "cleans are"} scheduled further out
          than your {cleaner.scheduleHorizonDays}-day view.
        </p>
      )}
    </div>
  );
}
