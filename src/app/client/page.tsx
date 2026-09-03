import { requireClient } from "@/lib/authz";
import { card } from "@/lib/ui";

export const metadata = { title: "My portfolio" };

export default async function ClientHomePage() {
  const session = await requireClient();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My portfolio</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Signed in as {session.user.name} · {session.user.role}
        </p>
      </div>
      <div className={card("p-6")}>
        <p className="text-sm text-zinc-600">
          Your properties, their cleaning history and current stock levels land here in
          the next phases.
        </p>
      </div>
    </div>
  );
}
