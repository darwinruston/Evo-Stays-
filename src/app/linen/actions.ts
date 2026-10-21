"use server";

import { revalidatePath } from "next/cache";
import { requireLinen } from "@/lib/authz";
import { assertModule } from "@/lib/modules";
import { logAudit } from "@/lib/audit";
import { notify, staffUserIds } from "@/lib/notify";
import { loadLinenDay, formatClock } from "@/lib/linenPlan";
import { parseIsoDate } from "@/lib/schedule";
import type { ActionResult } from "@/lib/actionResult";

const NOTE_MAX = 500;

// Every action here works from the stop as the schedule itself builds it for
// THIS company and day, and refuses anything that isn't in it. The page
// rendering a button isn't the check: an action can be posted to directly.
async function ownStop(cleanId: string, dayIso: string) {
  const { session, db, facilityId } = await requireLinen();
  await assertModule(session.user.organizationId, "laundry");
  if (!facilityId) throw new Error("This login isn't linked to a linen company.");

  const day = parseIsoDate(dayIso);
  if (!day) throw new Error("That day isn't valid.");
  const data = await loadLinenDay(db, facilityId, day);
  const stop = data?.plan.stops.find((s) => s.cleanId === cleanId);
  if (!data || !stop) throw new Error("That visit isn't on your schedule.");
  return { session, db, facilityId, day, data, stop };
}

function revalidate(facilityId: string) {
  revalidatePath("/linen");
  revalidatePath("/admin/laundry/schedule");
  revalidatePath("/admin/laundry");
  void facilityId;
}

// The linen company picking the exact time it'll arrive, within its window.
// "HH:MM" on the day being planned.
export async function setLinenArrival(cleanId: string, dayIso: string, formData: FormData): Promise<ActionResult> {
  const { session, db, facilityId, day, stop } = await ownStop(cleanId, dayIso);

  const raw = formData.get("arrivalTime");
  const match = typeof raw === "string" ? /^([01]\d|2[0-3]):([0-5]\d)$/.exec(raw.trim()) : null;
  if (!match) return { error: "Enter the time you'll arrive." };

  const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), Number(match[1]), Number(match[2]));
  if (at < stop.windowStart || at > stop.windowEnd) {
    return {
      error:
        stop.windowStart.getTime() === stop.windowEnd.getTime()
          ? `The only time that works here is ${formatClock(stop.windowStart)}.`
          : `Choose a time between ${formatClock(stop.windowStart)} and ${formatClock(stop.windowEnd)}.`,
    };
  }

  await db.linenVisit.upsert({
    where: { cleanId },
    create: { organizationId: session.user.organizationId, cleanId, chosenArrivalAt: at },
    update: { chosenArrivalAt: at },
  });
  await logAudit(db, {
    actorId: session.user.id,
    entityType: "Clean",
    entityId: cleanId,
    summary: `Linen company chose to arrive at ${formatClock(at)} (${stop.name})`,
  });

  revalidate(facilityId);
}

// Back to the suggested time.
export async function clearLinenArrival(cleanId: string, dayIso: string): Promise<ActionResult> {
  const { session, db, facilityId, stop } = await ownStop(cleanId, dayIso);

  await db.linenVisit.updateMany({ where: { cleanId }, data: { chosenArrivalAt: null } });
  await logAudit(db, {
    actorId: session.user.id,
    entityType: "Clean",
    entityId: cleanId,
    summary: `Linen company went back to the suggested arrival time (${stop.name})`,
  });

  revalidate(facilityId);
}

// A problem the office needs to pick up: can't make this one, the van's off
// the road, no access, and so on. Staff are notified and it stays flagged
// on the schedule until one of them resolves it.
export async function flagLinenIssue(cleanId: string, dayIso: string, formData: FormData): Promise<ActionResult> {
  const { session, db, facilityId, data, stop } = await ownStop(cleanId, dayIso);

  const note = typeof formData.get("note") === "string" ? (formData.get("note") as string).trim() : "";
  if (note.length < 3) return { error: "Say what the problem is." };
  if (note.length > NOTE_MAX) return { error: `Keep it under ${NOTE_MAX} characters.` };

  await db.linenVisit.upsert({
    where: { cleanId },
    create: {
      organizationId: session.user.organizationId,
      cleanId,
      issueNote: note,
      issueRaisedAt: new Date(),
    },
    update: { issueNote: note, issueRaisedAt: new Date(), issueResolvedAt: null, resolutionNote: null },
  });
  await logAudit(db, {
    actorId: session.user.id,
    entityType: "Clean",
    entityId: cleanId,
    summary: `Linen company flagged a problem (${stop.name}): ${note}`,
  });

  const staffIds = await staffUserIds(db);
  await notify(
    db,
    staffIds.map((userId) => ({
      userId,
      kind: "LINEN_ISSUE" as const,
      title: `Linen problem: ${stop.name}`,
      body: `${data.facility.name}: ${note}`,
      href: `/admin/laundry/schedule?facilityId=${facilityId}&day=${dayIso}`,
    })),
  );

  revalidate(facilityId);
}
