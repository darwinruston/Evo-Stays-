"use client";

import { useId, useRef, useState, useTransition } from "react";
import { useRevealForm } from "@/lib/useRevealForm";
import type { ActionResult } from "@/lib/actionResult";
import { ACCEPTED_DOCUMENT_TYPES } from "@/lib/documentTypes";
import { badge, button, card, inputCompact } from "@/lib/ui";

export type SafetyDocumentItem = {
  id: string;
  fileName: string;
  // "PDF, 1.2 MB. Added 12 Nov 25 by Sam. For the check completed 5 Nov 25."
  meta: string;
  href: string;
};

export type SafetyCheckCardProps = {
  title: string;
  what: string | null;
  // Already worked out on the server, so the card holds no date logic.
  statusLabel: string;
  attention: boolean;
  notNeeded: boolean;
  lastDone: string | null;
  nextDue: string | null;
  intervalMonths: number;
  note: string | null;
  today: string;
  documents: SafetyDocumentItem[];
  save: (formData: FormData) => Promise<ActionResult>;
  upload: (formData: FormData) => Promise<ActionResult>;
  removeDocument: (documentId: string) => Promise<ActionResult>;
  setApplicable: (applicable: boolean) => Promise<ActionResult>;
  // Present only for a check the manager added themselves.
  remove?: () => Promise<ActionResult>;
};

