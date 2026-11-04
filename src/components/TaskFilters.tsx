"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { inputCompact } from "@/lib/ui";

// Same auto-apply-on-change pattern as AuditFilters. "Mine" and "Open" are the
// defaults, so they leave the address clean. Each select sits in a fixed-width
// box because the shared input style is full width.
export function TaskFilters({ people }: { people: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string, fallback: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== fallback) params.set(key, value);
    else params.delete(key);
    router.push(params.size > 0 ? `${pathname}?${params.toString()}` : pathname);
  }

  return (
    <div className="flex w-full gap-2 sm:w-auto">
      <div className="min-w-0 flex-1 sm:w-44 sm:flex-none">
        <select
          aria-label="Whose tasks"
          value={searchParams.get("who") ?? "me"}
          onChange={(e) => setParam("who", e.target.value, "me")}
          className={inputCompact}
        >
          <option value="me">My tasks</option>
          <option value="all">Everyone</option>
          <option value="none">Not assigned</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-0 flex-1 sm:w-44 sm:flex-none">
        <select
          aria-label="Which tasks"
          value={searchParams.get("show") ?? "open"}
          onChange={(e) => setParam("show", e.target.value, "open")}
          className={inputCompact}
        >
          <option value="open">Open</option>
          <option value="done">Done</option>
          <option value="all">Open and done</option>
        </select>
      </div>
    </div>
  );
}
