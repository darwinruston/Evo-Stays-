import type { CleanPrep } from "@/lib/cleanPrep";

// Line-art, matching the hamburger icon in NavMenu -- the app's one other
// inline SVG. Kept to this file since nothing else needs a sofa icon yet.
function SofaBedIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role="img"
      aria-label="Sofa bed needs preparing"
    >
      <path d="M3 15v-3.5A1.5 1.5 0 0 1 4.5 10h11A1.5 1.5 0 0 1 17 11.5V15" />
      <path d="M3 15.5v1M17 15.5v1" />
      <path d="M4 10V7.5A1.5 1.5 0 0 1 5.5 6h9A1.5 1.5 0 0 1 16 7.5V10" />
      <path d="M3 12.5h14" />
    </svg>
  );
}

// Beds/bathrooms are always shown as counts; the sofa icon only appears
// when this specific booking's guest count actually calls for it -- see
// cleanPrep in src/lib/cleanPrep.ts.
export function CleanPrepSummary({ prep, className = "" }: { prep: CleanPrep; className?: string }) {
  return (
    <p className={`flex items-center gap-1.5 text-zinc-500 ${className}`}>
      <span>
        {prep.beds} {prep.beds === 1 ? "bed" : "beds"} to change · {prep.bathrooms}{" "}
        {prep.bathrooms === 1 ? "bathroom" : "bathrooms"} to clean
      </span>
      {prep.sofaBedNeeded && <SofaBedIcon className="h-3.5 w-3.5 shrink-0 text-zinc-700" />}
    </p>
  );
}
