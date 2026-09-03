import Link from "next/link";
import { requireStaff } from "@/lib/authz";
import { createCleaner } from "../actions";
import { button, inputCompact } from "@/lib/ui";

export const metadata = { title: "New cleaner" };

export default async function NewCleanerPage() {
  await requireStaff();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/cleaners" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Cleaners
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">New cleaner</h1>
      </div>

      <form action={createCleaner} className="flex max-w-lg flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-medium">
            Name
          </label>
          <input id="name" name="name" required className={inputCompact} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input id="email" name="email" type="email" required className={inputCompact} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-medium">
            Initial password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            className={inputCompact}
          />
          <p className="text-xs text-zinc-500">At least 8 characters.</p>
        </div>

        <div>
          <button type="submit" className={button("primary", "sm")}>
            Create cleaner
          </button>
        </div>
      </form>
    </div>
  );
}
