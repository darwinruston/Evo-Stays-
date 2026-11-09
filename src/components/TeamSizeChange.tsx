"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/lib/actionResult";
import { peopleCount } from "@/lib/teamSize";
import { button } from "@/lib/ui";
import { TeamSizeStepper } from "@/components/TeamSizeStepper";

// "Team of 2. Change": for when someone joins or leaves partway through a
// visit. Shows the current size and opens the stepper only when asked.
export function TeamSizeChange({
  size,
  action,
  staff = false,
}: {
  size: number;
  action: (formData: FormData) => Promise<ActionResult>;
  // Staff correcting a visit afterwards, rather than the cleaner on site.
  staff?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <p className="text-sm text-zinc-600">
        {size === 1 ? (staff ? "One person cleaned." : "Just you on this clean.") : `Team of ${size} on this clean.`}{" "}
        <button type="button" onClick={() => setOpen(true)} className="underline underline-offset-2 hover:text-zinc-900">
          Change
        </button>
      </p>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        setError(null);
        startTransition(async () => {
          try {
            const result = await action(formData);
            if (result) setError(result.error);
            else setOpen(false);
          } catch {
            setError("Something went wrong.");
          }
        });
      }}
      className="flex flex-col gap-3 rounded-2xl bg-surface p-4 ring-1 ring-black/[0.06]"
    >
      <div>
        <p className="text-sm font-medium">{staff ? "How many people cleaned?" : "How many of you are cleaning?"}</p>
        <p className="mt-0.5 text-xs text-zinc-500">Currently {peopleCount(size)}. Pay is for everyone on the clean.</p>
      </div>
      <TeamSizeStepper defaultValue={size} compact />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex items-center gap-2">
        <button type="submit" disabled={pending} className={button("primary", "sm")}>
          {pending ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={button("ghost", "sm")}>
          Cancel
        </button>
      </div>
    </form>
  );
}
