"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { modulesFromAnswers, parseAnswers, type Answers } from "@/lib/onboarding";

// Saves the answers to the first-run questions: the chosen business type
// plus the module switches they imply. Organization carries no RLS (see
// UNSCOPED_MODELS in src/lib/prisma.ts), so this goes through the plain
// client, scoped by hand to the signed-in admin's own organization.
export async function completeOnboarding(raw: Answers) {
  const { session } = await requireAdmin();
  const answers = parseAnswers(raw);
  if (!answers) throw new Error("Those answers didn't look right. Please try again.");

  const modules = modulesFromAnswers(answers);
  await prisma.organization.update({
    where: { id: session.user.organizationId },
    data: {
      businessType: answers.businessType,
      laundryEnabled: modules.laundry,
      stockEnabled: modules.stock,
      invoicingEnabled: modules.invoicing,
      syncEnabled: modules.sync,
      onboardingCompletedAt: new Date(),
    },
  });

  revalidatePath("/admin", "layout");
  revalidatePath("/cleaner", "layout");
  redirect("/admin");
}

// "Skip setup, give me everything": all parts stay on, and the questions
// aren't asked again. Anything can still be switched off from Settings.
export async function skipOnboarding() {
  const { session } = await requireAdmin();
  await prisma.organization.update({
    where: { id: session.user.organizationId },
    data: { onboardingCompletedAt: new Date() },
  });

  revalidatePath("/admin", "layout");
  redirect("/admin");
}
