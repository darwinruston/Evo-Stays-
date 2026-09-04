// A step bar for any forced-march flow: one segment per step, filled up to
// and including the current one, with the current step's label bolded.
// Shared by the cleaner check-in/out flow and the laundry-load wizard so
// both step flows in the app read the same way.
export function StepProgress({ steps, current }: { steps: readonly string[]; current: number }) {
  return (
    <ol className="flex items-center gap-1.5">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex flex-1 flex-col gap-1.5">
            <span className={"h-1 rounded-full " + (done || active ? "bg-zinc-900" : "bg-black/10")} />
            <span className={"text-[11px] " + (active ? "font-medium text-zinc-900" : "text-zinc-500")}>
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
