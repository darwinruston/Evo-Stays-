"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AUDIT_ENTITY_LABELS, type AuditEntityType } from "@/lib/audit";
import { inputCompact } from "@/lib/ui";

// Same auto-apply-on-change pattern as CleanFilters. Each select sits in a
// fixed-width box because the shared input style is full width.
export function AuditFilters({ people }: { people: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(params.size > 0 ? `${pathname}?${params.toString()}` : pathname);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <div className="w-44">
        <select
          aria-label="Filter by person"
          value={searchParams.get("actor") ?? ""}
          onChange={(e) => setParam("actor", e.target.value)}
          className={inputCompact}
        >
          <option value="">Everyone</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div className="w-44">
        <select
          aria-label="Filter by type"
          value={searchParams.get("entityType") ?? ""}
          onChange={(e) => setParam("entityType", e.target.value)}
          className={inputCompact}
        >
          <option value="">All types</option>
          {(Object.entries(AUDIT_ENTITY_LABELS) as [AuditEntityType, string][]).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
