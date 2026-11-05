"use client";

import { useState, useTransition } from "react";
import { changeOwnPassword, sendOwnResetLink } from "@/app/account/actions";
import { PASSWORD_MIN_LENGTH } from "@/lib/profile";
import { button } from "@/lib/ui";
import { PasswordInput } from "@/components/PasswordInput";

// A "Change password" button that opens the form only when asked for. In it you
// can change the password you know or, if you have forgotten it, have a reset
// link emailed to the address on the account. Closing it again throws away
// whatever was typed. Submitted through the form's submit event rather than as
// a form action, so a refused save (wrong current password, say) leaves what
// was typed in the boxes.
export function ChangePasswordForm() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [sending, startSending] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        // On success this redirects to the profile page, signed back in.
        const result = await changeOwnPassword(formData);
        if (result) setError(result);
      } catch {
        setError("Something went wrong. Please try again.");
      }
    });
  }

  function sendLink() {
    setResetMessage(null);
    startSending(async () => {
      try {
        setResetMessage(await sendOwnResetLink());
      } catch {
        setResetMessage("Something went wrong. Please try again.");
      }
    });
  }

  if (!open) {
    return (
      <div>
        <button type="button" onClick={() => setOpen(true)} className={button("secondary", "md")}>
          Change password
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(new FormData(e.currentTarget));
        }}
        className="flex flex-col gap-4"
      >
        <PasswordInput id="current-password" name="currentPassword" label="Current password" autoComplete="current-password" />
        <PasswordInput
          id="new-password"
          name="password"
          label="New password"
          autoComplete="new-password"
          hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
        />
        <PasswordInput id="confirm-password" name="confirmPassword" label="Confirm new password" autoComplete="new-password" />
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <div className="flex items-center gap-2">
          <button type="submit" disabled={pending} className={button("primary", "md")}>
            {pending ? "Saving…" : "Save new password"}
          </button>
          <button type="button" onClick={() => setOpen(false)} className={button("ghost", "md")}>
            Cancel
          </button>
        </div>
      </form>

      <div className="flex flex-col gap-2 border-t border-black/5 pt-5">
        <h3 className="text-sm font-medium">Forgotten your password?</h3>
        <p className="text-sm text-zinc-500">
          We can email a link to the address on your account. It lets you choose a new password without the old one.
        </p>
        <div>
          <button type="button" disabled={sending} onClick={sendLink} className={button("secondary", "sm")}>
            {sending ? "Sending…" : "Email me a reset link"}
          </button>
        </div>
        {resetMessage && (
          <p role="status" className="text-sm text-zinc-700">
            {resetMessage}
          </p>
        )}
      </div>
    </div>
  );
}
