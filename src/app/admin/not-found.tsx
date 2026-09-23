import Link from "next/link";
import { button } from "@/lib/ui";

// Renders inside AdminLayout (Next.js resolves the nearest not-found.tsx up
// the route tree, and that segment's layout still wraps it) -- so this is
// what a dead link into /admin/* shows instead of the framework's bare,
// chrome-less 404. The audit log is the main source of these: it links to
// entities by id even after they're deleted, since history has to survive
// the thing it's about being gone.
export default function AdminNotFound() {
  return (
    <div className="flex flex-col items-start gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="max-w-md text-sm text-zinc-600">
        Whatever this linked to doesn&apos;t exist anymore — it may have been deleted. A link from
        the Activity log, for example, still points at the record it was about even after that
        record&apos;s gone, since the history needs to survive it.
      </p>
      <Link href="/admin" className={button("primary", "sm")}>
        Back to Overview
      </Link>
    </div>
  );
}
