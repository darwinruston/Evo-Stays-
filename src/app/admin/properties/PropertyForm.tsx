import { ACCESS_OPTIONS, parseAccessOptions } from "@/lib/accessOptions";
import { PROPERTY_TYPE_LABELS } from "@/lib/accessOptions";
import { button, inputCompact } from "@/lib/ui";

type PropertyFields = {
  id: string;
  clientId: string;
  name: string | null;
  address: string;
  type: string;
  bedrooms: number | null;
  bathrooms: number | null;
  maxOccupancy: number | null;
  sofaBedSleeps: number | null;
  accessOptions: unknown;
  accessNotes: string | null;
  notes: string | null;
};

// Shared between create and edit. On edit the client can't be changed --
// moving a property between portfolios would silently move its cleaning
// history too, so that stays a deliberate, separate thing to build if ever
// needed.
export function PropertyForm({
  action,
  property,
  clients,
  defaultClientId,
  submitLabel,
  showPhotos = false,
}: {
  action: (formData: FormData) => void;
  property?: PropertyFields;
  clients: { id: string; name: string }[];
  defaultClientId?: string;
  submitLabel: string;
  showPhotos?: boolean;
}) {
  const selected = parseAccessOptions(property?.accessOptions);

  return (
    <form action={action} className="flex max-w-lg flex-col gap-4">
      {property ? (
        <input type="hidden" name="clientId" value={property.clientId} />
      ) : (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="clientId" className="text-sm font-medium">
            Client
          </label>
          <select
            id="clientId"
            name="clientId"
            required
            defaultValue={defaultClientId ?? ""}
            className={inputCompact}
          >
            <option value="" disabled>
              Select a client…
            </option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-medium">
          Listing name
        </label>
        <input
          id="name"
          name="name"
          defaultValue={property?.name ?? ""}
          placeholder="Riverside Loft"
          className={inputCompact}
        />
        <p className="text-xs text-zinc-500">Optional — falls back to the address.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="address" className="text-sm font-medium">
          Address
        </label>
        <input
          id="address"
          name="address"
          required
          defaultValue={property?.address ?? ""}
          className={inputCompact}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="type" className="text-sm font-medium">
          Type
        </label>
        <select
          id="type"
          name="type"
          defaultValue={property?.type ?? "APARTMENT"}
          className={inputCompact}
        >
          {Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="bedrooms" className="text-sm font-medium">
            Bedrooms
          </label>
          <input
            id="bedrooms"
            name="bedrooms"
            type="number"
            min={0}
            defaultValue={property?.bedrooms ?? ""}
            className={inputCompact}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="bathrooms" className="text-sm font-medium">
            Bathrooms
          </label>
          <input
            id="bathrooms"
            name="bathrooms"
            type="number"
            min={0}
            defaultValue={property?.bathrooms ?? ""}
            className={inputCompact}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="maxOccupancy" className="text-sm font-medium">
            Sleeps
          </label>
          <input
            id="maxOccupancy"
            name="maxOccupancy"
            type="number"
            min={0}
            defaultValue={property?.maxOccupancy ?? ""}
            className={inputCompact}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="sofaBedSleeps" className="text-sm font-medium">
          Sofa bed sleeps
        </label>
        <input
          id="sofaBedSleeps"
          name="sofaBedSleeps"
          type="number"
          min={0}
          defaultValue={property?.sofaBedSleeps ?? ""}
          placeholder="e.g. 2"
          className={`${inputCompact} max-w-32`}
        />
        <p className="text-xs text-zinc-500">
          Extra guests the sofa bed itself sleeps, already counted into Sleeps above -- leave blank if
          there&apos;s no sofa bed. A cleaning task flags the sofa bed for prep when a booking&apos;s
          guest count runs higher than the bedrooms alone sleep.
        </p>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Access</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {ACCESS_OPTIONS.map((o) => (
            <label key={o.value} className="flex items-center gap-2 text-sm text-zinc-600">
              <input
                type="checkbox"
                name="accessOptions"
                value={o.value}
                defaultChecked={selected.includes(o.value)}
              />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="accessNotes" className="text-sm font-medium">
          Access notes
        </label>
        <textarea
          id="accessNotes"
          name="accessNotes"
          rows={3}
          defaultValue={property?.accessNotes ?? ""}
          placeholder="Key safe code, parking, bin day — whatever the cleaner needs on site."
          className={inputCompact}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="notes" className="text-sm font-medium">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={property?.notes ?? ""}
          className={inputCompact}
        />
      </div>

      {showPhotos && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="photos" className="text-sm font-medium">
            Photos
          </label>
          <input
            id="photos"
            name="photos"
            type="file"
            accept="image/*"
            multiple
            className="text-sm text-zinc-600 file:mr-3 file:rounded-md file:border-0 file:bg-black/[0.06] file:px-3 file:py-1.5 file:text-sm file:font-medium"
          />
          <p className="text-xs text-zinc-500">The first one becomes the cover photo.</p>
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
