"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { ActionResult } from "@/lib/actionResult";
import { SUBTASK_TITLE_MAX, taskHref } from "@/lib/tasks";
import { button, card, inputCompact } from "@/lib/ui";
import { TaskAssignees } from "@/components/TaskAssignees";

export type SubtaskItem = {
  id: string;
  title: string;
  done: boolean;
  // Already formatted on the server ("12 Nov 25").
  dueLabel: string | null;
  overdue: boolean;
  assignees: { id: string; name: string }[];
  commentCount: number;
  canRemove: boolean;
};

// The subtasks of a task. Each is a task in its own right: tick it off here,
// or open it for its due date, notes, people and updates. Add more below (one
// per line, so a whole list can be pasted in at once). Progress shows as
// "3 of 7 done" with a bar. Nothing here completes the main task itself: that
// stays a deliberate click on the task.
export function SubtaskList({
  items,
  taskDone,
  add,
  setStatus,
  remove,
}: {
  items: SubtaskItem[];
  taskDone: boolean;
  add: (formData: FormData) => Promise<ActionResult>;
  setStatus: (id: string, status: "TODO" | "DONE") => Promise<ActionResult>;
  remove: (id: string) => Promise<ActionResult>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  // The box for new subtasks only opens when asked for, so it does not look
  // like the updates box below it.
  const [adding, setAdding] = useState(false);

  const total = items.length;
  const doneCount = items.filter((i) => i.done).length;

  function run(id: string | null, action: () => Promise<ActionResult>, onOk?: () => void) {
    setError(null);
    setBusyId(id);
    startTransition(async () => {
      try {
        const result = await action();
        if (result) setError(result.error);
        else onOk?.();
      } catch {
        setError("Something went wrong.");
      }
      setBusyId(null);
      setConfirmingId(null);
    });
  }

  return (
    <section aria-labelledby="subtasks-heading" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="subtasks-heading" className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
          Subtasks
        </h2>
        {total > 0 && (
          <span className="text-xs text-zinc-500">
            {doneCount} of {total} done
          </span>
        )}
      </div>

      {total > 0 && (
        <div
          role="progressbar"
          aria-label="Subtasks done"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={doneCount}
          className="h-1.5 overflow-hidden rounded-full bg-black/[0.07]"
        >
          <div className="h-full rounded-full bg-zinc-900 transition-all" style={{ width: `${(doneCount / total) * 100}%` }} />
        </div>
      )}

      <div className={card("ring-1 ring-black/[0.04]")}>
        {total > 0 && (
          <ul className="divide-y divide-black/5">
            {items.map((item) => (
              <li key={item.id} className="flex items-start gap-3 px-4 py-3">
                <button
                  type="button"
                  disabled={pending && busyId === item.id}
                  onClick={() => run(item.id, () => setStatus(item.id, item.done ? "TODO" : "DONE"))}
                  aria-label={item.done ? `Mark "${item.title}" as not done` : `Mark "${item.title}" as done`}
                  aria-pressed={item.done}
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                    item.done ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 hover:border-zinc-900"
                  }`}
                >
                  {item.done && (
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.4} className="h-3 w-3" aria-hidden="true">
                      <path d="M4 10.5 8 14l8-8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <Link
                    href={taskHref(item.id)}
                    className={`text-sm hover:underline [overflow-wrap:anywhere] ${
                      item.done ? "text-zinc-500 line-through decoration-zinc-300" : ""
                    }`}
                  >
                    {item.title}
                  </Link>
                  {(item.dueLabel || item.assignees.length > 0 || item.commentCount > 0) && (
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                      {item.dueLabel && (
                        <span className={item.overdue && !item.done ? "font-medium text-zinc-900" : ""}>
                          {item.overdue && !item.done ? "Overdue, was due" : "Due"} {item.dueLabel}
                        </span>
                      )}
                      {item.assignees.length > 0 && (
                        <TaskAssignees people={item.assignees} wholeTeam={false} layout="inline" />
                      )}
                      {item.commentCount > 0 && (
                        <span>
                          {item.commentCount} {item.commentCount === 1 ? "update" : "updates"}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {confirmingId === item.id ? (
                  <span className="flex shrink-0 items-center gap-3 text-xs">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(item.id, () => remove(item.id))}
                      className="font-medium text-red-600 hover:underline"
                    >
                      Yes, remove
                    </button>
                    <button type="button" onClick={() => setConfirmingId(null)} className="text-zinc-500 hover:underline">
                      Cancel
                    </button>
                  </span>
                ) : (
                  <div className="flex shrink-0 items-center gap-3 text-xs">
                    <Link href={taskHref(item.id)} className="text-zinc-500 hover:text-zinc-900">
                      Open
                    </Link>
                    {item.canRemove && (
                      <button
                        type="button"
                        onClick={() => setConfirmingId(item.id)}
                        aria-label={`Remove "${item.title}"`}
                        className="text-zinc-400 hover:text-red-600"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {adding ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              run(null, () => add(formData), () => setAdding(false));
            }}
            className={`flex flex-col gap-3 p-4 ${total > 0 ? "border-t border-black/5" : ""}`}
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor="subtask-titles" className="text-sm font-medium">
                What are the subtasks?
              </label>
              <textarea
                id="subtask-titles"
                name="titles"
                rows={3}
                autoFocus
                required
                maxLength={SUBTASK_TITLE_MAX * 20}
                placeholder={"Collect the key safe code\nTake cover photos"}
                className={inputCompact}
              />
              <p className="text-xs text-zinc-500">One per line, so you can paste a whole list. You can add dates and notes to each afterwards.</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="submit" disabled={pending && busyId === null} className={button("primary", "sm")}>
                {pending && busyId === null ? "Adding…" : "Add subtasks"}
              </button>
              <button type="button" onClick={() => setAdding(false)} className={button("ghost", "sm")}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className={`flex items-center justify-between gap-3 px-4 py-3 ${total > 0 ? "border-t border-black/5" : ""}`}>
            {total === 0 && <p className="text-sm text-zinc-500">No subtasks yet.</p>}
            <button type="button" onClick={() => setAdding(true)} className={`${button("secondary", "sm")} ${total === 0 ? "" : "self-start"}`}>
              + Add subtask
            </button>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {total > 0 && doneCount === total && !taskDone && (
        <p className="text-sm text-zinc-600">Every subtask is done. Mark the task as complete when you are ready.</p>
      )}
    </section>
  );
}
