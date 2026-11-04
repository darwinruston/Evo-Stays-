"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ActionResult } from "@/lib/actionResult";
import { TASK_PRIORITY_LABELS, TASK_STATUSES, TASK_STATUS_LABELS } from "@/lib/tasks";
import { badge, button, card } from "@/lib/ui";
import { Avatar } from "@/components/Avatar";
import { StatusMark } from "@/components/TaskRow";
import { TaskForm, type TaskFormValues } from "@/components/TaskForm";

type Status = "TODO" | "IN_PROGRESS" | "DONE";

export type TaskDetailData = {
  id: string;
  title: string;
  description: string | null;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  status: Status;
  assignee: { id: string; name: string } | null;
  // Already formatted on the server ("12 Nov 25").
  dueLabel: string | null;
  overdue: boolean;
  property: { id: string; name: string } | null;
  createdLine: string;
  completedLine: string | null;
  form: TaskFormValues;
  canDelete: boolean;
};

// The task's own page: everything about it, the button that completes it, and
// the controls to change or delete it. Delete asks a second time, so it can't
// be one stray tap.
export function TaskDetail({
  task,
  staff,
  properties,
  setStatus,
  update,
  remove,
}: {
  task: TaskDetailData;
  staff: { id: string; name: string }[];
  properties: { id: string; name: string }[];
  setStatus: (status: Status) => Promise<ActionResult>;
  update: (formData: FormData) => Promise<ActionResult>;
  remove: () => Promise<ActionResult>;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const done = task.status === "DONE";

  function run(action: () => Promise<ActionResult>, then?: () => void) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await action();
        if (result) {
          setError(result.error);
          return;
        }
        then?.();
      } catch {
        setError("Something went wrong.");
      }
      setConfirming(false);
    });
  }

  if (editing) {
    return (
      <div className="max-w-xl">
        <TaskForm
          action={update}
          initial={task.form}
          staff={staff}
          properties={properties}
          submitLabel="Save"
          onSaved={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div className={card("flex flex-col gap-5 p-5")}>
        <div className="flex items-start gap-3">
          <StatusMark status={task.status} />
          <div className="min-w-0 flex-1">
            <h1 className={`text-xl font-semibold tracking-tight [overflow-wrap:anywhere] ${done ? "line-through" : ""}`}>
              {task.title}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">{TASK_STATUS_LABELS[task.status]}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {done ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => setStatus("TODO"))}
              className={button("secondary", "md")}
            >
              Reopen task
            </button>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => setStatus("DONE"))}
              className={button("primary", "md")}
            >
              Mark as complete
            </button>
          )}
          {!done && (
            <label className="flex items-center gap-2 text-sm text-zinc-600">
              <span>Status</span>
              <select
                aria-label="Status"
                value={task.status}
                disabled={pending}
                onChange={(e) => run(() => setStatus(e.target.value as Status))}
                className="rounded-md border border-black/10 bg-surface px-2 py-1.5 text-base sm:text-sm"
              >
                {TASK_STATUSES.filter((s) => s !== "DONE").map((s) => (
                  <option key={s} value={s}>
                    {TASK_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        {task.completedLine && <p className="-mt-2 text-sm text-zinc-500">{task.completedLine}</p>}

        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <Detail label="Importance">
            <span className={badge(task.priority === "URGENT" ? "solid" : task.priority === "HIGH" ? "outline" : "neutral")}>
              {TASK_PRIORITY_LABELS[task.priority]}
            </span>
          </Detail>
          <Detail label="Assigned to">
            {task.assignee ? (
              <span className="inline-flex items-center gap-1.5">
                <Avatar name={task.assignee.name} size={20} />
                {task.assignee.name}
              </span>
            ) : (
              "Nobody yet"
            )}
          </Detail>
          <Detail label="Due">
            {task.dueLabel ? (
              <span className={task.overdue ? "font-medium" : ""}>
                {task.dueLabel}
                {task.overdue && " (overdue)"}
              </span>
            ) : (
              "No due date"
            )}
          </Detail>
          <Detail label="Property">
            {task.property ? (
              <Link href={`/admin/properties/${task.property.id}`} className="underline underline-offset-2 hover:text-zinc-600">
                {task.property.name}
              </Link>
            ) : (
              "Not about a property"
            )}
          </Detail>
        </dl>

        {task.description && (
          <div>
            <h2 className="text-xs font-medium tracking-wide text-zinc-500 uppercase">Notes</h2>
            <p className="mt-1 text-sm whitespace-pre-line [overflow-wrap:anywhere]">{task.description}</p>
          </div>
        )}

        <p className="text-xs text-zinc-500">{task.createdLine}</p>

        <div className="flex items-center gap-4 border-t border-black/5 pt-3 text-sm">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-zinc-600 underline decoration-dotted underline-offset-2 hover:text-zinc-900"
          >
            Edit
          </button>
          {task.canDelete &&
            (confirming ? (
              <span className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(remove, () => router.push("/admin/team/tasks"))}
                  className="font-medium text-red-600 hover:underline"
                >
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
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium tracking-wide text-zinc-500 uppercase">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
