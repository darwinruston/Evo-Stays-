import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/authz";
import { updateLaundryFacility, deleteLaundryFacility, createLinenLogin, removeLinenLogin } from "../../actions";
import { AddLinenLoginForm } from "@/components/AddLinenLoginForm";
import { button, card, inputCompact } from "@/lib/ui";

export const metadata = { title: "Edit laundry company" };

function clock(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export default async function EditLaundryFacilityPage({ params }: { params: Promise<{ id: string }> }) {
  const { session, db } = await requireStaff();
  const { id } = await params;

  const facility = await db.laundryFacility.findUnique({
    where: { id },
    include: { _count: { select: { loads: true, properties: true } } },
  });
  if (!facility) notFound();

  const logins = await db.user.findMany({
    where: { role: "LINEN", laundryFacilityId: id },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true },
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/admin/laundry-facilities" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Laundry companies
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Edit laundry company</h1>
      </div>

      <form action={updateLaundryFacility.bind(null, facility.id)} className="flex max-w-lg flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-medium">
            Name
          </label>
          <input id="name" name="name" required defaultValue={facility.name} className={inputCompact} />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={facility.active} />
          Active: offered when logging a new laundry drop-off
        </label>

        <div className="mt-2 flex flex-col gap-4 border-t border-black/5 pt-5">
          <div>
            <h2 className="text-sm font-medium text-zinc-500">Delivery schedule</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Used to work out when their van needs to be at each property so the linen is there before the
              cleaner. The schedule is at{" "}
              <Link href="/admin/laundry/schedule" className="underline underline-offset-2">
                Laundry &gt; Delivery schedule
              </Link>
              .
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="depotAddress" className="text-sm font-medium">
              Where the van starts from
            </label>
            <input
              id="depotAddress"
              name="depotAddress"
              defaultValue={facility.depotAddress ?? ""}
              placeholder="Address with a postcode"
              className={inputCompact}
            />
            <p className="text-xs text-zinc-500">
              Needs a UK postcode, which is how it&apos;s found on the map.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="dayStart" className="text-sm font-medium">
                Van leaves no earlier than
              </label>
              <input
                id="dayStart"
                name="dayStart"
                type="time"
                defaultValue={clock(facility.dayStartMinutes)}
                className={inputCompact}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="dropBufferMinutes" className="text-sm font-medium">
                Linen there before cleaner (min)
              </label>
              <input
                id="dropBufferMinutes"
                name="dropBufferMinutes"
                type="number"
                min={0}
                max={240}
                defaultValue={facility.dropBufferMinutes}
                className={inputCompact}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="stopMinutes" className="text-sm font-medium">
                Time at each property (min)
              </label>
              <input
                id="stopMinutes"
                name="stopMinutes"
                type="number"
                min={1}
                max={120}
                defaultValue={facility.stopMinutes}
                className={inputCompact}
              />
            </div>
          </div>
        </div>

        <div>
          <button type="submit" className={button("primary", "sm")}>
            Save changes
          </button>
        </div>
      </form>

      <section className="flex max-w-lg flex-col gap-3 border-t border-black/5 pt-6">
        <div>
          <h2 className="text-sm font-medium text-zinc-500">Their login</h2>
          <p className="mt-1 text-sm text-zinc-600">
            A login for {facility.name} lets them see their own delivery schedule, with the time to be at each
            property and when each cleaner arrives. They see nothing else. It covers the{" "}
            {facility._count.properties} {facility._count.properties === 1 ? "property" : "properties"} set to
            use them (choose this on a property&apos;s edit page).
          </p>
        </div>

        {logins.length > 0 && (
          <ul className="flex flex-col gap-2">
            {logins.map((login) => (
              <li key={login.id} className={card("flex items-center justify-between gap-3 p-3")}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{login.name}</p>
                  <p className="truncate text-xs text-zinc-500">{login.email}</p>
                </div>
                {session.user.role === "ADMIN" && (
                  <form action={removeLinenLogin.bind(null, login.id, facility.id)}>
                    <button type="submit" className="text-xs text-red-600 hover:underline">
                      Remove
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}

        {session.user.role === "ADMIN" ? (
          <AddLinenLoginForm action={createLinenLogin.bind(null, facility.id)} />
        ) : (
          <p className="text-sm text-zinc-500">Only an admin can add a login.</p>
        )}
      </section>

      <section className="flex flex-col items-start gap-2 border-t border-black/5 pt-6">
        <h2 className="text-sm font-medium text-zinc-500">Delete</h2>
        {facility._count.loads > 0 ? (
          <p className="text-sm text-zinc-600">
            This facility has {facility._count.loads} {facility._count.loads === 1 ? "load" : "loads"}{" "}
            logged against it, so it can&apos;t be deleted. Turn off &quot;Active&quot; above instead.
          </p>
        ) : (
          <>
            <p className="text-sm text-zinc-600">Not used by any load yet. This cannot be undone.</p>
            <form action={deleteLaundryFacility.bind(null, facility.id)}>
              <button type="submit" className={button("danger", "sm")}>
                Delete facility
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
