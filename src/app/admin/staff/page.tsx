import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { SYSTEM_USER_ID } from "@/lib/systemUser";
import { AddStaffForm } from "@/components/AddStaffForm";
import { StaffRow } from "@/components/StaffRow";
import { createStaff, updateStaff, deleteStaff } from "./actions";

export const metadata = { title: "Staff logins" };

export default async function StaffPage() {
  const session = await requireAdmin();

  const staff = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "OFFICE"] }, id: { not: SYSTEM_USER_ID } },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, email: true, role: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/cleaners" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Cleaners
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Staff logins</h1>
        <p className="mt-1 max-w-xl text-sm text-zinc-500">
          Everyone who can sign in to run the schedule. Admins can also manage this list; Office staff
          can&apos;t. Cleaners have their own logins on the Cleaners page.
        </p>
      </div>

      <ul className="flex max-w-2xl flex-col gap-2">
        {staff.map((s) => (
          <StaffRow
            key={s.id}
            name={s.name}
            email={s.email}
            role={s.role as "ADMIN" | "OFFICE"}
            isSelf={s.id === session.user.id}
            updateAction={updateStaff.bind(null, s.id)}
            removeAction={deleteStaff.bind(null, s.id)}
          />
        ))}
      </ul>

      <div>
        <AddStaffForm action={createStaff} />
      </div>
    </div>
  );
}
