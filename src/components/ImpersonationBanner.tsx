import { button } from "@/lib/ui";
import { stopImpersonating } from "@/app/impersonation/actions";

// Shown across the top of /admin only while the platform owner is viewing
// as this organization's admin (see impersonateOrganization in
// src/app/impersonation/actions.ts) -- so it's never ambiguous whose
// session this actually is, for the owner looking at it or for anyone who
// walks past their screen.
export function ImpersonationBanner({ organizationName }: { organizationName: string }) {
  return (
    <div className="flex items-center justify-between gap-3 bg-zinc-900 px-4 py-2 text-sm text-white sm:px-6 lg:px-10">
      <p>
        Viewing as <span className="font-medium">{organizationName}</span> — this isn&apos;t your own
        account.
      </p>
      <form action={stopImpersonating}>
        <button type="submit" className={`${button("ghost", "sm")} text-white hover:bg-white/10`}>
          Return to Organizations
        </button>
      </form>
    </div>
  );
}
