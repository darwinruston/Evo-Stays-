import { requireStaff } from "@/lib/authz";
import { requireModule } from "@/lib/modules";

// Sends the visitor home when this company has switched cleaner invoices off (see
// Settings). Entering the area from outside always passes through here, and
// the actions behind it check the same switch themselves.
export default async function AdminInvoicesLayout({ children }: { children: React.ReactNode }) {
  const { session } = await requireStaff();
  await requireModule(session.user.organizationId, "invoicing", "/admin");
  return children;
}
