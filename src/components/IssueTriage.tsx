"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ActionResult } from "@/lib/actionResult";
import { ISSUE_DESCRIPTION_MAX } from "@/lib/issues";
import { button, card, inputCompact } from "@/lib/ui";
import { TaskForm, type TaskFormValues } from "@/components/TaskForm";
import { InfoTooltip } from "@/components/InfoTooltip";

// What to do with a reported problem that is still open: hand it to the team
// as a task, or close it. Either way it leaves the open list, so Issues stays
// a place where reports arrive and are dealt with, not somewhere work is
// tracked for weeks.
export function IssueTriage({
  moveToTask,
  close,
  taskDefaults,
  staff,
  property,
}: {
  moveToTask: (formData: FormData) => Promise<{ error: string } | { taskId: string }>;
  close: (formData: FormData) => Promise<ActionResult>;
  taskDefaults: TaskFormValues;
  staff: { id: string; name: string }[];
  property: { id: string; name: string };
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"task" | "close" | null>(null);

  // On success, go to the new task: the work lives there now.
  async function makeTask(formData: FormData): Promise<ActionResult> {
    const result = await moveToTask(formData);
    if ("error" in result) return result;
    router.push(`/admin/team/tasks/${result.taskId}`);
  }

  return (
    <section className={card("flex flex-col gap-4 p-5 ring-1 ring-black/[0.04]")} aria-labelledby="triage-heading">
      <div>
        <h2 id="triage-heading" className="flex items-center gap-2 text-base font-semibold">
          What should happen with this?
          <InfoTooltip text="Turn it into a task for the team to do, or close it if nothing more is needed. Either way it leaves the open issues." />
        </h2>
      </div>

      {mode === null && (
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => setMode("task")} className={button("primary", "md")}>
            Turn into a task
          </button>
          <button type="button" onClick={() => setMode("close")} className={button("secondary", "md")}>
            Close issue
          </button>
        </div>
      )}

      {mode === "task" && (
        <TaskForm
          action={makeTask}
          initial={taskDefaults}
          staff={staff}
          properties={[property]}
          submitLabel="Make the task"
          onSaved={() => setMode(null)}
          onCancel={() => setMode(null)}
        />
      )}

      {mode === "close" && <CloseForm close={close} onDone={() => setMode(null)} />}
    </section>
  );
}

function CloseForm({ close, onDone }: { close: (formData: FormData) => Promise<ActionResult>; onDone: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await close(formData);
        if (result) {
          setError(result.error);
          return;
        }
        onDone();
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
      className="flex flex-col gap-3"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="close-note" className="text-sm font-medium">
          Why is it being closed? <span className="font-normal text-zinc-500">(optional)</span>
        </label>
        <textarea
          id="close-note"
          name="note"
          rows={3}
          autoFocus
          maxLength={ISSUE_DESCRIPTION_MAX}
          placeholder="e.g. Already fixed on the day, or a duplicate of another report."
          className={inputCompact}
        />
        <p className="text-xs text-zinc-500">Whoever reported it is told, with this note.</p>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex items-center gap-2">
        <button type="submit" disabled={pending} className={button("primary", "sm")}>
          {pending ? "Closing…" : "Close issue"}
        </button>
        <button type="button" onClick={onDone} className={button("ghost", "sm")}>
          Cancel
        </button>
      </div>
    </form>
  );
}
