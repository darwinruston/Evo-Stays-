import type { CleanPrep } from "@/lib/cleanPrep";

// Line-art, matching the hamburger icon in NavMenu -- the app's one other
// inline SVG. Kept to this file since nothing outside this changeover
// summary needs bed/bath/sofa icons yet.
const ICON_PROPS = {
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.5",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function BedIcon({ className }: { className?: string }) {
  return (
    <svg {...ICON_PROPS} className={className} role="img" aria-label="Beds">
      <path d="M2.5 16.5v-5A1.5 1.5 0 0 1 4 10h12a1.5 1.5 0 0 1 1.5 1.5v5" />
      <path d="M2.5 17.5v-1M17.5 17.5v-1" />
      <path d="M4.5 10V7.5A1.5 1.5 0 0 1 6 6h2a1.5 1.5 0 0 1 1.5 1.5V10" />
      <path d="M2.5 13.5h15" />
    </svg>
  );
}

function BathIcon({ className }: { className?: string }) {
  return (
    <svg {...ICON_PROPS} className={className} role="img" aria-label="Bathrooms">
      <path d="M2.5 11.5h15" />
      <path d="M3 11.5v2.5A3 3 0 0 0 6 17h8a3 3 0 0 0 3-3v-2.5" />
      <path d="M4.5 11.5V8A1.5 1.5 0 0 1 6 6.5a1 1 0 0 1 1 1" />
      <path d="M6 17v1M14 17v1" />
    </svg>
  );
}

function SofaBedIcon({ className }: { className?: string }) {
  return (
    <svg {...ICON_PROPS} className={className} role="img" aria-label="Sofa bed needs preparing">
      <path d="M3 15v-3.5A1.5 1.5 0 0 1 4.5 10h11A1.5 1.5 0 0 1 17 11.5V15" />
      <path d="M3 15.5v1M17 15.5v1" />
      <path d="M4 10V7.5A1.5 1.5 0 0 1 5.5 6h9A1.5 1.5 0 0 1 16 7.5V10" />
      <path d="M3 12.5h14" />
    </svg>
  );
}

// Beds/bathrooms are always shown as icon + count; the sofa icon only
// appears when this specific booking's guest count actually calls for it --
// see cleanPrep in src/lib/cleanPrep.ts.
export function CleanPrepSummary({ prep, className = "" }: { prep: CleanPrep; className?: string }) {
  return (
    <p className={`flex items-center gap-3 text-zinc-500 ${className}`}>
      <span className="inline-flex items-center gap-1">
        <BedIcon className="h-3.5 w-3.5 shrink-0" />
        {prep.beds}
      </span>
      <span className="inline-flex items-center gap-1">
        <BathIcon className="h-3.5 w-3.5 shrink-0" />
        {prep.bathrooms}
      </span>
      {prep.sofaBedNeeded && <SofaBedIcon className="h-3.5 w-3.5 shrink-0 text-zinc-700" />}
    </p>
  );
}
