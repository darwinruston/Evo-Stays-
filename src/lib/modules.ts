import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Modules } from "@/lib/onboarding";

export type ModuleKey = keyof Modules;

// An organisation's setup: which parts of the product it uses (the
// *Enabled columns, set by the first-run questions or Settings) and whether
// those questions have been answered yet. Organisation carries no RLS, so
// this reads it directly. Cached for the length of one request: the layout,
// the page and an action all ask, and it's one row.
export const getOrgSetup = cache(async (organizationId: string) => {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      onboardingCompletedAt: true,
      laundryEnabled: true,
      stockEnabled: true,
      invoicingEnabled: true,
      syncEnabled: true,
    },
  });
  const modules: Modules = {
    laundry: org?.laundryEnabled ?? true,
    stock: org?.stockEnabled ?? true,
    invoicing: org?.invoicingEnabled ?? true,
    sync: org?.syncEnabled ?? true,
  };
  return { modules, onboardingDone: !org || org.onboardingCompletedAt !== null };
});

export async function getOrgModules(organizationId: string): Promise<Modules> {
  return (await getOrgSetup(organizationId)).modules;
}

// For a page or layout: a switched-off area sends the visitor home rather
// than showing something they've said they don't use.
export async function requireModule(organizationId: string, key: ModuleKey, home: string): Promise<void> {
  const modules = await getOrgModules(organizationId);
  if (!modules[key]) redirect(home);
}

// For a server action: reachable by direct POST, so hiding the button isn't
// the check.
export async function assertModule(organizationId: string, key: ModuleKey): Promise<void> {
  const modules = await getOrgModules(organizationId);
  if (!modules[key]) {
    throw new Error("This feature is switched off for your company. You can turn it on in Settings.");
  }
}
