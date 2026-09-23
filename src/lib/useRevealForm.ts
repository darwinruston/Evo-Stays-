"use client";

import { useState, useTransition } from "react";

// Shared by every reveal-on-click edit form on the admin pages (hourly
// rate, schedule horizon, add/move/reassign, cleaner details, ...): starts
// closed, opens on demand -- and, the actual point of this hook, closes
// itself again after a successful save instead of only ever resetting via
// Cancel. A value that's just been saved should look saved, not sit open
// looking identical to one still being edited.
//
// Errors the action throws (e.g. "That email address already has a login")
// are caught and returned to show inline, rather than left to propagate --
// this app has no error boundary, so an uncaught throw from a plain
// <form action> crashes to the generic "couldn't load" screen instead of
// telling anyone what went wrong.
export function useRevealForm(action: (formData: FormData) => Promise<void>) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await action(formData);
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return { open, setOpen, error, pending, submit };
}
