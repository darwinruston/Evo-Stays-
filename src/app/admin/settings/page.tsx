import { requireAdmin } from "@/lib/authz";
import { getOrgModules } from "@/lib/modules";
import { prisma } from "@/lib/prisma";
import { BUSINESS_TYPE_LABELS, MODULE_LABELS, type Modules } from "@/lib/onboarding";
import { SubmitButton } from "@/components/SubmitButton";
import { card } from "@/lib/ui";
import { updateModules } from "./actions";

export const metadata = { title: "Settings" };

const ORDER: (keyof Modules)[] = ["sync", "invoicing", "laundry", "stock"];

export default async function SettingsPage() {
  const { session } = await requireAdmin();
  const [modules, organization] = await Promise.all([
    getOrgModules(session.user.organizationId),
    prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: { name: true, businessType: true },
    }),
  ]);

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {organization?.name}
          {organization?.businessType ? ` · ${BUSINESS_TYPE_LABELS[organization.businessType]}` : ""}
        </p>
      </div>

      <form action={updateModules} className="flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-medium text-zinc-500">What you use Evo Stays for</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Switch off anything you don&apos;t need and it disappears from the menus, for you and
            your cleaners. Nothing already recorded is deleted, so turning it back on brings it all
            back.
          </p>
        </div>

        <ul className={card("divide-y divide-black/5 px-4")}>
          {ORDER.map((key) => (
            <li key={key}>
              <label className="flex cursor-pointer items-start justify-between gap-4 py-4">
                <span>
                  <span className="block text-sm font-medium">{MODULE_LABELS[key].name}</span>
                  <span className="block text-sm text-zinc-500">{MODULE_LABELS[key].on}</span>
                </span>
                <input
                  type="checkbox"
                  name={key}
                  aria-label={MODULE_LABELS[key].name}
                  defaultChecked={modules[key]}
                  className="mt-1 h-5 w-5 shrink-0 accent-zinc-900"
                />
              </label>
            </li>
          ))}
        </ul>

        <div>
          <SubmitButton pendingLabel="Saving…">Save settings</SubmitButton>
        </div>
      </form>
    </div>
  );
}
