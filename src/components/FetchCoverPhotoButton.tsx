"use client";

import { useState, useTransition } from "react";
import { button } from "@/lib/ui";

// A plain submit button would crash to the generic error screen on
// failure (this app has no error boundary) -- e.g. Hostify genuinely has
// no photo for this listing, or the fetch just hiccups. Caught here and
// shown inline instead, same reasoning as useRevealForm.
export function FetchCoverPhotoButton({ action }: { action: () => Promise<void> }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              await action();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Something went wrong.");
            }
          });
        }}
        className={button("secondary", "sm")}
      >
        {pending ? "Fetching…" : "Fetch photo from Hostify"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
