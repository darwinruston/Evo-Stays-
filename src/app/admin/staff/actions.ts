"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { SYSTEM_USER_ID } from "@/lib/systemUser";

const STAFF_ROLES: Role[] = ["ADMIN", "OFFICE"];
const ROLE_LABELS: Record<string, string> = { ADMIN: "Admin", OFFICE: "Office" };

function str(formData: FormData, key: string): string | null {
  const raw = formData.get(key);
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed === "" ? null : trimmed;
}

function staffRole(formData: FormData): Role {
  const role = str(formData, "role");
  if (role !== "ADMIN" && role !== "OFFICE") throw new Error("Choose Admin or Office");
  return role;
}

// Admins other than this one and the "Automated sync" system account, which
// is an ADMIN for permission purposes but can't log in and doesn't count as
// someone who could rescue a locked-out system.
async function otherAdminCount(excludingId: string): Promise<number> {
  return prisma.user.count({
    where: { role: "ADMIN", id: { notIn: [excludingId, SYSTEM_USER_ID] } },
  });
}

export async function createStaff(formData: FormData) {
  const session = await requireAdmin();

  const name = str(formData, "name");
  const email = str(formData, "email");
  const password = str(formData, "password");
  const role = staffRole(formData);
  if (!name || !email || !password) throw new Error("Name, email and password are all required");
  if (password.length < 8) throw new Error("Password must be at least 8 characters");

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) throw new Error("That email address already has a login");

  const created = await prisma.user.create({
    data: { name, email, passwordHash: await bcrypt.hash(password, 10), role },
    select: { id: true },
  });

  await logAudit({
    actorId: session.user.id,
    entityType: "Staff",
    entityId: created.id,
    summary: `Added ${ROLE_LABELS[role]} login — ${name} (${email})`,
  });

  revalidatePath("/admin/staff");
}

// Name, email, role, and (optionally) a new password. Blank password means
// leave it alone -- same convention as updateCleaner. This is also how the
// demo logins a fresh install starts with get turned into real ones,
// without having to delete them.
export async function updateStaff(id: string, formData: FormData) {
  const session = await requireAdmin();
  if (id === SYSTEM_USER_ID) throw new Error("That account can't be edited");

  const name = str(formData, "name");
  const email = str(formData, "email");
  const role = staffRole(formData);
  if (!name || !email) throw new Error("Name and email are both required");

  const password = str(formData, "password");
  if (password !== null && password.length < 8) throw new Error("Password must be at least 8 characters");

  const emailOwner = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (emailOwner && emailOwner.id !== id) throw new Error("That email address already has a login");

  const before = await prisma.user.findFirst({
    where: { id, role: { in: STAFF_ROLES } },
    select: { name: true, email: true, role: true },
  });
  if (!before) throw new Error("That staff login no longer exists");

  if (before.role !== role) {
    if (id === session.user.id) throw new Error("You can't change your own role");
    if (before.role === "ADMIN" && (await otherAdminCount(id)) === 0) {
      throw new Error("There must always be at least one Admin");
    }
  }

  await prisma.user.update({
    where: { id },
    data: {
      name,
      email,
      role,
      ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
    },
  });

  const changes: string[] = [];
  if (before.name !== name) changes.push(`renamed from ${before.name} to ${name}`);
  if (before.email !== email) changes.push(`email changed from ${before.email} to ${email}`);
  if (before.role !== role) changes.push(`role changed from ${ROLE_LABELS[before.role]} to ${ROLE_LABELS[role]}`);
  if (password) changes.push("password changed");
  if (changes.length > 0) {
    await logAudit({
      actorId: session.user.id,
      entityType: "Staff",
      entityId: id,
      summary: `${name}: ${changes.join("; ")}`,
    });
  }

  revalidatePath("/admin/staff");
}

export async function deleteStaff(id: string) {
  const session = await requireAdmin();
  if (id === SYSTEM_USER_ID) throw new Error("That account can't be removed");
  if (id === session.user.id) throw new Error("You can't remove your own login");

  const target = await prisma.user.findFirst({
    where: { id, role: { in: STAFF_ROLES } },
    select: { name: true, email: true, role: true },
  });
  if (!target) throw new Error("That staff login no longer exists");

  if (target.role === "ADMIN" && (await otherAdminCount(id)) === 0) {
    throw new Error("There must always be at least one Admin");
  }

  // Every clean records who created it, and history isn't rewritten -- so a
  // login that has scheduled work can't be deleted. Say so, and point at the
  // way round it (repurpose the login) rather than leaving a raw database error.
  const createdCleans = await prisma.clean.count({ where: { createdById: id } });
  if (createdCleans > 0) {
    throw new Error(
      `${target.name} has scheduled ${createdCleans} ${createdCleans === 1 ? "clean" : "cleans"}, so their login can't be removed without erasing that history. Edit it instead — change the name, email and password.`,
    );
  }

  try {
    await prisma.user.delete({ where: { id } });
  } catch {
    throw new Error(
      `${target.name}'s login is linked to records that need it, so it can't be removed. Edit it instead — change the name, email and password.`,
    );
  }

  await logAudit({
    actorId: session.user.id,
    entityType: "Staff",
    entityId: id,
    summary: `Removed ${ROLE_LABELS[target.role]} login — ${target.name} (${target.email})`,
  });

  revalidatePath("/admin/staff");
}
