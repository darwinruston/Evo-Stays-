import { requireCleaner } from "@/lib/authz";
import { card } from "@/lib/ui";

export const metadata = { title: "My cleans" };

export default async function CleanerHomePage() {
  const session = await requireCleaner();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">My cleans</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Signed in as {session.user.name} · {session.user.role}
        </p>
      </div>
      <div className={card("p-5")}>
        <p className="text-sm text-zinc-600">
          Your schedule, check-in/check-out and stock counts land here in the next phases.
        </p>
      </div>
    </div>
  );
}
