// Shared style primitives -- keeps button/card treatment consistent without
// repeating the same long className string on every page. Callers reach for
// a variant name, not literal Tailwind classes.
//
// Light mode only (see globals.css) -- no dark: variants to keep in sync.

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const BUTTON_BASE =
  "inline-flex items-center justify-center font-medium transition-colors duration-150 disabled:opacity-40 disabled:pointer-events-none";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-teal-700 text-white hover:bg-teal-800",
  secondary: "border border-black/10 text-zinc-900 hover:border-teal-600/40 hover:bg-teal-50",
  ghost: "text-zinc-600 hover:text-zinc-900",
  // Destructive actions only (delete): red as a safety signal, not decoration.
  danger: "border border-red-200 text-red-600 hover:bg-red-50",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "rounded-md px-3.5 py-2 text-sm gap-1.5",
  md: "rounded-lg px-5 py-2.5 text-sm gap-2",
  lg: "rounded-lg px-7 py-3.5 text-base gap-2",
};

export function button(variant: ButtonVariant = "primary", size: ButtonSize = "md"): string {
  return `${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]}`;
}

// A floating card: a soft shadow against the slightly-off-white page
// background is what gives it elevation.
export function card(extra = ""): string {
  return `rounded-2xl bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-16px_rgba(0,0,0,0.12)] ${extra}`;
}

export const input =
  "w-full rounded-lg border border-black/10 bg-surface px-4 py-2.5 text-base outline-none transition-colors placeholder:text-zinc-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15";

// A denser input for internal admin/cleaner forms -- same treatment, tighter
// padding and text-sm to match table/list density. text-base (not text-sm)
// below the sm breakpoint: iOS Safari and Android Chrome auto-zoom the page
// on focusing any input under 16px, which is exactly what text-sm (14px)
// is -- that's the "page zooms in and I have to drag it back" behaviour,
// not a viewport setting. Only matters on a phone-width screen; sm: and up
// (desktop/tablet admin use) keeps the denser text-sm.
export const inputCompact =
  "w-full rounded-md border border-black/10 bg-surface px-3 py-2 text-base sm:text-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15";

// The app's teal is the same as the public site's. Beyond it, colour carries
// meaning and nothing else: green is done or fine, amber wants a look, red is
// overdue or urgent, blue is happening now. The words always say it too, so
// nothing depends on telling colours apart.
export type BadgeTone = "neutral" | "solid" | "outline" | "success" | "warning" | "danger" | "info";

const BADGE_BASE = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium";

const BADGE_TONES: Record<BadgeTone, string> = {
  // Quiet, informational (e.g. a default status).
  neutral: "bg-black/[0.05] text-zinc-600",
  // The "on" state.
  solid: "bg-teal-700 text-white",
  outline: "border border-black/10 text-zinc-600",
  success: "bg-emerald-100 text-emerald-800",
  warning: "bg-amber-100 text-amber-900",
  danger: "bg-rose-100 text-rose-800",
  info: "bg-sky-100 text-sky-800",
};

export function badge(tone: BadgeTone = "neutral"): string {
  return `${BADGE_BASE} ${BADGE_TONES[tone]}`;
}
