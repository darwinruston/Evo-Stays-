import Link from "next/link";
import { button } from "@/lib/ui";

// Root fallback -- for a bad URL outside both /admin/* and /cleaner/*
// (each of which has its own not-found.tsx with the right nav for a
// signed-in visitor). This one can't assume a session exists at all, so it
// just points back to the front door.
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="max-w-md text-sm text-zinc-600">
        That page doesn&apos;t exist, or you don&apos;t have access to it.
      </p>
      <Link href="/" className={button("primary", "sm")}>
        Back to Evo Stays
      </Link>
    </div>
  );
}
