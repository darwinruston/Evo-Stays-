"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/lib/actionResult";
import { TASK_NOTES_MAX, TASK_PRIORITIES, TASK_PRIORITY_LABELS, TASK_TITLE_MAX } from "@/lib/tasks";
import { TASK_REPEATS, TASK_REPEAT_LABELS } from "@/lib/taskRepeat";
import { button, card, inputCompact } from "@/lib/ui";

export type TaskFormValues = {
  title: string;
  description: string;
  priority: string;
  assigneeIds: string[];
  dueOn: string;
  repeat: string;
  propertyId: string;
};

export const EMPTY_TASK: TaskFormValues = {
  title: "",
  description: "",
  priority: "NORMAL",
  assigneeIds: [],
  dueOn: "",
  repeat: "",
  propertyId: "",
};

// One form for making a task and for editing one: the same six fields either
// way. Shows the reason when the server turns the save down, and leaves the
// form open so nothing typed is lost.
export function TaskForm({
  action,
  initial = EMPTY_TASK,
  staff,
  properties,
  submitLabel,
  onSaved,
  onCancel,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  initial?: TaskFormValues;
  staff: { id: string; name: string }[];
  properties: { id: string; name: string }[];
  submitLabel: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Who it is with. Only ticked people are sent, as repeated "assigneeIds".
  const [picked, setPicked] = useState<Set<string>>(() => new Set(initial.assigneeIds));
  const everyone = staff.length > 0 && picked.size === staff.length;

  function toggle(id: string) {
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await action(formData);
        if (result) {
          setError(result.error);
          return;
        }
        onSaved();
      } catch {
        setError("Something went wrong.");
      }
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(new FormData(e.currentTarget));
      }}
      className={card("flex flex-col gap-3 p-4")}
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="task-title" className="text-sm font-medium">
          What needs doing?
        </label>
        <input
          id="task-title"
          name="title"
          required
          autoFocus
          maxLength={TASK_TITLE_MAX}
          defaultValue={initial.title}
          placeholder="e.g. Replace the broken gate latch at Riverside Loft"
          className={inputCompact}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="task-notes" className="text-sm font-medium">
          Notes (optional)
        </label>
        <textarea
          id="task-notes"
          name="description"
          rows={3}
          maxLength={TASK_NOTES_MAX}
          defaultValue={initial.description}
          className={inputCompact}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div role="group" aria-labelledby="task-assignees-label" className="flex flex-col gap-2 sm:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <span id="task-assignees-label" className="text-sm font-medium">
              Assign to
            </span>
            {staff.length > 1 && (
              <button
                type="button"
                onClick={() => setPicked(everyone ? new Set() : new Set(staff.map((s) => s.id)))}
                className="text-xs text-zinc-600 underline decoration-dotted underline-offset-2 hover:text-zinc-900"
              >
                {everyone ? "Clear" : "Whole team"}
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {staff.map((s) => (
              <label key={s.id} className="cursor-pointer">
                <input
                  type="checkbox"
                  name="assigneeIds"
                  value={s.id}
                  checked={picked.has(s.id)}
                  onChange={() => toggle(s.id)}
                  className="peer sr-only"
                />
                <span className="inline-flex items-center rounded-full border border-black/10 bg-surface px-3 py-1.5 text-sm transition-colors hover:border-zinc-400 peer-checked:border-zinc-900 peer-checked:bg-zinc-900 peer-checked:text-white peer-focus-visible:ring-4 peer-focus-visible:ring-black/10">
                  {s.name}
                </span>
              </label>
            ))}
          </div>
          <p className="text-xs text-zinc-500">
            {picked.size === 0
              ? "Nobody ticked: it stays unassigned."
              : "Everyone ticked, apart from you, is told."}
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="task-priority" className="text-sm font-medium">
            Importance
          </label>
          <select id="task-priority" name="priority" defaultValue={initial.priority} className={inputCompact}>
            {TASK_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {TASK_PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="task-due" className="text-sm font-medium">
            Due (optional)
          </label>
          <input id="task-due" name="dueOn" type="date" defaultValue={initial.dueOn} className={inputCompact} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="task-repeat" className="text-sm font-medium">
            Repeats
          </label>
          <select id="task-repeat" name="repeat" defaultValue={initial.repeat} className={inputCompact}>
            <option value="">Does not repeat</option>
            {TASK_REPEATS.map((r) => (
              <option key={r} value={r}>
                {TASK_REPEAT_LABELS[r]}
              </option>
            ))}
          </select>
          <p className="text-xs text-zinc-500">Needs a due date. Finishing it makes the next one.</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="task-property" className="text-sm font-medium">
            Property (optional)
          </label>
          <select id="task-property" name="propertyId" defaultValue={initial.propertyId} className={inputCompact}>
            <option value="">Not about a property</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex items-center gap-2">
        <button type="submit" disabled={pending} className={button("primary", "sm")}>
          {pending ? "Saving…" : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className={button("ghost", "sm")}>
          Cancel
        </button>
      </div>
    </form>
  );
}

// The heading of the Tasks page with the "+ New task" button beside it. The
// form opens underneath, full width of the heading, and closes once saved.
export function TasksHeader({
  action,
  staff,
  properties,
  defaultAssigneeId,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  staff: { id: string; name: string }[];
  properties: { id: string; name: string }[];
  defaultAssigneeId: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Tasks</h1>
          <p className="mt-1.5 max-w-xl text-sm text-zinc-500">
            Work for the team that isn&apos;t a clean. Give it to one person or the whole team, say how important it
            is, and open it to add updates and mark it complete.
          </p>
        </div>
        {!open && (
          <button type="button" onClick={() => setOpen(true)} className={button("primary", "md")}>
            + New task
          </button>
        )}
      </div>
      {open && (
        <div className="max-w-2xl">
          <TaskForm
            action={action}
            initial={{ ...EMPTY_TASK, assigneeIds: defaultAssigneeId ? [defaultAssigneeId] : [] }}
            staff={staff}
            properties={properties}
            submitLabel="Add task"
            onSaved={() => setOpen(false)}
            onCancel={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
