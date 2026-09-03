// Shared style primitives -- keeps button/card treatment consistent without
// repeating the same long className string on every page. Callers reach for
// a variant name, not literal Tailwind classes.

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const BUTTON_BASE =
  "inline-flex items-center justify-center font-medium transition-colors duration-150 disabled:opacity-40 disabled:pointer-events-none";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200",
  secondary:
    "border border-black/10 text-zinc-900 hover:bg-black/[0.03] dark:border-white/15 dark:text-white dark:hover:bg-white/[0.06]",
  ghost: "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white",
  // Destructive actions only (delete). This is the one place colour stays
  // semantic (danger) rather than brand -- same reasoning as red form
  // errors: a safety signal, not a decorative choice.
  danger:
    "border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/60",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "rounded-md px-3.5 py-2 text-sm gap-1.5",
  md: "rounded-lg px-5 py-2.5 text-sm gap-2",
  lg: "rounded-lg px-7 py-3.5 text-base gap-2",
};

export function button(variant: ButtonVariant = "primary", size: ButtonSize = "md"): string {
  return `${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]}`;
}

// A floating card: soft shadow in light mode (where a shadow actually
// reads against the page), a faint border instead in dark mode (where it
// doesn't -- see the --surface token in globals.css).
export function card(extra = ""): string {
  return `rounded-2xl bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-16px_rgba(0,0,0,0.12)] dark:border dark:border-white/10 dark:shadow-none ${extra}`;
}

export const input =
  "w-full rounded-lg border border-black/10 bg-surface px-4 py-2.5 text-base outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4 focus:ring-black/5 dark:border-white/15 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-white/5";

// A denser input for internal admin/cleaner forms -- same treatment, tighter
// padding and text-sm to match table/list density.
export const inputCompact =
  "w-full rounded-md border border-black/10 bg-surface px-3 py-2 text-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4 focus:ring-black/5 dark:border-white/15 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-white/5";

type BadgeTone = "neutral" | "solid" | "outline";

const BADGE_BASE = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium";

const BADGE_TONES: Record<BadgeTone, string> = {
  // Quiet, informational (e.g. a default status).
  neutral: "bg-black/[0.05] text-zinc-600 dark:bg-white/10 dark:text-zinc-400",
  // Needs attention / the "on" state (e.g. "Running low").
  solid: "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900",
  outline: "border border-black/10 text-zinc-600 dark:border-white/15 dark:text-zinc-400",
};

export function badge(tone: BadgeTone = "neutral"): string {
  return `${BADGE_BASE} ${BADGE_TONES[tone]}`;
}
