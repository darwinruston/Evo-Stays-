import { AsyncLocalStorage } from "node:async_hooks";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { regionFor, setRequestRegion, type Region } from "@/lib/region";

// Reads a company's country and currency. Organisation carries no row-level
// security, so this reads it directly; cached for the request.
export const loadRegion = cache(async (organizationId: string): Promise<Region> => {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { country: true, currency: true },
  });
  return regionFor(org?.country, org?.currency);
});

// Loads the company's region and makes it the current one for this request.
export async function useRegionFor(organizationId: string): Promise<Region> {
  const region = await loadRegion(organizationId);
  setRequestRegion(region);
  return region;
}

const store = new AsyncLocalStorage<Region>();
(globalThis as { __evoRegionStore?: AsyncLocalStorage<Region> }).__evoRegionStore = store;

// For background jobs (the timer in src/lib/syncScheduler.ts): runs the work
// with the company's region as the current one, as if it were a request.
export async function runForOrganization<T>(organizationId: string, work: () => Promise<T>): Promise<T> {
  const region = await loadRegion(organizationId);
  return store.run(region, work);
}
