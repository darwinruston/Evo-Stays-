import { requireLinen } from "@/lib/authz";
import { getOrgModules } from "@/lib/modules";
import { loadLinenDay } from "@/lib/linenPlan";
import { parseIsoDate } from "@/lib/schedule";
import { LinenScheduleView } from "@/components/LinenScheduleView";

export const metadata = { title: "Delivery schedule" };

export default async function LinenPage({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  const { session, db, facilityId } = await requireLinen();
  const { day: dayParam } = await searchParams;

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

  const day = (dayParam ? parseIsoDate(dayParam) : null) ?? new Date();
  const data = await loadLinenDay(db, facilityId, day);
  if (!data) return <p className="text-sm text-zinc-600">This linen company no longer exists.</p>;

  return <LinenScheduleView data={data} mode="linen" hrefForDay={(iso) => `/linen?day=${iso}`} />;
}
