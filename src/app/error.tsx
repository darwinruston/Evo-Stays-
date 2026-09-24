"use client";

import Link from "next/link";
import { button, card } from "@/lib/ui";

// The fallback for anything that throws below the root layout -- a rejected
// form submission that isn't handled inline, or an unexpected failure.
// Without it, production shows the framework's bare error page. Production
// also hides a thrown error's message, so this doesn't try to repeat it:
// it just says what to do next. `retry` re-fetches and re-renders the
// failed segment (Next 16's replacement for the older `reset`).
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className={card("flex max-w-md flex-col gap-4 p-6")}>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Something went wrong</h1>
          <p className="mt-1 text-sm text-zinc-600">
            That didn&apos;t go through. Check what you entered and try again — if it keeps happening,
            let the office know
            {error.digest ? (
              <>
                {" "}
                and quote reference <code className="text-xs">{error.digest}</code>
              </>
            ) : null}
            .
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => retry()} className={button("primary", "sm")}>
            Try again
          </button>
          <Link href="/" className={button("secondary", "sm")}>
            Go to home
          </Link>
        </div>
      </div>
    </div>
  );
}
