"use client";

import { useRef, useState, useTransition } from "react";
import type { ActionResult } from "@/lib/actionResult";
import { TASK_COMMENT_MAX } from "@/lib/tasks";
import { button, card, inputCompact } from "@/lib/ui";

// Adds an update to a task. Clears itself once saved, and keeps what was typed
// if the server turns it down.
export function TaskCommentForm({ action }: { action: (formData: FormData) => Promise<ActionResult> }) {
  const formRef = useRef<HTMLFormElement>(null);
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
        formRef.current?.reset();
      } catch {
        setError("Something went wrong.");
      }
    });
  }

  return (
    <form ref={formRef} action={submit} className={card("flex flex-col gap-3 p-4 ring-1 ring-black/[0.04]")}>
      <label htmlFor="task-update" className="sr-only">
        Add an update
      </label>
      <textarea
        id="task-update"
        name="body"
        rows={3}
        required
        maxLength={TASK_COMMENT_MAX}
        placeholder="Add an update: what has been done, what is in the way, or a question for whoever has it"
        className={`${inputCompact} resize-y`}
      />
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 text-xs text-red-600">{error}</p>
        <button type="submit" disabled={pending} className={`${button("primary", "sm")} shrink-0`}>
          {pending ? "Adding…" : "Add update"}
        </button>
      </div>
    </form>
  );
}
