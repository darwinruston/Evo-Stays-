"use client";

import { useState, useActionState, useRef, useEffect, startTransition } from "react";
import Link from "next/link";
import { StepProgress } from "@/components/StepProgress";
import { button, card, inputCompact } from "@/lib/ui";

export type WizardVisit = { id: string; label: string };
export type WizardFacility = { id: string; name: string };

// Returned by the create-load server actions instead of thrown: a throw
// from a plain <form action> surfaces as an uncaught exception that wipes
// out every step's answer and leaves the user stuck. Returning it lets
// useActionState below show it inline and keep everything already entered.
export type LaundryLoadFormState = { error?: string };

const WIZARD_STEPS = ["Visits", "Launderette", "Cost", "Photo"] as const;

// One thing at a time -- what linen, then where it went, then how much,
// then the ticket photo -- instead of one dense form. All four steps'
// inputs stay mounted for the form's whole lifetime (see the `hidden`
// className below); only which one is *visible* changes with `step`, so
// the submitted FormData always has the same shape the server actions
// (createLaundryLoad in src/app/admin/laundry/actions.ts and
// src/app/cleaner/actions.ts) already expect -- this component only
// changes how the fields are presented, not what gets submitted.
export function LaundryLoadWizard({
  eligibleVisits,
  facilities,
  manageFacilitiesHref,
  onCreateFacility,
  capturePhoto,
  action,
}: {
  eligibleVisits: WizardVisit[];
  facilities: WizardFacility[];
  manageFacilitiesHref?: string;
  // Only passed where the caller is actually allowed to create facilities
  // (admin/office) -- when absent, someone who can't see one they need is
  // pointed at manageFacilitiesHref instead of getting a button that would
  // just fail server-side.
  onCreateFacility?: (name: string) => Promise<WizardFacility>;
  capturePhoto?: boolean;
  action: (prevState: LaundryLoadFormState, formData: FormData) => Promise<LaundryLoadFormState>;
}) {
  const [step, setStep] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [facilityId, setFacilityId] = useState("");
  const [cost, setCost] = useState("");
  const [photoSelected, setPhotoSelected] = useState(false);
  const [localFacilities, setLocalFacilities] = useState(facilities);
  const [addingFacility, setAddingFacility] = useState(facilities.length === 0);
  const [newFacilityName, setNewFacilityName] = useState("");
  const [creatingFacility, setCreatingFacility] = useState(false);
  const [createFacilityError, setCreateFacilityError] = useState<string | null>(null);

  const formRef = useRef<HTMLFormElement>(null);
  const [submitted, setSubmitted] = useState(false);
  const [resetToken, setResetToken] = useState(0);
  const [state, formAction, pending] = useActionState<LaundryLoadFormState, FormData>(action, {});

  // A successful submit clears the wizard back to a blank first step, ready
  // for the next drop-off, rather than leaving a filled-in form sitting
  // there or needing a manual page reload. Done during render (React's own
  // pattern for "reset state when a value changes") rather than in an
  // effect, since setState-in-an-effect causes an extra render pass; the
  // `submitted` flag (set in the Save button's onClick) gates it so this
  // never fires on first mount, only after an actual save.
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (submitted) {
      setSubmitted(false);
      if (!state.error) {
        setStep(0);
        setSelectedIds(new Set());
        setFacilityId("");
        setCost("");
        setPhotoSelected(false);
        setResetToken((t) => t + 1);
      }
    }
  }

  // The photo <input> is uncontrolled (a file picker's value can't be set
  // from React state), so clearing it needs the actual DOM API -- an
  // imperative side effect, which belongs in an effect (refs may only be
  // read/written there, never during render). Skips the very first run so
  // mounting doesn't reset a freshly-rendered, still-empty form.
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    formRef.current?.reset();
  }, [resetToken]);

  if (eligibleVisits.length === 0) {
    return (
      <p className="text-sm text-zinc-600">
        Nothing unclaimed right now -- every completed visit&apos;s linen is already logged.
      </p>
    );
  }

  const costValue = Number.parseFloat(cost);
  const costValid = cost.trim() !== "" && Number.isFinite(costValue) && costValue >= 0;
  const canProceed = step === 0 ? selectedIds.size > 0 : step === 1 ? facilityId !== "" : costValid;
  const canSave = selectedIds.size > 0 && facilityId !== "" && costValid && photoSelected;

  function toggleVisit(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCreateFacility() {
    if (!onCreateFacility) return;
    const name = newFacilityName.trim();
    if (!name) return;

    setCreatingFacility(true);
    setCreateFacilityError(null);
    try {
      const created = await onCreateFacility(name);
      setLocalFacilities((prev) =>
        prev.some((f) => f.id === created.id)
          ? prev
          : [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setFacilityId(created.id);
      setNewFacilityName("");
      setAddingFacility(false);
    } catch (err) {
      setCreateFacilityError(err instanceof Error ? err.message : "Couldn't add that launderette.");
    } finally {
      setCreatingFacility(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={(e) => e.preventDefault()} className={card("flex flex-col gap-4 p-4")}>
      <StepProgress steps={WIZARD_STEPS} current={step} />

      <fieldset className={step === 0 ? "flex flex-col gap-2" : "hidden"}>
        <legend className="text-sm font-medium">Which visits went in this load?</legend>
        <div className="flex max-h-64 flex-col gap-1.5 overflow-y-auto">
          {eligibleVisits.map((v) => (
            <label key={v.id} className="flex items-start gap-2 text-sm text-zinc-600">
              <input
                type="checkbox"
                name="cleanLogIds"
                value={v.id}
                checked={selectedIds.has(v.id)}
                onChange={() => toggleVisit(v.id)}
                className="mt-0.5"
              />
              <span>{v.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className={step === 1 ? "flex flex-col gap-2" : "hidden"}>
        <label htmlFor="facilityId" className="text-sm font-medium">
          Where did it go?
        </label>

        {localFacilities.length > 0 && (
          <select
            id="facilityId"
            name="facilityId"
            value={facilityId}
            onChange={(e) => setFacilityId(e.target.value)}
            className={inputCompact}
          >
            <option value="">Choose a launderette</option>
            {localFacilities.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        )}

        {onCreateFacility ? (
          addingFacility ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={newFacilityName}
                onChange={(e) => setNewFacilityName(e.target.value)}
                placeholder="New launderette name"
                className={inputCompact}
              />
              <button
                type="button"
                disabled={creatingFacility || newFacilityName.trim() === ""}
                onClick={handleCreateFacility}
                className={`${button("secondary", "sm")} disabled:cursor-not-allowed disabled:opacity-40`}
              >
                {creatingFacility ? "Adding…" : "Add"}
              </button>
              {localFacilities.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setAddingFacility(false);
                    setCreateFacilityError(null);
                  }}
                  className="text-xs text-zinc-500 hover:underline"
                >
                  Cancel
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAddingFacility(true)}
              className="w-fit text-xs text-zinc-500 underline decoration-dotted underline-offset-2 hover:text-zinc-700"
            >
              + Add new launderette
            </button>
          )
        ) : (
          localFacilities.length === 0 && (
            <p className="text-sm text-zinc-600">
              No launderettes set up yet.
              {manageFacilitiesHref && (
                <>
                  {" "}
                  <Link href={manageFacilitiesHref} className="underline underline-offset-2">
                    Add one →
                  </Link>
                </>
              )}
            </p>
          )
        )}

        {createFacilityError && <p className="text-xs text-red-600">{createFacilityError}</p>}
      </div>

      <div className={step === 2 ? "flex flex-col gap-1" : "hidden"}>
        <label htmlFor="cost" className="text-sm font-medium">
          Cost
        </label>
        <input
          id="cost"
          name="cost"
          type="number"
          min={0}
          step="0.01"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          placeholder="e.g. 18.50"
          className={inputCompact}
        />
      </div>

      <div className={step === 3 ? "flex flex-col gap-1" : "hidden"}>
        <label htmlFor="photo" className="text-sm font-medium">
          Ticket photo
        </label>
        <input
          id="photo"
          name="photo"
          type="file"
          accept="image/*"
          capture={capturePhoto ? "environment" : undefined}
          onChange={(e) => setPhotoSelected(!!e.target.files && e.target.files.length > 0)}
          className="text-sm text-zinc-600 file:mr-3 file:rounded-md file:border-0 file:bg-black/[0.06] file:px-3 file:py-1.5 file:text-sm file:font-medium"
        />
        {step === 3 && !photoSelected && (
          <p className="text-xs text-zinc-500">A ticket photo is needed before this can be saved.</p>
        )}
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex items-center gap-2">
        {step > 0 && (
          <button type="button" onClick={() => setStep((s) => s - 1)} className={button("secondary", "sm")}>
            Back
          </button>
        )}
        {step < WIZARD_STEPS.length - 1 ? (
          <button
            type="button"
            disabled={!canProceed}
            onClick={() => setStep((s) => s + 1)}
            className={`${button("primary", "sm")} disabled:cursor-not-allowed disabled:opacity-40`}
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            disabled={!canSave || pending}
            onClick={() => {
              setSubmitted(true);
              const fd = formRef.current ? new FormData(formRef.current) : null;
              // useActionState's dispatcher expects to run inside a
              // transition (it's normally invoked by React itself via the
              // form's action prop) -- calling it bare from an event
              // handler works but leaves `pending` out of sync with the
              // actual request. Wrapping it here is what makes "Saving…"
              // reflect reality.
              if (fd) startTransition(() => formAction(fd));
            }}
            className={`${button("primary", "sm")} disabled:cursor-not-allowed disabled:opacity-40`}
          >
            {pending ? "Saving…" : "Save"}
          </button>
        )}
      </div>
    </form>
  );
}
