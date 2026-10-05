"use client";

import { useState, useTransition } from "react";
import { button } from "@/lib/ui";
import type { ActionResult } from "@/lib/actionResult";

// A plain submit button would drop to the generic error screen on failure
// -- e.g. Hostify genuinely has no photo for this listing, or the download
// just hiccups. The action returns the reason instead (see ActionResult),
// shown inline here, same reasoning as useRevealForm.
export function FetchCoverPhotoButton({ action }: { action: () => Promise<ActionResult> }) {
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
              const result = await action();
              if (result) setError(result.error);
            } catch {
              setError("Something went wrong.");
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
