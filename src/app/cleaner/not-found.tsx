import Link from "next/link";
import { button } from "@/lib/ui";

// Renders inside CleanerLayout -- same reasoning as admin/not-found.tsx.
export default function CleanerNotFound() {
  return (
    <div className="flex flex-col items-start gap-3">
      <h1 className="text-xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-sm text-zinc-600">
        Whatever this linked to doesn&apos;t exist anymore, or isn&apos;t yours to see.
      </p>
      <Link href="/cleaner" className={button("primary", "sm")}>
        Back to My cleans
      </Link>
    </div>
  );
}
