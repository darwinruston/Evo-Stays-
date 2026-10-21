import { requireLinen } from "@/lib/authz";
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
  const days = await loadLinenDays(db, facilityId, from);

  return (
    <LinenScheduleView
      days={days}
      facilityName={facility.name}
      from={from}
      mode="linen"
      hrefForFrom={(iso) => `/linen?from=${iso}`}
    />
  );
}
