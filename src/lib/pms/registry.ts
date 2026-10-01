import type { PmsProvider } from "@prisma/client";
import type { PmsAdapter } from "@/lib/pms/types";
import { hostifyAdapter } from "@/lib/pms/hostify";
import { hostawayAdapter } from "@/lib/pms/hostaway";
import { guestyAdapter } from "@/lib/pms/guesty";

// One entry per provider with a built adapter -- Lodgify and OwnerRez join
// this in a later stage. Order here is also the order the provider <select>
// in PmsCredentialFields.tsx shows them in.
const ADAPTERS: PmsAdapter[] = [hostifyAdapter, guestyAdapter, hostawayAdapter];

const BY_PROVIDER = new Map<PmsProvider, PmsAdapter>(ADAPTERS.map((a) => [a.provider, a]));

export function getPmsAdapter(provider: PmsProvider): PmsAdapter {
  const adapter = BY_PROVIDER.get(provider);
  if (!adapter) throw new Error(`No PMS adapter registered for ${provider}`);
  return adapter;
}

export const PMS_PROVIDERS: PmsAdapter[] = ADAPTERS;