export function SafetyCheckCard(props: SafetyCheckCardProps) {
  const { open, setOpen, error, pending, submit } = useRevealForm(props.save);
  const uid = useId();
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [toggling, startToggle] = useTransition();

  function run(action: () => Promise<ActionResult>) {
    setToggleError(null);
    startToggle(async () => {
      try {
        const result = await action();
        if (result) setToggleError(result.error);
      } catch {
        setToggleError("Something went wrong.");
      }
    });
  }

  return (
    <li className={card(`flex flex-col gap-3 p-4 ${props.notNeeded ? "opacity-70" : ""}`)}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h3 className="font-medium">{props.title}</h3>
          {props.what && <p className="mt-0.5 text-sm text-zinc-500">{props.what}</p>}
        </div>
        <span className={badge(props.attention ? "solid" : "neutral")}>{props.statusLabel}</span>
      </div>

      {!props.notNeeded && props.lastDone && (
        <p className="text-sm text-zinc-600">
          Completed {props.lastDone}
          {props.nextDue && ` · Due ${props.nextDue}`}
        </p>
      )}
      {props.note && !props.notNeeded && <p className="text-sm text-zinc-500 [overflow-wrap:anywhere]">{props.note}</p>}

      {(props.documents.length > 0 || !props.notNeeded) && (
        <div className="flex flex-col gap-2 border-t border-black/5 pt-3">
          <h4 className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
            Documents{props.documents.length > 0 && ` (${props.documents.length})`}
          </h4>
          {props.documents.length > 0 && (
            <ul className="flex flex-col gap-2">
              {props.documents.map((doc) => (
                <DocumentRow key={doc.id} doc={doc} remove={() => props.removeDocument(doc.id)} />
              ))}
            </ul>
          )}
          {!props.notNeeded && <DocumentUpload upload={props.upload} />}
        </div>
      )}

      {open ? (
        <form
          onSubmit={(e) => {
          e.preventDefault();
          submit(new FormData(e.currentTarget));
      }}
          className="flex flex-wrap items-end gap-3 rounded-lg bg-black/[0.03] p-3"
        >
          <div className="flex flex-col gap-1">
            <label htmlFor={`${uid}-done`} className="text-xs text-zinc-500">
              Date completed
            </label>
            <input
              id={`${uid}-done`}
              name="completedOn"
              type="date"
              max={props.today}
              autoFocus
              className={`${inputCompact} w-40`}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${uid}-months`} className="text-xs text-zinc-500">
              Repeats every (months)
            </label>
            <input
              id={`${uid}-months`}
              name="intervalMonths"
              type="number"
              min={1}
              max={240}
              defaultValue={props.intervalMonths}
              className={`${inputCompact} w-28`}
            />
          </div>
          <div className="flex min-w-48 flex-1 flex-col gap-1">
            <label htmlFor={`${uid}-note`} className="text-xs text-zinc-500">
              Note (optional)
            </label>
            <input
              id={`${uid}-note`}
              name="note"
              type="text"
              maxLength={300}
              defaultValue={props.note ?? ""}
              placeholder="Engineer, certificate number…"
              className={inputCompact}
            />
          </div>
          <div className="flex w-full flex-col gap-1">
            <label htmlFor={`${uid}-docs`} className="text-xs text-zinc-500">
              Certificate or report (optional)
            </label>
            <input
              id={`${uid}-docs`}
              name="documents"
              type="file"
              multiple
              accept={ACCEPTED_DOCUMENT_TYPES}
              className="text-sm file:mr-3 file:rounded-md file:border file:border-black/10 file:bg-surface file:px-3 file:py-1.5 file:text-sm"
            />
          </div>
          <button type="submit" disabled={pending} className={button("primary", "sm")}>
            {pending ? "Saving…" : "Save"}
          </button>
          <button type="button" onClick={() => setOpen(false)} className={button("ghost", "sm")}>
            Cancel
          </button>
          <p className="w-full text-xs text-zinc-500">
            Leave the date empty to change only how often it repeats. A PDF, photo or Word file, up to 10 MB each.
          </p>
          {error && <p className="w-full text-xs text-red-600">{error}</p>}
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {props.notNeeded ? (
            <button
              type="button"
              disabled={toggling}
              onClick={() => run(() => props.setApplicable(true))}
              className={button("secondary", "sm")}
            >
              Needed here after all
            </button>
          ) : (
            <>
              <button type="button" onClick={() => setOpen(true)} className={button("secondary", "sm")}>
                {props.lastDone ? "Record it again" : "Record when it was completed"}
              </button>
              {props.remove ? (
                <button
                  type="button"
                  disabled={toggling}
                  onClick={() => {
                    if (window.confirm(`Remove "${props.title}" from this property?`)) run(props.remove!);
                  }}
                  className={button("ghost", "sm")}
                >
                  Remove
                </button>
              ) : (
                <button
                  type="button"
                  disabled={toggling}
                  onClick={() => run(() => props.setApplicable(false))}
                  className={button("ghost", "sm")}
                >
                  Not needed here
                </button>
              )}
            </>
          )}
        </div>
      )}
      {toggleError && <p className="text-xs text-red-600">{toggleError}</p>}
    </li>
  );
}

// "+ Add another check", for anything specific to the property that the
// standard list doesn't cover: a hot tub water test, a pool inspection.
export function AddSafetyCheckForm({
  action,
  today,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  today: string;
}) {
  const { open, setOpen, error, pending, submit } = useRevealForm(action);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={`${button("secondary", "sm")} self-start`}>
        + Add another check
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(new FormData(e.currentTarget));
      }}
      className={card("flex flex-wrap items-end gap-3 p-4")}
    >
      <div className="flex min-w-48 flex-1 flex-col gap-1.5">
        <label htmlFor="safety-title" className="text-sm font-medium">
          What is it?
        </label>
        <input
          id="safety-title"
          name="title"
          type="text"
          required
          autoFocus
          maxLength={80}
          placeholder="e.g. Hot tub water test"
          className={inputCompact}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="safety-months" className="text-sm font-medium">
          Repeats every (months)
        </label>
        <input
          id="safety-months"
          name="intervalMonths"
          type="number"
          required
          min={1}
          max={240}
          defaultValue={12}
          className={`${inputCompact} w-28`}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="safety-done" className="text-sm font-medium">
          Completed (optional)
        </label>
        <input id="safety-done" name="completedOn" type="date" max={today} className={`${inputCompact} w-40`} />
      </div>
      <button type="submit" disabled={pending} className={button("primary", "sm")}>
        {pending ? "Adding…" : "Add"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className={button("ghost", "sm")}>
        Cancel
      </button>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </form>
  );
}

// One kept document: opens in a new tab (or downloads, for a Word file), with
// a second-click remove so it can't be lost to a stray tap.
function DocumentRow({ doc, remove }: { doc: SafetyDocumentItem; remove: () => Promise<ActionResult> }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await remove();
        if (result) setError(result.error);
      } catch {
        setError("Something went wrong.");
      }
      setConfirming(false);
    });
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg bg-black/[0.03] px-3 py-2">
      <div className="min-w-0">
        <a
          href={doc.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium underline decoration-black/20 underline-offset-2 hover:decoration-black [overflow-wrap:anywhere]"
        >
          {doc.fileName}
        </a>
        <p className="text-xs text-zinc-500">{doc.meta}</p>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
      {confirming ? (
        <span className="flex items-center gap-3 text-xs">
          <button type="button" disabled={pending} onClick={run} className="font-medium text-red-600 hover:underline">
            Yes, remove
          </button>
          <button type="button" onClick={() => setConfirming(false)} className="text-zinc-500 hover:underline">
            Cancel
          </button>
        </span>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className="text-xs text-zinc-500 hover:text-red-600">
          Remove
        </button>
      )}
    </li>
  );
}

// "Upload a document": picking the file(s) sends them straight away.
function DocumentUpload({ upload }: { upload: (formData: FormData) => Promise<ActionResult> }) {
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await upload(formData);
        if (result) setError(result.error);
      } catch {
        setError("Something went wrong. The file may be too large.");
      }
      formRef.current?.reset();
    });
  }

  return (
    <form ref={formRef} action={submit} className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <input
        ref={inputRef}
        name="documents"
        type="file"
        multiple
        accept={ACCEPTED_DOCUMENT_TYPES}
        className="sr-only"
        tabIndex={-1}
        aria-label="Choose documents to upload"
        onChange={() => formRef.current?.requestSubmit()}
      />
      <button type="button" disabled={pending} onClick={() => inputRef.current?.click()} className={button("secondary", "sm")}>
        {pending ? "Uploading…" : "Upload a document"}
      </button>
      <span className="text-xs text-zinc-500">PDF, photo or Word file, up to 10 MB each</span>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </form>
  );
}
