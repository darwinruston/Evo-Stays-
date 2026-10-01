import { requirePlatformOwner } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/schedule";
import { card } from "@/lib/ui";
import { deleteInterestRegistration } from "../actions";

export const metadata = { title: "Registered interest" };

// Every lead from the public "Register interest" page (src/app/signup/),
// newest first -- the owner's own list spanning everyone, not a single
// tenant's data. Reads through the unscoped `prisma` client on purpose
// (see UNSCOPED_MODELS in src/lib/prisma.ts): InterestRegistration carries
// no organizationId to scope by.
export default async function InterestPage() {
  await requirePlatformOwner();

  const registrations = await prisma.interestRegistration.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Registered interest</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Everyone who&apos;s asked for a demo from the public site, before any real account exists
          for them.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-zinc-500">
          {registrations.length} {registrations.length === 1 ? "registration" : "registrations"}
        </h2>
        {registrations.length === 0 ? (
          <p className="text-sm text-zinc-600">No one yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {registrations.map((reg) => (
              <li key={reg.id} className={card("flex flex-col gap-2 p-4")}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{reg.companyName}</p>
                    <p className="text-sm text-zinc-600">
                      {reg.name} ·{" "}
                      <a href={`mailto:${reg.email}`} className="underline underline-offset-2">
                        {reg.email}
                      </a>
                    </p>
                    <p className="text-xs text-zinc-500">Registered {formatDate(reg.createdAt)}</p>
                  </div>
                  <form action={deleteInterestRegistration.bind(null, reg.id)}>
                    <button type="submit" className="text-xs text-red-600 hover:underline">
                      Remove
                    </button>
                  </form>
                </div>
                {reg.notes && <p className="border-t border-black/5 pt-2 text-sm text-zinc-600">{reg.notes}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
