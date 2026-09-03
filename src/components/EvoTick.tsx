// The Evo tick mark, swapping black/white variants for light/dark mode.
// className controls the rendered size (e.g. "h-7 w-auto").
//
// Plain <img>, not next/image: Next's on-the-fly optimizer route 400s on
// these files even though they're valid PNGs (sharp decodes them fine) —
// looks like a framework quirk with this Next.js version, not a file
// problem.
export function EvoTick({ className }: { className?: string }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/branding/evo-tick-black.png"
        alt="Evo"
        width={87}
        height={100}
        className={`${className ?? ""} dark:hidden`}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/branding/evo-tick-white.png"
        alt="Evo"
        width={87}
        height={100}
        className={`${className ?? ""} hidden dark:block`}
      />
    </>
  );
}
