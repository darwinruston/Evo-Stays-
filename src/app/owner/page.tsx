import { requirePlatformOwner } from "@/lib/authz";
import { prisma, scopedDb } from "@/lib/prisma";
import { formatDate } from "@/lib/schedule";
import { formatCurrency } from "@/lib/invoices";
import { badge, button, card, inputCompact } from "@/lib/ui";
import { SYSTEM_USER_ID_PREFIX } from "@/lib/systemUser";
import { createOrganization, updateOrganizationPlan } from "./actions";

export const metadata = { title: "Organizations" };

// The one screen that legitimately spans every tenant -- gated by
// requirePlatformOwner (via the /owner layout), not requireStaff, and reads
// the organization list itself through the unscoped `prisma` client on
// purpose (see UNSCOPED_MODELS in src/lib/prisma.ts): there's no single
// organization to scope a "every organization" list into.
//
// The per-organization counts below can't just be `include: { _count }` on
// that same unscoped query, though: User and Property both carry RLS, and
// the unscoped client sets no app.current_organization_id at all, so RLS's
// deny-by-default would silently count zero rows for every organization
// rather than the real numbers. Counted per organization instead, through a
// client freshly scoped to each one in turn -- the same mechanism every
// other cross-organization loop in this app already uses (see
// runAllSyncs.ts), just for a read here rather than a sync.
export default async function OrganizationsPage() {
  await requirePlatformOwner();

  const organizationRows = await prisma.organization.findMany({ orderBy: { createdAt: "asc" } });
  const organizations = await Promise.all(
    organizationRows.map(async (org) => {
      const db = scopedDb(org.id);
      // Excludes the org's own automated-sync account -- same "not a real
      // login" convention the Staff page already applies (see
      // src/app/admin/staff/page.tsx).
      const [users, properties] = await Promise.all([
        db.user.count({ where: { NOT: { id: { startsWith: SYSTEM_USER_ID_PREFIX } } } }),
        db.property.count(),
      ]);
      return { ...org, _count: { users, properties } };
    }),
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Organizations</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Every company on the platform, each with its own fully separate clients, properties,
          cleaners and data.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-zinc-500">All organizations ({organizations.length})</h2>
        {organizations.length === 0 ? (
          <p className="text-sm text-zinc-600">None yet — create the first one below.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {organizations.map((org) => (
              <li key={org.id} className={card("flex flex-col gap-3 p-4")}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{org.name}</p>
                    <p className="text-sm text-zinc-500">Created {formatDate(org.createdAt)}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <span className={badge("neutral")}>
                      {org._count.users} {org._count.users === 1 ? "login" : "logins"}
                    </span>
                    <span className={badge("neutral")}>
                      {org._count.properties} {org._count.properties === 1 ? "property" : "properties"}
                    </span>
                    <span className={badge(org.plan === "PAID" ? "solid" : "outline")}>
                      {org.plan === "PAID"
                        ? `Paid${org.monthlyPriceGBP !== null ? ` · ${formatCurrency(org.monthlyPriceGBP)}/mo` : ""}`
                        : "Trial"}
                    </span>
                  </div>
                </div>

                <form
                  action={updateOrganizationPlan.bind(null, org.id)}
                  className="flex flex-wrap items-end gap-3 border-t border-black/5 pt-3"
                >
                  <div className="flex flex-col gap-1">
                    <label htmlFor={`plan-${org.id}`} className="text-xs text-zinc-500">
                      Plan
                    </label>
                    <select
                      id={`plan-${org.id}`}
                      name="plan"
                      defaultValue={org.plan}
                      className={`${inputCompact} w-28`}
                    >
                      <option value="TRIAL">Trial</option>
                      <option value="PAID">Paid</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor={`price-${org.id}`} className="text-xs text-zinc-500">
                      Monthly price (£)
                    </label>
                    <input
                      id={`price-${org.id}`}
                      name="monthlyPriceGBP"
                      type="number"
                      min={0}
                      step="0.01"
                      defaultValue={org.monthlyPriceGBP ?? ""}
                      placeholder="e.g. 49.00"
                      className={`${inputCompact} w-32`}
                    />
                  </div>
                  <button type="submit" className={button("secondary", "sm")}>
                    Save
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3 border-t border-black/5 pt-6">
        <h2 className="text-lg font-semibold text-zinc-900">New organization</h2>
        <p className="text-sm text-zinc-600">
          Creates the company and its first admin login together — that admin can then add their
          own staff, clients and properties from here on.
        </p>
        <form action={createOrganization} className="flex max-w-lg flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="orgName" className="text-sm font-medium">
              Organization name
            </label>
            <input id="orgName" name="orgName" required placeholder="e.g. Coastal Lets Ltd" className={inputCompact} />
          </div>

          <div className="flex flex-col gap-1.5 border-t border-black/5 pt-4">
            <p className="text-sm font-medium">First admin login</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="adminName" className="text-sm font-medium">
              Name
            </label>
            <input id="adminName" name="adminName" required className={inputCompact} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="adminEmail" className="text-sm font-medium">
              Email
            </label>
            <input id="adminEmail" name="adminEmail" type="email" required className={inputCompact} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="adminPassword" className="text-sm font-medium">
              Initial password
            </label>
            <input
              id="adminPassword"
              name="adminPassword"
              type="password"
              required
              minLength={8}
              className={inputCompact}
            />
            <p className="text-xs text-zinc-500">At least 8 characters.</p>
          </div>

          <div>
            <button type="submit" className={button("primary", "sm")}>
              Create organization
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
