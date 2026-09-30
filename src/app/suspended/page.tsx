import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { EvoTick } from "@/components/EvoTick";
import { button, card } from "@/lib/ui";
import { logoutAction } from "../logout/actions";

export const metadata = { title: "Account suspended" };

// Landed on by requireStaff/requireAdmin/requireCleaner's redirectIfSuspended
// (see src/lib/authz.ts) -- a standalone route, not under /admin or
// /cleaner, since both of those layouts would just redirect straight back
// here. Doesn't re-check suspension itself: getting here at all already
// means it was true a moment ago, and there's nothing more to show either
// way -- just needs a real signed-in session so this can't be reached cold.
export default async function SuspendedPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-16 text-center">
      <EvoTick className="h-7 w-auto" />
      <div className={`${card("mt-8 max-w-md p-8")} flex flex-col items-center gap-3`}>
        <h1 className="text-xl font-semibold tracking-tight">Account suspended</h1>
        <p className="text-sm text-zinc-600">
          Access for your organization has been paused. Get in touch if you think this is a
          mistake, or to sort out reactivating it.
        </p>
        <form action={logoutAction} className="mt-2">
          <button type="submit" className={button("secondary", "sm")}>
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
