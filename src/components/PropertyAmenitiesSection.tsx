import { InfoTooltip } from "@/components/InfoTooltip";
import { SubmitButton } from "@/components/SubmitButton";
import { KEY_AMENITIES, amenitiesKnown, hasAmenity, listedByBookingSystem, type PropertyAmenities } from "@/lib/amenities";
import { formatDate } from "@/lib/schedule";
import { badge, card } from "@/lib/ui";

// The property page's list of what is in the place: tick boxes for the ones
// that matter, which staff can correct, and everything the listing says.
export function PropertyAmenitiesSection({
  property,
  source,
  save,
  refresh,
  result,
}: {
  property: PropertyAmenities;
  // The booking system's name when this property can read amenities from it.
  source: string | null;
  save: (formData: FormData) => Promise<void>;
  refresh: () => Promise<void>;
  // How the last refresh went, if one was just pressed.
  result?: string;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
        Amenities
        <InfoTooltip text="What is in this property. Ticks come from the listing where the booking system sends it; correct any that are wrong and your correction is kept. A property known to have no dishwasher loses the dishwasher line on the cleaning checklist." />
      </h2>
      <p className="text-sm text-zinc-500">
        {property.amenitiesSyncedAt
          ? `Read from ${source ?? "the listing"} on ${formatDate(property.amenitiesSyncedAt)}.`
          : source
            ? `Not read from ${source} yet.`
            : amenitiesKnown(property)
              ? "Set by your team."
              : "Nothing recorded yet. Tick what is there and save."}
      </p>

      <form action={save} className={card("flex flex-col gap-3 p-4")}>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
          {KEY_AMENITIES.map((a) => (
            <li key={a.id}>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  // Keyed on the value so a refresh from the listing shows
                  // through instead of keeping the old tick.
                  key={String(hasAmenity(property, a))}
                  type="checkbox"
                  name="amenity"
                  value={a.id}
                  defaultChecked={hasAmenity(property, a)}
                  className="h-4 w-4 accent-zinc-900"
                />
                {a.label}
                {(property.amenityAdded.includes(a.id) ||
                  (property.amenityRemoved.includes(a.id) && listedByBookingSystem(property.amenities, a))) && (
                  <span className="text-xs text-zinc-400">changed</span>
                )}
              </label>
            </li>
          ))}
        </ul>
        <div>
          <SubmitButton pendingLabel="Saving…">Save amenities</SubmitButton>
        </div>
      </form>

      {result === "failed" && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          Could not read the amenities just now. Wait a minute and try again.
        </p>
      )}
      {result === "read" && <p className="text-sm text-emerald-700">Amenities updated.</p>}

      {source && (
        <form action={refresh}>
          <SubmitButton pendingLabel="Reading…" variant="secondary">
            Refresh from {source}
          </SubmitButton>
        </form>
      )}

      {property.amenities.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-zinc-500 underline decoration-dotted decoration-zinc-300 underline-offset-2 hover:text-zinc-700">
            Everything on the listing ({property.amenities.length})
          </summary>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {[...property.amenities]
              .sort((a, b) => a.localeCompare(b))
              .map((name) => (
                <li key={name} className={badge("neutral")}>
                  {name}
                </li>
              ))}
          </ul>
        </details>
      )}
    </section>
  );
}
