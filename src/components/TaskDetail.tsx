"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ActionResult } from "@/lib/actionResult";
import { TASK_PRIORITY_LABELS, TASK_STATUSES, TASK_STATUS_LABELS } from "@/lib/tasks";
import { badge, button, card } from "@/lib/ui";
import { Avatar } from "@/components/Avatar";
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

const PANEL = "ring-1 ring-black/[0.04]";

// The task's own page. The title and the button that completes it come first,
// then the notes and the updates (passed in as children, because they are
// plain server-rendered content); the facts about the task sit in a panel
// beside them on a wide screen and between the two on a phone. Delete asks a
// second time, so it can't be one stray tap.
export function TaskDetail({
  task,
  staff,
  properties,
  setStatus,
  update,
  remove,
  children,
}: {
  task: TaskDetailData;
  staff: { id: string; name: string }[];
  properties: { id: string; name: string }[];
  setStatus: (status: Status) => Promise<ActionResult>;
  update: (formData: FormData) => Promise<ActionResult>;
  remove: () => Promise<ActionResult>;
  children: React.ReactNode;
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
    <div className="grid gap-x-8 gap-y-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      {/* Title and the main action */}
      <header className="flex flex-col gap-5 lg:col-start-1">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={badge(done ? "solid" : task.status === "IN_PROGRESS" ? "outline" : "neutral")}>
              {TASK_STATUS_LABELS[task.status]}
            </span>
            {task.overdue && <span className={badge("outline")}>Overdue</span>}
          </div>
          <h1
            className={`text-2xl font-semibold tracking-tight [overflow-wrap:anywhere] sm:text-3xl ${
              done ? "text-zinc-500 line-through decoration-zinc-300" : ""
            }`}
          >
            {task.title}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {done ? (
            <button type="button" disabled={pending} onClick={() => run(() => setStatus("TODO"))} className={button("secondary", "md")}>
              Reopen task
            </button>
          ) : (
            <button type="button" disabled={pending} onClick={() => run(() => setStatus("DONE"))} className={button("primary", "md")}>
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-4 w-4" aria-hidden="true">
                <path d="M4 10.5 8 14l8-8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Mark as complete
            </button>
          )}
          <button type="button" onClick={() => setEditing(true)} className={button("secondary", "md")}>
            Edit task
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </header>

      {/* The facts about the task */}
      <aside className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <div className={card(`${PANEL} p-5`)}>
          <h2 className="text-xs font-medium tracking-wide text-zinc-500 uppercase">Details</h2>
          <dl className="mt-2 divide-y divide-black/5 text-sm">
            <Row label="Status">
              {done ? (
                TASK_STATUS_LABELS.DONE
              ) : (
                <select
                  aria-label="Status"
                  value={task.status}
                  disabled={pending}
                  onChange={(e) => run(() => setStatus(e.target.value as Status))}
                  className="-mr-2 rounded-md border border-transparent bg-transparent py-1 pr-1 pl-2 text-right text-base font-medium hover:border-black/10 sm:text-sm"
                >
                  {TASK_STATUSES.filter((s) => s !== "DONE").map((s) => (
                    <option key={s} value={s}>
                      {TASK_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              )}
            </Row>
            <Row label="Importance">
              <span className={badge(task.priority === "URGENT" ? "solid" : task.priority === "HIGH" ? "outline" : "neutral")}>
                {TASK_PRIORITY_LABELS[task.priority]}
              </span>
            </Row>
            <Row label="Assigned to">
              {task.assignee ? (
                <span className="inline-flex items-center gap-2">
                  <Avatar name={task.assignee.name} size={22} />
                  {task.assignee.name}
                </span>
              ) : (
                <span className="font-normal text-zinc-500">Nobody yet</span>
              )}
            </Row>
            <Row label="Due">
              {task.dueLabel ? (
                <span>
                  {task.dueLabel}
                  {task.overdue && <span className="ml-1.5 font-normal text-zinc-500">overdue</span>}
                </span>
              ) : (
                <span className="font-normal text-zinc-500">No due date</span>
              )}
            </Row>
            <Row label="Property">
              {task.property ? (
                <Link href={`/admin/properties/${task.property.id}`} className="underline decoration-black/20 underline-offset-2 hover:decoration-black">
                  {task.property.name}
                </Link>
              ) : (
                <span className="font-normal text-zinc-500">None</span>
              )}
            </Row>
          </dl>

          <div className="mt-2 flex flex-col gap-1 border-t border-black/5 pt-4 text-xs text-zinc-500">
            <p>{task.createdLine}</p>
            {task.completedLine && <p>{task.completedLine}</p>}
          </div>

          {task.canDelete && (
            <div className="mt-4 text-xs">
              {confirming ? (
                <span className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(remove, () => router.push("/admin/team/tasks"))}
                    className="font-medium text-red-600 hover:underline"
                  >
                    Yes, delete this task
                  </button>
                  <button type="button" onClick={() => setConfirming(false)} className="text-zinc-500 hover:underline">
                    Cancel
                  </button>
                </span>
              ) : (
                <button type="button" onClick={() => setConfirming(true)} className="text-zinc-500 hover:text-red-600">
                  Delete task
                </button>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Notes, then the updates */}
      <div className="flex flex-col gap-8 lg:col-start-1">
        {task.description && (
          <section aria-labelledby="notes-heading">
            <h2 id="notes-heading" className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
              Task info
            </h2>
            <div className={card(`${PANEL} mt-2 p-5`)}>
              <p className="text-[15px] leading-relaxed whitespace-pre-line [overflow-wrap:anywhere]">{task.description}</p>
            </div>
          </section>
        )}
        {children}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-4 py-2">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}
