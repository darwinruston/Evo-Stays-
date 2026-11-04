"use client";

import { useId, useState, useTransition } from "react";
import { useRevealForm } from "@/lib/useRevealForm";
import type { ActionResult } from "@/lib/actionResult";
import { badge, button, card, inputCompact } from "@/lib/ui";

export type SafetyCheckCardProps = {
  title: string;
  what: string | null;
  // Already worked out on the server, so the card holds no date logic.
  statusLabel: string;
  attention: boolean;
  notNeeded: boolean;
  lastDone: string | null;
  nextDue: string | null;
  repeats: string;
  intervalMonths: number;
  note: string | null;
  today: string;
  save: (formData: FormData) => Promise<ActionResult>;
  setApplicable: (applicable: boolean) => Promise<ActionResult>;
  // Present only for a check the manager added themselves.
  remove?: () => Promise<ActionResult>;
};

export function SafetyCheckCard(props: SafetyCheckCardProps) {
  const { open, setOpen, error, pending, submit } = useRevealForm(props.save);
  const uid = useId();
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [toggling, startToggle] = useTransition();

  function run(action: () => Promise<ActionResult>) {
    setToggleError(null);
    startToggle(async () => {
      try {
        const result = await action();
        if (result) setToggleError(result.error);
      } catch {
        setToggleError("Something went wrong.");
      }
    });
  }

  return (
    <li className={card(`flex flex-col gap-3 p-4 ${props.notNeeded ? "opacity-70" : ""}`)}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h3 className="font-medium">{props.title}</h3>
          {props.what && <p className="mt-0.5 text-sm text-zinc-500">{props.what}</p>}
        </div>
        <span className={badge(props.attention ? "solid" : "neutral")}>{props.statusLabel}</span>
      </div>

      {!props.notNeeded && (
        <p className="text-sm text-zinc-600">
          {props.lastDone ? `Last done ${props.lastDone}` : "No date recorded yet"}
          {props.nextDue && ` · next due ${props.nextDue}`}
          {` · repeats ${props.repeats}`}
        </p>
      )}
      {props.note && !props.notNeeded && <p className="text-sm text-zinc-500 [overflow-wrap:anywhere]">{props.note}</p>}

      {open ? (
        <form action={submit} className="flex flex-wrap items-end gap-3 rounded-lg bg-black/[0.03] p-3">
          <div className="flex flex-col gap-1">
            <label htmlFor={`${uid}-done`} className="text-xs text-zinc-500">
              Date it was done
            </label>
            <input
              id={`${uid}-done`}
              name="completedOn"
              type="date"
              max={props.today}
              autoFocus
              className={`${inputCompact} w-40`}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${uid}-months`} className="text-xs text-zinc-500">
              Repeats every (months)
            </label>
            <input
              id={`${uid}-months`}
              name="intervalMonths"
              type="number"
              min={1}
              max={240}
              defaultValue={props.intervalMonths}
              className={`${inputCompact} w-28`}
            />
          </div>
          <div className="flex min-w-48 flex-1 flex-col gap-1">
            <label htmlFor={`${uid}-note`} className="text-xs text-zinc-500">
              Note (optional)
            </label>
            <input
              id={`${uid}-note`}
              name="note"
              type="text"
              maxLength={300}
              defaultValue={props.note ?? ""}
              placeholder="Engineer, certificate number…"
              className={inputCompact}
            />
          </div>
          <button type="submit" disabled={pending} className={button("primary", "sm")}>
            {pending ? "Saving…" : "Save"}
          </button>
          <button type="button" onClick={() => setOpen(false)} className={button("ghost", "sm")}>
            Cancel
          </button>
          <p className="w-full text-xs text-zinc-500">
            Leave the date empty to change only how often it repeats.
          </p>
          {error && <p className="w-full text-xs text-red-600">{error}</p>}
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {props.notNeeded ? (
            <button
              type="button"
              disabled={toggling}
              onClick={() => run(() => props.setApplicable(true))}
              className={button("secondary", "sm")}
            >
              Needed here after all
            </button>
          ) : (
            <>
              <button type="button" onClick={() => setOpen(true)} className={button("secondary", "sm")}>
                {props.lastDone ? "Record it done again" : "Record when it was done"}
              </button>
              {props.remove ? (
                <button
                  type="button"
                  disabled={toggling}
                  onClick={() => {
                    if (window.confirm(`Remove "${props.title}" from this property?`)) run(props.remove!);
                  }}
                  className={button("ghost", "sm")}
                >
                  Remove
                </button>
              ) : (
                <button
                  type="button"
                  disabled={toggling}
                  onClick={() => run(() => props.setApplicable(false))}
                  className={button("ghost", "sm")}
                >
                  Not needed here
                </button>
              )}
            </>
          )}
        </div>
      )}
      {toggleError && <p className="text-xs text-red-600">{toggleError}</p>}
    </li>
  );
}

// "+ Add another check", for anything specific to the property that the
// standard list doesn't cover: a hot tub water test, a pool inspection.
export function AddSafetyCheckForm({
  action,
  today,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  today: string;
}) {
  const { open, setOpen, error, pending, submit } = useRevealForm(action);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={`${button("secondary", "sm")} self-start`}>
        + Add another check
      </button>
    );
  }

  return (
    <form action={submit} className={card("flex flex-wrap items-end gap-3 p-4")}>
      <div className="flex min-w-48 flex-1 flex-col gap-1.5">
        <label htmlFor="safety-title" className="text-sm font-medium">
          What is it?
        </label>
        <input
          id="safety-title"
          name="title"
          type="text"
          required
          autoFocus
          maxLength={80}
          placeholder="e.g. Hot tub water test"
          className={inputCompact}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="safety-months" className="text-sm font-medium">
          Repeats every (months)
        </label>
        <input
          id="safety-months"
          name="intervalMonths"
          type="number"
          required
          min={1}
          max={240}
          defaultValue={12}
          className={`${inputCompact} w-28`}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="safety-done" className="text-sm font-medium">
          Last done (optional)
        </label>
        <input id="safety-done" name="completedOn" type="date" max={today} className={`${inputCompact} w-40`} />
      </div>
      <button type="submit" disabled={pending} className={button("primary", "sm")}>
        {pending ? "Adding…" : "Add"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className={button("ghost", "sm")}>
        Cancel
      </button>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </form>
  );
}
