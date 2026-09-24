"use client";

import { useActionState } from "react";
import type { IssueFormState } from "@/lib/issueRecords";
import { IssueFields } from "@/components/IssueFields";
import { button, inputCompact } from "@/lib/ui";

// The issue form shared by the cleaner's mid-clean report and staff's "Log an
// issue" page. useActionState rather than a plain form action, so a
// rejected report (a bad photo type, a missing field that slipped past the
// browser) comes back as a message right here with everything typed still
// in place -- a thrown error would instead replace the whole page, losing
// the report. Same approach as LaundryLoadWizard.
//
// `properties` adds a property picker above the shared fields -- staff's
// form needs one; the cleaner's report is already tied to their clean.
export function IssueForm({
  action,
  submitLabel,
  sentMessage,
  idPrefix,
  submitClassName = button("primary", "md"),
  properties,
  defaultPropertyId,
}: {
  action: (prev: IssueFormState, formData: FormData) => Promise<IssueFormState>;
  submitLabel: string;
  // Shown after a successful submission that stays on the page (the
  // cleaner's report). Staff's form redirects away instead, so omits it.
  sentMessage?: string;
  idPrefix?: string;
  submitClassName?: string;
  properties?: { id: string; label: string }[];
  defaultPropertyId?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const values = state.error ? state.values : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {/* Keyed by attempt so the fields remount with the returned values as
          their defaults -- React resets a form after its action finishes,
          and this makes that reset land on what was typed, not blanks. */}
      <div key={state.attempt ?? 0} className="flex flex-col gap-3">
        {properties && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="propertyId" className="text-sm font-medium">
              Property
            </label>
            <select
              id="propertyId"
              name="propertyId"
              required
              defaultValue={values?.propertyId ?? defaultPropertyId ?? ""}
              className={inputCompact}
            >
              <option value="" disabled>
                Choose…
              </option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <IssueFields idPrefix={idPrefix} defaults={values} />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      {state.sent && sentMessage && !pending && (
        <p role="status" className="text-sm text-zinc-600">
          {sentMessage}
        </p>
      )}

      <button type="submit" disabled={pending} className={submitClassName}>
        {pending ? "Sending…" : submitLabel}
      </button>
    </form>
  );
}
