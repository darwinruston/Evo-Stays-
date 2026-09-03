"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/authz";
import { saveProfilePhoto } from "@/lib/profilePhotos";

// Trims and turns blank strings into null, so an untouched optional input
// stores NULL rather than "".
function str(formData: FormData, key: string): string | null {
  const raw = formData.get(key);
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed === "" ? null : trimmed;
}

function file(formData: FormData, key: string): File | null {
  const raw = formData.get(key);
  return raw instanceof File && raw.size > 0 ? raw : null;
}

export async function createClient(formData: FormData) {
  await requireStaff();

  const name = str(formData, "name");
  if (!name) throw new Error("Name is required");

  const client = await prisma.client.create({
    data: {
      name,
      email: str(formData, "email"),
      phone: str(formData, "phone"),
      notes: str(formData, "notes"),
    },
  });

  const photo = file(formData, "photo");
  if (photo) {
    const photoPath = await saveProfilePhoto(client.id, photo);
    await prisma.client.update({ where: { id: client.id }, data: { photoPath } });
  }

  revalidatePath("/admin/clients");
  redirect(`/admin/clients/${client.id}`);
}

export async function updateClient(id: string, formData: FormData) {
  await requireStaff();

  const name = str(formData, "name");
  if (!name) throw new Error("Name is required");

  const photo = file(formData, "photo");
  const photoPath = photo ? await saveProfilePhoto(id, photo) : undefined;

  await prisma.client.update({
    where: { id },
    data: {
      name,
      email: str(formData, "email"),
      phone: str(formData, "phone"),
      notes: str(formData, "notes"),
      // Left alone when no new file was chosen, so editing other fields
      // doesn't wipe an existing photo.
      ...(photoPath ? { photoPath } : {}),
    },
  });

  revalidatePath("/admin/clients");
  revalidatePath(`/admin/clients/${id}`);
  redirect(`/admin/clients/${id}`);
}

export async function deleteClient(id: string) {
  await requireStaff();

  // Cascades to this client's properties, their images, and any portal
  // logins (see the onDelete rules in schema.prisma).
  await prisma.client.delete({ where: { id } });

  revalidatePath("/admin/clients");
  revalidatePath("/admin/properties");
  redirect("/admin/clients");
}

// Issues a portal login for this client. Several logins may point at the
// same Client -- that's the management-company case the schema allows for.
export async function createClientLogin(clientId: string, formData: FormData) {
  await requireStaff();

  const name = str(formData, "loginName");
  const email = str(formData, "loginEmail");
  const password = str(formData, "loginPassword");
  if (!name || !email || !password) {
    throw new Error("Name, email and password are all required for a portal login");
  }
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("That email address already has a login");

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: "CLIENT",
      clientId,
    },
  });

  revalidatePath(`/admin/clients/${clientId}`);
}

export async function deleteClientLogin(clientId: string, userId: string) {
  await requireStaff();

  // Scoped to this client so a stray id can't delete an unrelated login.
  const user = await prisma.user.findFirst({
    where: { id: userId, clientId, role: "CLIENT" },
    select: { id: true },
  });
  if (!user) throw new Error("Login not found for this client");

  await prisma.user.delete({ where: { id: user.id } });

  revalidatePath(`/admin/clients/${clientId}`);
}
