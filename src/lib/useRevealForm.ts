"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/lib/actionResult";

// Shared by every reveal-on-click edit form on the admin pages (hourly
// rate, schedule horizon, add/move/reassign, cleaner details, ...): starts
// closed, opens on demand -- and, the actual point of this hook, closes
// itself again after a successful save instead of only ever resetting via
// Cancel. A value that's just been saved should look saved, not sit open
// looking identical to one still being edited.
//
// A reason the action turns the save down (e.g. "That email address already
// has a login") comes back as its return value -- see ActionResult -- and
// shows inline with the form still open. Anything the action throws is a
// failure it didn't expect, and production hides a thrown error's message,
// so that only gets a generic line here rather than the app's error screen.
export function useRevealForm(action: (formData: FormData) => Promise<ActionResult>) {
  const [open, setOpen] = useState(false);
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
        setOpen(false);
      } catch {
        setError("Something went wrong.");
      }
    });
  }

  return { open, setOpen, error, pending, submit };
}
