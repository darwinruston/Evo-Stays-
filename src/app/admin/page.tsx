import { requireStaff } from "@/lib/authz";
import { card } from "@/lib/ui";

export const metadata = { title: "Overview" };

export default async function AdminHomePage() {
  const session = await requireStaff();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Signed in as {session.user.name} · {session.user.role}
        </p>
      </div>
      <div className={card("p-6")}>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Clients, properties, cleans, cleaners and the stock catalogue land here in the
          next phases.
        </p>
      </div>
    </div>
  );
}
