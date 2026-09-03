import { propertyDisplayName } from "@/lib/address";
import { toDateTimeLocalValue } from "@/lib/schedule";
import { button, inputCompact } from "@/lib/ui";

type CleanFields = {
  id: string;
  propertyId: string;
  assignedToId: string | null;
  scheduledFor: Date | null;
  instructions: string | null;
  status: string;
};

// Shared between create and edit. The property is fixed once created --
// moving a clean to a different property would strand its photos and log
// against the wrong place.
export function CleanForm({
  action,
  clean,
  properties,
  cleaners,
  defaultPropertyId,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  clean?: CleanFields;
  properties: { id: string; name: string | null; address: string; client: { name: string } }[];
  cleaners: { id: string; name: string }[];
  defaultPropertyId?: string;
  submitLabel: string;
}) {
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
          defaultValue={clean?.assignedToId ?? ""}
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
          defaultValue={clean?.scheduledFor ? toDateTimeLocalValue(clean.scheduledFor) : ""}
          className={inputCompact}
        />
        <p className="text-xs text-zinc-500">Leave blank to schedule it later.</p>
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

      {clean && (clean.status === "PENDING" || clean.status === "CANCELLED") && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="status" className="text-sm font-medium">
            Status
          </label>
          <select id="status" name="status" defaultValue={clean.status} className={inputCompact}>
            <option value="PENDING">Not started</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <p className="text-xs text-zinc-500">
            In progress and completed are set by the cleaner on site.
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
