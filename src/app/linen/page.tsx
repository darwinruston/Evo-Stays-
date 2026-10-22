import Link from "next/link";
import { requireLinen } from "@/lib/authz";
import { unreadNotificationCount } from "@/lib/notificationViews";
import { card } from "@/lib/ui";
import { getOrgModules } from "@/lib/modules";
import { loadLinenDays } from "@/lib/linenPlan";
import { parseIsoDate } from "@/lib/schedule";
import { LinenScheduleView } from "@/components/LinenScheduleView";

export const metadata = { title: "Delivery schedule" };

export default async function LinenPage({ searchParams }: { searchParams: Promise<{ from?: string; day?: string }> }) {
  const { session, db, facilityId } = await requireLinen();
  const { from: fromParam, day: dayParam } = await searchParams;

  if (!(await getOrgModules(session.user.organizationId)).laundry) {
    return <p className="text-sm text-zinc-600">Linen deliveries aren&apos;t switched on for this company.</p>;
  }
  if (!facilityId) {
    return (
      <p className="text-sm text-zinc-600">
        This login isn&apos;t linked to a linen company yet. Ask the company that set it up to link it.
      </p>
    );
  }

  const facility = await db.laundryFacility.findUnique({ where: { id: facilityId }, select: { name: true } });
  if (!facility) return <p className="text-sm text-zinc-600">This linen company no longer exists.</p>;

  // `day` is accepted too, since older links used it.
  const from = (fromParam ? parseIsoDate(fromParam) : dayParam ? parseIsoDate(dayParam) : null) ?? new Date();
  const [days, unread] = await Promise.all([
    loadLinenDays(db, facilityId, from),
    unreadNotificationCount(db, session.user.id),
  ]);

  return (
    <div className="flex flex-col gap-5">
      {unread > 0 && (
        <Link
          href="/linen/notifications"
          className={card("flex items-center justify-between gap-3 p-4 text-sm transition-colors hover:bg-black/[0.02]")}
        >
          <span className="font-medium">
            {unread} schedule {unread === 1 ? "change" : "changes"} to look at
          </span>
          <span className="text-zinc-500">View →</span>
        </Link>
      )}
      <LinenScheduleView
        days={days}
        facilityName={facility.name}
        from={from}
        mode="linen"
        hrefForFrom={(iso) => `/linen?from=${iso}`}
      />
    </div>
  );
}
