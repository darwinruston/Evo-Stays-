"use client";

import { useState, useTransition } from "react";
import { useRevealForm } from "@/lib/useRevealForm";
import { button, card, inputCompact } from "@/lib/ui";

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const next = new Date(y, m - 1, d + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`;
}

// For moving a not-yet-started clean to another day without opening the full
// edit form -- mainly for when the same cleaner has two cleans on one day and
// one has been agreed for another. "Next day" is the one-tap version;
// "Pick a day" takes any date. The time of day is kept by the action.
export function RescheduleClean({
  action,
  currentDate,
  alsoThatDay,
  cleanerName,
}: {
  action: (formData: FormData) => Promise<void>;
  // YYYY-MM-DD the clean is on now, or null when it has no date yet.
  currentDate: string | null;
  // The other still-to-do cleans the same cleaner has that day, by property.
  alsoThatDay: string[];
  cleanerName: string | null;
}) {
  const { open, setOpen, error, pending, submit } = useRevealForm(action);
  const [nextError, setNextError] = useState<string | null>(null);
  const [movingNext, startNext] = useTransition();

  function moveToNextDay() {
    if (!currentDate) return;
    setNextError(null);
    startNext(async () => {
      try {
        const formData = new FormData();
        formData.set("date", addDays(currentDate, 1));
        await action(formData);
      } catch (err) {
        setNextError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className={card("flex flex-col gap-3 p-4")}>
      {alsoThatDay.length > 0 && (
        <p className="text-sm text-zinc-700">
          <span className="font-medium">{cleanerName ?? "The cleaner"} also has {alsoThatDay.join(", ")} that day.</span>{" "}
          Move one to another day if that was agreed.
        </p>
      )}

      {!open ? (
        <div className="flex flex-wrap items-center gap-2">
          {currentDate && (
            <button type="button" onClick={moveToNextDay} disabled={movingNext} className={button("secondary", "sm")}>
              {movingNext ? "Moving…" : "Move to next day"}
            </button>
          )}
          <button type="button" onClick={() => setOpen(true)} className={button("ghost", "sm")}>
            Pick a day…
          </button>
        </div>
      ) : (
        <form action={submit} className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="rescheduleDate" className="text-sm font-medium">
              Move to
            </label>
            <input
              id="rescheduleDate"
              name="date"
              type="date"
              required
              autoFocus
              defaultValue={currentDate ?? ""}
              className={`${inputCompact} w-44`}
            />
          </div>
          <button type="submit" disabled={pending} className={button("primary", "sm")}>
            {pending ? "Moving…" : "Move"}
          </button>
          <button type="button" onClick={() => setOpen(false)} className={button("ghost", "sm")}>
            Cancel
          </button>
        </form>
      )}

      {(error || nextError) && <p className="text-xs text-red-600">{error ?? nextError}</p>}
      <p className="text-xs text-zinc-500">
        Keeps the same time. The cleaner is told, and it&apos;s recorded in the activity below.
      </p>
    </div>
  );
}
