import { requireCleaner } from "@/lib/authz";
import { requireModule } from "@/lib/modules";

// Sends the visitor home when this company has switched laundry off (see
// Settings). Entering the area from outside always passes through here, and
// the actions behind it check the same switch themselves.
export default async function CleanerLaundryLayout({ children }: { children: React.ReactNode }) {
  const { session } = await requireCleaner();
  await requireModule(session.user.organizationId, "laundry", "/cleaner");
  return children;
}
