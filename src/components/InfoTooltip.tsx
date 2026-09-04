// A small "?" icon that reveals explanatory text on hover/focus, for section
// blurbs that matter once (reading it the first time) but just add noise on
// every later visit -- CSS-only (group-hover/group-focus-within), no client
// JS needed since this only ever renders inside server components.
export function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <span
        tabIndex={0}
        role="button"
        aria-label={text}
        className="flex h-4 w-4 shrink-0 cursor-help items-center justify-center rounded-full border border-zinc-300 text-[10px] font-medium text-zinc-500 outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
      >
        ?
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-0 top-full z-20 mt-2 w-64 max-w-[80vw] rounded-md bg-zinc-900 px-3 py-2 text-xs font-normal leading-relaxed text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}
