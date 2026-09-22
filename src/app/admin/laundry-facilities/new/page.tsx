import Link from "next/link";
import { requireStaff } from "@/lib/authz";
import { createLaundryFacility } from "../actions";
import { button, inputCompact } from "@/lib/ui";

export const metadata = { title: "New laundry company" };

export default async function NewLaundryFacilityPage() {
  await requireStaff();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/laundry-facilities" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Laundry companies
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">New laundry company</h1>
      </div>

      <form action={createLaundryFacility} className="flex max-w-lg flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-medium">
            Name
          </label>
          <input
            id="name"
            name="name"
            required
            placeholder="Sudsy Wash Laundry Services"
            className={inputCompact}
          />
        </div>

        <div>
          <button type="submit" className={button("primary", "sm")}>
            Create facility
          </button>
        </div>
      </form>
    </div>
  );
}
