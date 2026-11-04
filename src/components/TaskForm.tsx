"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/lib/actionResult";
import { TASK_NOTES_MAX, TASK_PRIORITIES, TASK_PRIORITY_LABELS, TASK_TITLE_MAX } from "@/lib/tasks";
import { button, card, inputCompact } from "@/lib/ui";

export type TaskFormValues = {
  title: string;
  description: string;
  priority: string;
  assignedToId: string;
  dueOn: string;
  propertyId: string;
};

export const EMPTY_TASK: TaskFormValues = {
  title: "",
  description: "",
  priority: "NORMAL",
  assignedToId: "",
  dueOn: "",
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
    <form action={submit} className={card("flex flex-col gap-3 p-4")}>
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
        <div className="flex flex-col gap-1.5">
          <label htmlFor="task-assignee" className="text-sm font-medium">
            Assign to
          </label>
          <select id="task-assignee" name="assignedToId" defaultValue={initial.assignedToId} className={inputCompact}>
            <option value="">Nobody yet</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
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

// "+ New task", opening the form in place and closing it once saved.
export function NewTask({
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

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={button("primary", "sm")}>
        + New task
      </button>
    );
  }
  return (
    <div className="max-w-xl">
      <TaskForm
        action={action}
        initial={{ ...EMPTY_TASK, assignedToId: defaultAssigneeId }}
        staff={staff}
        properties={properties}
        submitLabel="Add task"
        onSaved={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}
