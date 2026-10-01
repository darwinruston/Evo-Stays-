"use server";

import { prisma } from "@/lib/prisma";

export type RegisterInterestState = { error: string } | { success: true } | undefined;

function str(formData: FormData, key: string): string | null {
  const raw = formData.get(key);
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed === "" ? null : trimmed;
}

// Captures a prospective customer's details before the platform is
// actually live to the public, rather than letting them create a real
// trial account -- see the comment on InterestRegistration in
// schema.prisma. Goes through the raw, unscoped `prisma` client on
// purpose (see UNSCOPED_MODELS in src/lib/prisma.ts): there's no
// organization to scope into yet, since submitting this is how a
// prospective one might eventually come to exist. Upserts on email rather
// than rejecting a repeat submission as a duplicate -- resubmitting
// (an updated company name, more detail in notes) is a normal thing to do
// while waiting, not an error, and there's no anti-enumeration reason to
// hide whether an email already registered the way forgot-password does.
export async function registerInterest(
  _prev: RegisterInterestState,
  formData: FormData,
): Promise<RegisterInterestState> {
  const name = str(formData, "name");
  const email = str(formData, "email");
  const companyName = str(formData, "companyName");
  const notes = str(formData, "notes");
  if (!name || !email || !companyName) {
    return { error: "Name, email and company name are all required." };
  }

  await prisma.interestRegistration.upsert({
    where: { email },
    update: { name, companyName, notes },
    create: { name, email, companyName, notes },
  });

  return { success: true };
}
