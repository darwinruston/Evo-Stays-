import { PMS_PROVIDERS } from "@/lib/pms/registry";

// The booking systems the product connects to, straight from the adapters it
// actually has, so the public pages can't list one that doesn't exist or miss
// one that was added. Server-side only: it pulls in the adapter code.
export const PMS_NAMES: string[] = PMS_PROVIDERS.map((adapter) => adapter.displayName);
