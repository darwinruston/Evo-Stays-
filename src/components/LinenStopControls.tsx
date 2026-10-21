"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import type { ActionResult } from "@/lib/actionResult";
import { badge, button, inputCompact } from "@/lib/ui";

type Issue = { note: string; resolved: boolean; resolutionNote: string | null };

// The submit button reads the form's own pending state, so it says "Saving…"
// for exactly as long as the server action is running.
function SubmitButton({ idle, busy, variant = "primary" }: { idle: string; busy: string; variant?: "primary" | "secondary" }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={button(variant, "sm")}>
      {pending ? busy : idle}
    </button>
  );
}

// What the linen company can do at one stop: pick the exact time it'll
// arrive (within the window), or flag a problem for the office. The server
// checks everything again; the check here is only so a time outside the
// window is explained straight away instead of after a round trip.
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
  // "HH:MM" strings.
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
  const [timeMessage, setTimeMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [flagging, setFlagging] = useState(false);

  const openIssue = issue && !issue.resolved;
  const range =
    windowStart === windowEnd ? `The only time that works is ${windowStart}.` : `Choose a time between ${windowStart} and ${windowEnd}.`;

  async function saveTime(formData: FormData) {
    setTimeMessage(null);
    const value = String(formData.get("arrivalTime") ?? "");
    if (!value) {
      setTimeMessage({ ok: false, text: "Enter the time you'll arrive." });
      return;
    }
    // HH:MM strings compare correctly as text.
    if (value < windowStart || value > windowEnd) {
      setTimeMessage({ ok: false, text: range });
      return;
    }
    try {
      const result = await setArrival(formData);
      setTimeMessage(result ? { ok: false, text: result.error } : { ok: true, text: "Saved" });
    } catch {
      setTimeMessage({ ok: false, text: "Couldn't save. Try again." });
    }
  }

  async function useSuggested() {
    setTimeMessage(null);
    try {
      const result = await clearArrival();
      setTimeMessage(result ? { ok: false, text: result.error } : { ok: true, text: "Back to the suggested time" });
    } catch {
      setTimeMessage({ ok: false, text: "Couldn't save. Try again." });
    }
  }

  async function sendIssue(formData: FormData) {
    setIssueError(null);
    try {
      const result = await flagIssue(formData);
      if (result) setIssueError(result.error);
      else setFlagging(false);
    } catch {
      setIssueError("Couldn't send. Try again.");
    }
  }

  return (
    <div className="flex flex-col gap-3 border-t border-black/5 pt-3">
      {/* Remounted when the saved time changes so the box always shows what's
          actually saved, not what was last typed into it. */}
      <form key={chosen ?? `suggested-${suggested}`} action={saveTime} className="flex flex-col gap-1.5">
        <label htmlFor="arrivalTime" className="text-xs font-medium text-zinc-600">
          {chosen ? "Your arrival time" : "Pick your arrival time"}
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id="arrivalTime"
            name="arrivalTime"
            type="time"
            required
            defaultValue={chosen ?? suggested}
            className={`${inputCompact} w-32`}
          />
          <SubmitButton idle={chosen ? "Update" : "Set time"} busy="Saving…" variant={chosen ? "secondary" : "primary"} />
          {chosen && (
            <button type="button" onClick={useSuggested} className={button("ghost", "sm")}>
              Use suggested
            </button>
          )}
          {timeMessage && (
            <span className={`text-xs ${timeMessage.ok ? "text-zinc-600" : "text-red-600"}`} role={timeMessage.ok ? "status" : "alert"}>
              {timeMessage.text}
            </span>
          )}
        </div>
        {stale && (
          <p className="text-xs text-zinc-600">
            Your earlier time no longer fits because the cleaner&apos;s time changed. Pick a new one.
          </p>
        )}
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
          <form action={sendIssue} className="flex flex-col gap-2">
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
              <SubmitButton idle="Tell the office" busy="Sending…" />
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
