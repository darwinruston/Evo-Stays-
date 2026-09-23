"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AUDIT_ENTITY_LABELS, type AuditEntityType } from "@/lib/audit";
import { inputCompact } from "@/lib/ui";

// Same auto-apply-on-change pattern as CleanFilters.
export function AuditFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setEntityType(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("entityType", value);
    else params.delete("entityType");
    router.push(params.size > 0 ? `${pathname}?${params.toString()}` : pathname);
  }

  return (
    <select
      aria-label="Filter by type"
      value={searchParams.get("entityType") ?? ""}
      onChange={(e) => setEntityType(e.target.value)}
      className={`${inputCompact} w-auto`}
    >
      <option value="">All types</option>
      {(Object.entries(AUDIT_ENTITY_LABELS) as [AuditEntityType, string][]).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}
