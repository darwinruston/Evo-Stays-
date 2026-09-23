"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CLEAN_STATUS_LABELS } from "@/lib/cleans";
import { inputCompact } from "@/lib/ui";

// Auto-applies on change (no submit button) -- query-param driven so the
// filtered view is a shareable/bookmarkable URL, same as the cleaner
// calendar's month/day navigation elsewhere in this app. The only reason
// this is a client component in an otherwise server-rendered app: a plain
// <select> can't push a new URL on its own without one.
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

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(params.size > 0 ? `${pathname}?${params.toString()}` : pathname);
  }

  const hasFilters = ["status", "propertyId", "cleanerId"].some((key) => searchParams.get(key));

  return (
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
  );
}
