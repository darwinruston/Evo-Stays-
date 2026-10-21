"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/lib/actionResult";
import { badge, button, inputCompact } from "@/lib/ui";

type Issue = { note: string; resolved: boolean; resolutionNote: string | null };

// What the linen company can do at one stop: pick the exact time it'll
// arrive (within the window), or flag a problem for the office. The server
// re-checks everything, so the min/max on the time box is only a courtesy.
export function LinenStopControls({
  windowStart,
  windowEnd,
  suggested,
  chosen,
  stale,
  issue,
  setArrival,
  clearArrival,
  flagIssue,
}: {
  // "HH:MM" strings for the time box and the wording around it.
  windowStart: string;
  windowEnd: string;
  suggested: string;
  chosen: string | null;
  // They chose a time but the window has since moved and it no longer fits.
  stale: boolean;
  issue: Issue | null;
  setArrival: (formData: FormData) => Promise<ActionResult>;
  clearArrival: () => Promise<ActionResult>;
  flagIssue: (formData: FormData) => Promise<ActionResult>;
}) {
  const [timeError, setTimeError] = useState<string | null>(null);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [flagging, setFlagging] = useState(false);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<ActionResult>, onError: (message: string) => void, onDone?: () => void) {
    startTransition(async () => {
      try {
        const result = await action();
        if (result) onError(result.error);
        else onDone?.();
      } catch {
        onError("Something went wrong. Try again.");
      }
    });
  }

  const onlyOneTime = windowStart === windowEnd;
  const openIssue = issue && !issue.resolved;

  return (
    <div className="flex flex-col gap-3 border-t border-black/5 pt-3">
      <form
        action={(formData) => {
          setTimeError(null);
          run(() => setArrival(formData), setTimeError);
        }}
        className="flex flex-col gap-1.5"
      >
        <label htmlFor="arrivalTime" className="text-xs font-medium text-zinc-600">
          {chosen ? "You're arriving at" : "Pick your arrival time"}
        </label>
        <div className="flex items-center gap-2">
          <input
            id="arrivalTime"
            name="arrivalTime"
            type="time"
            required
            min={windowStart}
            max={windowEnd}
            defaultValue={chosen ?? suggested}
            className={`${inputCompact} w-32`}
          />
          <button type="submit" disabled={pending} className={button(chosen ? "secondary" : "primary", "sm")}>
            {chosen ? "Update" : "Set time"}
          </button>
          {chosen && (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setTimeError(null);
                run(clearArrival, setTimeError);
              }}
              className={button("ghost", "sm")}
            >
              Use suggested
            </button>
          )}
        </div>
        <p className="text-xs text-zinc-500">
          {onlyOneTime ? `The only time that works is ${windowStart}.` : `Any time from ${windowStart} to ${windowEnd}.`}
        </p>
        {stale && (
          <p className="text-xs font-medium text-zinc-700">
            The time you chose no longer fits (the cleaner&apos;s time has changed), so the suggested time is being
            used. Pick a new one if you like.
          </p>
        )}
        {timeError && <p className="text-xs text-red-600">{timeError}</p>}
      </form>

      {issue && (
        <div className="flex flex-col gap-1 rounded-lg bg-black/[0.04] p-3 text-sm">
          <p className="flex items-center gap-2 font-medium">
            {issue.resolved ? "Problem resolved" : "Problem flagged"}
            <span className={badge(issue.resolved ? "neutral" : "solid")}>{issue.resolved ? "Resolved" : "Office told"}</span>
          </p>
          <p className="text-zinc-600">You said: {issue.note}</p>
          {issue.resolved && issue.resolutionNote && <p className="text-zinc-600">Office: {issue.resolutionNote}</p>}
        </div>
      )}

      {!openIssue &&
        (flagging ? (
          <form
            action={(formData) => {
              setIssueError(null);
              run(() => flagIssue(formData), setIssueError, () => setFlagging(false));
            }}
            className="flex flex-col gap-2"
          >
            <label htmlFor="note" className="text-xs font-medium text-zinc-600">
              What&apos;s the problem?
            </label>
            <textarea
              id="note"
              name="note"
              rows={3}
              required
              maxLength={500}
              placeholder="e.g. Van off the road, can't reach this one before 12."
              className={inputCompact}
            />
            {issueError && <p className="text-xs text-red-600">{issueError}</p>}
            <div className="flex items-center gap-2">
              <button type="submit" disabled={pending} className={button("primary", "sm")}>
                {pending ? "Sending…" : "Tell the office"}
              </button>
              <button type="button" onClick={() => setFlagging(false)} className={button("ghost", "sm")}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setFlagging(true)}
            className="w-fit text-sm text-zinc-500 underline underline-offset-2 hover:text-zinc-900"
          >
            {issue?.resolved ? "Flag another problem" : "Flag a problem"}
          </button>
        ))}
    </div>
  );
}
