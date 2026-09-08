import type { ReactNode } from "react";
import { card } from "@/lib/ui";

// A whole boxed tap target, not just a line of small underlined text -- the
// entire card opens/closes, and the chevron flips to show which way it
// currently reads. Pure <details>/<summary>, no JS: the browser's own
// open/close state drives the chevron rotation via Tailwind's group-open
// variant.
export function DetailsCard({ summary, children }: { summary: ReactNode; children: ReactNode }) {
  return (
    <details className={card("group p-4")}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-zinc-900 [&::-webkit-details-marker]:hidden">
        {summary}
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4 shrink-0 text-zinc-400 transition-transform group-open:rotate-180"
        >
          <path d="M5 7.5l5 5 5-5" />
        </svg>
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}
