import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { EvoTick } from "@/components/EvoTick";
import { OnboardingWizard } from "./OnboardingWizard";
import { completeOnboarding, skipOnboarding } from "./actions";

export const metadata = { title: "Set up Evo Stays" };

export default async function OnboardingPage() {
  const { session } = await requireAdmin();
  const organization = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
    select: { name: true, onboardingCompletedAt: true },
  });
  if (!organization || organization.onboardingCompletedAt) redirect("/admin");

  return (
    <main className="flex min-h-screen justify-center px-4 py-10 sm:py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <EvoTick className="h-9 w-auto" />
        </div>
        <OnboardingWizard
          companyName={organization.name}
          finishAction={completeOnboarding}
          skipAction={skipOnboarding}
        />
      </div>
    </main>
  );
}
