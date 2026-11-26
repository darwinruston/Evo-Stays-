"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { clientIp } from "@/lib/loginRateLimit";
import { contactLimited } from "@/lib/contactRateLimit";
import { normaliseEmail } from "@/lib/emailAddress";
import { HEARD_FROM, cleanSource } from "@/lib/heardFrom";

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
// organisation to scope into yet, since submitting this is how a
// prospective one might eventually come to exist. Upserts on email rather
// than rejecting a repeat submission as a duplicate -- resubmitting
// (an updated company name, more detail in notes) is a normal thing to do
// while waiting, not an error, and there's no anti-enumeration reason to
// hide whether an email already registered the way forgot-password does.
export async function registerInterest(
  _prev: RegisterInterestState,
  formData: FormData,
): Promise<RegisterInterestState> {
  // A real person never sees or fills this field, so anything in it is a bot.
  // The reply looks like a success so it learns nothing.
  if (str(formData, "website")) return { success: true };

  const name = str(formData, "name");
  const typedEmail = str(formData, "email");
  const companyName = str(formData, "companyName");
  const notes = str(formData, "notes");
  if (!name || !typedEmail || !companyName) {
    return { error: "Name, email and company name are all required." };
  }
  if (name.length > 100 || companyName.length > 150 || (notes?.length ?? 0) > 2000) {
    return { error: "Some of that is too long. Please shorten it." };
  }
  const email = normaliseEmail(typedEmail);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
    return { error: "That email address doesn't look right." };
  }
  if (contactLimited(clientIp(await headers()), email)) {
    return { error: "You've sent this a few times already. Please wait a while before trying again." };
  }

  const answer = str(formData, "heardFrom");
  const heardFrom = answer && (HEARD_FROM as readonly string[]).includes(answer) ? answer : null;
  const source = cleanSource(formData.get("source"));

  await prisma.interestRegistration.upsert({
    where: { email },
    // Someone sending it again keeps how they first found us unless they say
    // something new.
    update: { name, companyName, notes, ...(heardFrom ? { heardFrom } : {}), ...(source ? { source } : {}) },
    create: { name, email, companyName, notes, heardFrom, source },
  });

  return { success: true };
}
