"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/authz";

function str(formData: FormData, key: string): string | null {
  const raw = formData.get(key);
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed === "" ? null : trimmed;
}

export async function createCleaner(formData: FormData) {
  await requireStaff();

  const name = str(formData, "name");
  const email = str(formData, "email");
  const password = str(formData, "password");
  if (!name || !email || !password) throw new Error("Name, email and password are all required");
  if (password.length < 8) throw new Error("Password must be at least 8 characters");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("That email address already has a login");

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: "CLEANER",
    },
  });

  revalidatePath("/admin/cleaners");
  redirect("/admin/cleaners");
}

export async function deleteCleaner(id: string) {
  await requireStaff();

  // Cleans keep pointing at a deleted cleaner would break the assignee
  // relation, so unassign them first -- the work still needs doing, it just
  // needs somebody else. Completed cleans keep their log (CleanLog.recordedBy
  // is a separate, restrictive relation), so history isn't rewritten.
  const hasHistory = await prisma.cleanLog.findFirst({
    where: { recordedById: id },
    select: { id: true },
  });
  if (hasHistory) {
    throw new Error(
      "This cleaner has completed cleans on record, so their account can't be deleted without erasing that history.",
    );
  }

  await prisma.clean.updateMany({ where: { assignedToId: id }, data: { assignedToId: null } });
  await prisma.user.delete({ where: { id } });

  revalidatePath("/admin/cleaners");
  revalidatePath("/admin/cleans");
  redirect("/admin/cleaners");
}
