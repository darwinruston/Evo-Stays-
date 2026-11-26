"use client";

import { useRef, useState } from "react";
import { ActionForm } from "@/components/ActionForm";
import type { ActionResult } from "@/lib/actionResult";
import { card } from "@/lib/ui";

// The amenity tick boxes, folded away until someone wants them. Saving folds
// them up again and says "Saved", so it is plain that something happened.
export function AmenitiesPanel({
  summary,
  startOpen,
  save,
  before,
  after,
  children,
}: {
  summary: string;
  // Open to begin with, e.g. just after reading them from the listing.
  startOpen: boolean;
  save: (formData: FormData) => Promise<ActionResult>;
  before: React.ReactNode;
  after: React.ReactNode;
  // The tick boxes and their save button.
  children: React.ReactNode;
}) {
  const panel = useRef<HTMLDetailsElement>(null);
  const [saved, setSaved] = useState(false);

  async function saveThenClose(formData: FormData) {
    const result = await save(formData);
    if (!result && panel.current) {
      setSaved(true);
      panel.current.open = false;
      // The page just got much shorter: keep the folded box in view.
      panel.current.scrollIntoView({ block: "nearest" });
    }
    return result;
  }

  return (
    <details
      ref={panel}
      open={startOpen}
      onToggle={(e) => {
        if (e.currentTarget.open) setSaved(false);
      }}
      className={card("group scroll-mt-24 p-4")}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-zinc-900 [&::-webkit-details-marker]:hidden">
        <span>
          {summary}
          <span role="status" className="ml-2 text-emerald-700">
            {saved ? "Saved" : ""}
          </span>
        </span>
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-zinc-400 transition-transform group-open:rotate-180"
        >
          <path d="M5 7.5l5 5 5-5" />
        </svg>
      </summary>
      <div className="mt-3 flex flex-col gap-3">
        {before}
        <ActionForm action={saveThenClose} className="flex flex-col gap-3">
          {children}
        </ActionForm>
        {after}
      </div>
    </details>
  );
}
