"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { ActionResult } from "@/lib/actionResult";
import { TASK_STATUSES, TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from "@/lib/tasks";
import { badge, card } from "@/lib/ui";
import { Avatar } from "@/components/Avatar";
import { TaskForm, type TaskFormValues } from "@/components/TaskForm";

export type TaskRowData = {
  id: string;
  title: string;
  description: string | null;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  status: "TODO" | "IN_PROGRESS" | "DONE";
  assignee: { id: string; name: string } | null;
  // Already formatted on the server ("12 Nov 25"), so no date logic here.
  dueLabel: string | null;
  overdue: boolean;
  property: { id: string; name: string } | null;
  createdByName: string | null;
  form: TaskFormValues;
  canDelete: boolean;
};

// One task in the list: tick it off, change its status, edit it in place or
// delete it (after a second click, so it can't be one stray tap).
export function TaskRow({
  task,
  staff,
  properties,
  setStatus,
  update,
  remove,
}: {
  task: TaskRowData;
  staff: { id: string; name: string }[];
  properties: { id: string; name: string }[];
  setStatus: (status: TaskRowData["status"]) => Promise<ActionResult>;
  update: (formData: FormData) => Promise<ActionResult>;
  remove: () => Promise<ActionResult>;
}) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const done = task.status === "DONE";

  function run(action: () => Promise<ActionResult>) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await action();
        if (result) setError(result.error);
      } catch {
        setError("Something went wrong.");
      }
      setConfirming(false);
    });
  }

  if (editing) {
    return (
      <li>
        <TaskForm
          action={update}
          initial={task.form}
          staff={staff}
          properties={properties}
          submitLabel="Save"
          onSaved={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className={card(`flex flex-col gap-2 p-4 ${done ? "opacity-70" : ""}`)}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => setStatus(done ? "TODO" : "DONE"))}
          aria-label={done ? "Reopen task" : "Mark task as done"}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
            done ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 hover:border-zinc-900"
          }`}
        >
          {done && (
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.4} className="h-3 w-3" aria-hidden="true">
              <path d="M4 10.5 8 14l8-8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <p className={`font-medium [overflow-wrap:anywhere] ${done ? "line-through" : ""}`}>{task.title}</p>
          {task.description && (
            <p className="mt-1 text-sm whitespace-pre-line text-zinc-600 [overflow-wrap:anywhere]">{task.description}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-zinc-500">
            <span className={badge(task.priority === "URGENT" ? "solid" : task.priority === "HIGH" ? "outline" : "neutral")}>
              {TASK_PRIORITY_LABELS[task.priority]}
            </span>
            {task.assignee ? (
              <span className="inline-flex items-center gap-1.5">
                <Avatar name={task.assignee.name} size={18} />
                {task.assignee.name}
              </span>
            ) : (
              <span>Nobody yet</span>
            )}
            {task.dueLabel && (
              <span className={task.overdue ? "font-medium text-zinc-900" : ""}>
                {task.overdue ? "Overdue, was due" : "Due"} {task.dueLabel}
              </span>
            )}
            {task.property && (
              <Link href={`/admin/properties/${task.property.id}`} className="underline underline-offset-2 hover:text-zinc-900">
                {task.property.name}
              </Link>
            )}
            {task.createdByName && <span>From {task.createdByName}</span>}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <select
            aria-label="Status"
            value={task.status}
            disabled={pending}
            onChange={(e) => run(() => setStatus(e.target.value as TaskRowData["status"]))}
            className="rounded-md border border-black/10 bg-surface px-2 py-1 text-base sm:text-xs"
          >
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {TASK_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-3 text-xs">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-zinc-500 underline decoration-dotted underline-offset-2 hover:text-zinc-900"
            >
              Edit
            </button>
            {task.canDelete &&
              (confirming ? (
                <span className="flex items-center gap-2">
                  <button type="button" disabled={pending} onClick={() => run(remove)} className="font-medium text-red-600 hover:underline">
                    Yes, delete
                  </button>
                  <button type="button" onClick={() => setConfirming(false)} className="text-zinc-500 hover:underline">
                    Cancel
                  </button>
                </span>
              ) : (
                <button type="button" onClick={() => setConfirming(true)} className="text-red-600 hover:underline">
                  Delete
                </button>
              ))}
          </div>
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </li>
  );
}
