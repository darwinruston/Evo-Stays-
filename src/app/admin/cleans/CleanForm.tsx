"use client";

import { useState } from "react";
import { propertyDisplayName } from "@/lib/address";
import { toDateTimeLocalValue } from "@/lib/schedule";
import { button, inputCompact } from "@/lib/ui";

type CleanFields = {
  id: string;
  propertyId: string;
  assignedToId: string | null;
  scheduledFor: Date | null;
  guestCount: number | null;
  instructions: string | null;
  status: string;
};

type CleanerOption = {
  id: string;
  name: string;
  // ISO ("YYYY-MM-DD") days this cleaner has blocked -- see
  // CleanerUnavailability in schema.prisma. Only ever advisory here: staff
  // can still assign them, this just surfaces the same thing autoAssignCleaner
  // already skips them for.
  unavailableDates: string[];
};

// Shared between create and edit. The property is fixed once created --
// moving a clean to a different property would strand its photos and log
// against the wrong place.
//
// Client component (not the usual server-rendered form in this app) so the
// cleaner/date warning below can react live as either field changes,
// without round-tripping to the server for something this small.
export function CleanForm({
  action,
  clean,
  properties,
  cleaners,
  defaultPropertyId,
  propertyMaxOccupancy,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  clean?: CleanFields;
  properties: { id: string; name: string | null; address: string; client: { name: string } }[];
  cleaners: CleanerOption[];
  defaultPropertyId?: string;
  // Only known once a property is fixed (i.e. editing) -- the create form's
  // property is still a dropdown at render time, so its guest field just
  // gets a generic placeholder instead of a per-property one.
  propertyMaxOccupancy?: number | null;
  submitLabel: string;
}) {
  const [assignedToId, setAssignedToId] = useState(clean?.assignedToId ?? "");
  const [scheduledFor, setScheduledFor] = useState(
    clean?.scheduledFor ? toDateTimeLocalValue(clean.scheduledFor) : "",
  );

  const selectedCleaner = cleaners.find((c) => c.id === assignedToId);
  const selectedDateIso = scheduledFor.slice(0, 10); // "YYYY-MM-DDTHH:mm" -> "YYYY-MM-DD"
  const isUnavailable = !!selectedCleaner?.unavailableDates.includes(selectedDateIso);

  return (
    <form action={action} className="flex max-w-lg flex-col gap-4">
      {clean ? (
        <input type="hidden" name="propertyId" value={clean.propertyId} />
      ) : (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="propertyId" className="text-sm font-medium">
            Property
          </label>
          <select
            id="propertyId"
            name="propertyId"
            required
            defaultValue={defaultPropertyId ?? ""}
            className={inputCompact}
          >
            <option value="" disabled>
              Select a property…
            </option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.client.name} — {propertyDisplayName(p)}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="assignedToId" className="text-sm font-medium">
          Cleaner
        </label>
        <select
          id="assignedToId"
          name="assignedToId"
          value={assignedToId}
          onChange={(e) => setAssignedToId(e.target.value)}
          className={inputCompact}
        >
          <option value="">
            {clean ? "Unassigned" : "Auto-assign (whoever knows the place best)"}
          </option>
          {cleaners.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="scheduledFor" className="text-sm font-medium">
          Scheduled for
        </label>
        <input
          id="scheduledFor"
          name="scheduledFor"
          type="datetime-local"
          value={scheduledFor}
          onChange={(e) => setScheduledFor(e.target.value)}
          className={inputCompact}
        />
        <p className="text-xs text-zinc-500">Leave blank to schedule it later.</p>
        {isUnavailable && (
          <p className="text-xs font-medium text-zinc-600">
            {selectedCleaner!.name} has marked this day unavailable. You can still assign them —
            just worth checking first.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="guestCount" className="text-sm font-medium">
          Guests
        </label>
        <input
          id="guestCount"
          name="guestCount"
          type="number"
          min={0}
          defaultValue={clean?.guestCount ?? ""}
          placeholder={propertyMaxOccupancy ? String(propertyMaxOccupancy) : "e.g. 4"}
          className={`${inputCompact} w-24`}
        />
        <p className="text-xs text-zinc-500">
          Optional. Feeds the stock estimate a cleaner sees on site — leave blank and it falls
          back to the property&apos;s max occupancy.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="instructions" className="text-sm font-medium">
          Instructions
        </label>
        <textarea
          id="instructions"
          name="instructions"
          rows={3}
          defaultValue={clean?.instructions ?? ""}
          placeholder="Anything specific for this turnover — extra linen, guest left a note, deep clean the oven."
          className={inputCompact}
        />
      </div>

      {clean && clean.status !== "COMPLETED" && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="status" className="text-sm font-medium">
            Status
          </label>
          <select id="status" name="status" defaultValue={clean.status} className={inputCompact}>
            {clean.status === "IN_PROGRESS" ? (
              <option value="IN_PROGRESS">In progress</option>
            ) : (
              <option value="PENDING">Not started</option>
            )}
            <option value="CANCELLED">Cancelled</option>
          </select>
          <p className="text-xs text-zinc-500">
            {clean.status === "IN_PROGRESS"
              ? "A cleaner has checked in. Cancel it if the visit won't be finished — e.g. they got called away — rather than leaving it stuck in progress."
              : "In progress and completed are set by the cleaner on site."}
          </p>
        </div>
      )}

      <div>
        <button type="submit" className={button("primary", "sm")}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
