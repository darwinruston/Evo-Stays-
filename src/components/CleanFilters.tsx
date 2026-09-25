"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CLEAN_STATUS_LABELS } from "@/lib/cleans";
import { button, inputCompact } from "@/lib/ui";

// Auto-applies on change (no submit button) -- query-param driven so the
// filtered view is a shareable/bookmarkable URL, same as the cleaner
// calendar's month/day navigation elsewhere in this app. The only reason
// this is a client component in an otherwise server-rendered app: a plain
// <select> can't push a new URL on its own without one.
//
// The dropdowns sit behind a Filters button rather than always taking up the
// top of the page; the button carries a count of what's active so a filtered
// view is never mistaken for the full list even while the panel is closed.
export function CleanFilters({
  properties,
  cleaners,
}: {
  properties: { id: string; label: string }[];
  cleaners: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(params.size > 0 ? `${pathname}?${params.toString()}` : pathname);
  }

  const activeCount = ["status", "propertyId", "cleanerId"].filter((key) => searchParams.get(key)).length;
  const hasFilters = activeCount > 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className={button(hasFilters ? "primary" : "secondary", "sm")}
        >
          Filters{hasFilters ? ` (${activeCount})` : ""}
        </button>
        {hasFilters && (
          <button
            type="button"
            onClick={() => router.push(pathname)}
            className="text-xs text-zinc-500 underline underline-offset-2"
          >
            Clear filters
          </button>
        )}
      </div>

      {open && (
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filter by status"
            value={searchParams.get("status") ?? ""}
            onChange={(e) => setParam("status", e.target.value)}
            className={`${inputCompact} w-auto`}
          >
            <option value="">All statuses</option>
            {Object.entries(CLEAN_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by property"
            value={searchParams.get("propertyId") ?? ""}
            onChange={(e) => setParam("propertyId", e.target.value)}
            className={`${inputCompact} w-auto`}
          >
            <option value="">All properties</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by cleaner"
            value={searchParams.get("cleanerId") ?? ""}
            onChange={(e) => setParam("cleanerId", e.target.value)}
            className={`${inputCompact} w-auto`}
          >
            <option value="">All cleaners</option>
            <option value="unassigned">Unassigned</option>
            {cleaners.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
