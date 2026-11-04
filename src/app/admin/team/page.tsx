import Link from "next/link";
import { requireStaff } from "@/lib/authz";
import { getOrgModules } from "@/lib/modules";
import { weekBounds } from "@/lib/schedule";
import { SYSTEM_USER_ID_PREFIX } from "@/lib/systemUser";
import { Avatar } from "@/components/Avatar";
import { AddTeamMemberForm } from "@/components/AddTeamMemberForm";
import { StaffRow } from "@/components/StaffRow";
import { badge, card } from "@/lib/ui";
import { createTeamMember, updateStaff, deleteStaff } from "./actions";

export const metadata = { title: "Team" };

// Open to every staff login: Office staff need the cleaners here (pay rates,
// properties, days off) now that Cleaners no longer has a tab of its own. What
// only an Admin can do (add or change Admin and Office logins) is left off
// their view.
export default async function TeamPage() {
  const { session, db } = await requireStaff();
  const isAdmin = session.user.role === "ADMIN";
  const modules = await getOrgModules(session.user.organizationId);
  const { start, end } = weekBounds();

  const [staff, cleaners, thisWeekByCleaner, linen] = await Promise.all([
    db.user.findMany({
      where: { role: { in: ["ADMIN", "OFFICE"] }, NOT: { id: { startsWith: SYSTEM_USER_ID_PREFIX } } },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: { id: true, name: true, email: true, role: true },
    }),
    db.user.findMany({
      where: { role: "CLEANER" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, _count: { select: { assignedCleans: true } } },
    }),
    // One grouped query rather than a count per cleaner: the point of the
    // list is comparing workload at a glance.
    db.clean.groupBy({
      by: ["assignedToId"],
      where: { assignedToId: { not: null }, scheduledFor: { gte: start, lt: end }, status: { not: "CANCELLED" } },
      _count: { _all: true },
    }),
    modules.laundry
      ? db.user.findMany({
          where: { role: "LINEN" },
          orderBy: { name: "asc" },
          select: { id: true, name: true, email: true, laundryFacilityId: true, laundryFacility: { select: { name: true } } },
        })
      : [],
  ]);

  const thisWeek = new Map(thisWeekByCleaner.map((g) => [g.assignedToId as string, g._count._all]));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-500">
            Everyone who signs in to your company, and what they do. Each person has their own login, so{" "}
            <Link href="/admin/audit" className="underline underline-offset-2 hover:text-zinc-900">
              Activity
            </Link>{" "}
            shows who changed what.
          </p>
        </div>
        {/* Under the heading, not beside it: the form opens in place, at the
            left, instead of being pushed to the far edge of a header row. */}
        <div>
          <AddTeamMemberForm action={createTeamMember} cleanersOnly={!isAdmin} />
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-zinc-900">
          Admin and office <span className="text-sm font-normal text-zinc-500">({staff.length})</span>
        </h2>
        <p className="max-w-xl text-sm text-zinc-500">
          Admins can also manage the team and Settings. Office staff run the day-to-day but can&apos;t.
        </p>
        <ul className="flex max-w-2xl flex-col gap-2">
          {staff.map((s) =>
            isAdmin ? (
              <StaffRow
                key={s.id}
                name={s.name}
                email={s.email}
                role={s.role as "ADMIN" | "OFFICE"}
                isSelf={s.id === session.user.id}
                activityHref={`/admin/audit?actor=${s.id}`}
                updateAction={updateStaff.bind(null, s.id)}
                removeAction={deleteStaff.bind(null, s.id)}
              />
            ) : (
              <li key={s.id} className={card("flex items-center justify-between gap-3 p-4")}>
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium">
                    {s.name}
                    <span className={badge(s.role === "ADMIN" ? "solid" : "neutral")}>
                      {s.role === "ADMIN" ? "Admin" : "Office"}
                    </span>
                    {s.id === session.user.id && <span className="text-xs font-normal text-zinc-500">You</span>}
                  </p>
                  <p className="truncate text-sm text-zinc-500">{s.email}</p>
                </div>
              </li>
            ),
          )}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-zinc-900">
          Cleaners <span className="text-sm font-normal text-zinc-500">({cleaners.length})</span>
        </h2>
        <p className="max-w-xl text-sm text-zinc-500">
          They see only the properties they have cleans at. Open a cleaner to set their pay rate, properties and days
          off.
        </p>
        {cleaners.length === 0 ? (
          <p className="text-sm text-zinc-500">No cleaners yet. Add one with the button above.</p>
        ) : (
          <ul className="flex max-w-2xl flex-col gap-2">
            {cleaners.map((c) => {
              const week = thisWeek.get(c.id) ?? 0;
              return (
                <li key={c.id}>
                  <Link
                    href={`/admin/cleaners/${c.id}`}
                    className={card("flex items-center gap-3 p-4 transition-colors hover:bg-black/[0.02]")}
                  >
                    <Avatar name={c.name} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{c.name}</p>
                      <p className="truncate text-sm text-zinc-500">{c.email}</p>
                    </div>
                    <div className="shrink-0 text-right text-sm text-zinc-500">
                      <p>
                        {week} {week === 1 ? "clean" : "cleans"} this week
                      </p>
                      <p className="text-xs text-zinc-400">{c._count.assignedCleans} total</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {modules.laundry && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-zinc-900">
            Linen companies <span className="text-sm font-normal text-zinc-500">({linen.length})</span>
          </h2>
          <p className="max-w-xl text-sm text-zinc-500">
            They see only their own delivery schedule. A login is added from the linen company&apos;s own page.
          </p>
          {linen.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No linen company logins yet.{" "}
              <Link href="/admin/laundry-facilities" className="underline underline-offset-2 hover:text-zinc-900">
                Linen companies
              </Link>
            </p>
          ) : (
            <ul className="flex max-w-2xl flex-col gap-2">
              {linen.map((l) => (
                <li key={l.id}>
                  <Link
                    href={
                      l.laundryFacilityId ? `/admin/laundry-facilities/${l.laundryFacilityId}/edit` : "/admin/laundry-facilities"
                    }
                    className={card("flex items-center justify-between gap-3 p-4 transition-colors hover:bg-black/[0.02]")}
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{l.name}</p>
                      <p className="truncate text-sm text-zinc-500">{l.email}</p>
                    </div>
                    {l.laundryFacility && <span className="shrink-0 text-sm text-zinc-500">{l.laundryFacility.name}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
