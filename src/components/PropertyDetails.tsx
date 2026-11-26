import {
  ACCESS_CODE_LABELS,
  ACCESS_OPTION_LABELS,
  PROPERTY_TYPE_LABELS,
  parseAccessCodes,
  parseAccessOptions,
} from "@/lib/accessOptions";
import { badge, card } from "@/lib/ui";
import { presentKeyAmenities, type PropertyAmenities } from "@/lib/amenities";

type PropertyLike = {
  address: string;
  type: string;
  bedrooms: number | null;
  bathrooms: number | null;
  maxOccupancy: number | null;
  accessOptions: unknown;
  accessCodes: unknown;
  accessNotes: string | null;
  notes: string | null;
} & Partial<PropertyAmenities>;

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-6 py-2 text-sm">
      <span className="shrink-0 text-zinc-500">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

// Read-only view of a property's details. Shared by the admin detail page
// and the client portal so a host sees exactly the same facts staff do --
// there's nothing here worth hiding from the person who owns the place.
export function PropertyDetails({
  property,
  showAmenities = false,
}: {
  property: PropertyLike;
  // For the cleaner's screens: the property page has its own fuller section.
  showAmenities?: boolean;
}) {
  const access = parseAccessOptions(property.accessOptions);
  const codes = parseAccessCodes(property.accessCodes);
  const amenities = showAmenities
    ? presentKeyAmenities({
        amenities: property.amenities ?? [],
        amenitiesSyncedAt: property.amenitiesSyncedAt ?? null,
        amenitiesCheckedAt: property.amenitiesCheckedAt ?? null,
        amenityAdded: property.amenityAdded ?? [],
        amenityRemoved: property.amenityRemoved ?? [],
      })
    : [];

  return (
    <div className="flex flex-col gap-4">
      {/* First, as it is what someone stood at the door needs. */}
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-zinc-900">Access</h2>
        {access.length === 0 && !property.accessNotes ? (
          <p className="text-sm text-zinc-600">Nothing recorded yet.</p>
        ) : (
          <>
            {access
              .filter((a) => ACCESS_CODE_LABELS[a])
              .map((a) => (
                <div key={a} className="rounded-2xl border-2 border-teal-600 bg-teal-50 px-4 py-3">
                  <p className="text-sm font-medium text-teal-900">{ACCESS_CODE_LABELS[a]}</p>
                  {codes[a] ? (
                    <p className="font-mono text-3xl font-semibold tracking-widest break-all text-zinc-900">
                      {codes[a]}
                    </p>
                  ) : (
                    <p className="text-sm text-amber-800">Not added yet</p>
                  )}
                </div>
              ))}
            {access.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {access.map((a) => (
                  <span key={a} className={badge("neutral")}>
                    {ACCESS_OPTION_LABELS[a] ?? a}
                  </span>
                ))}
              </div>
            )}
            {property.accessNotes && (
              <p className="text-sm whitespace-pre-line text-zinc-600">{property.accessNotes}</p>
            )}
          </>
        )}
      </div>

      <div className={card("divide-y divide-black/5 px-4 py-1")}>
        <Row label="Address" value={property.address} />
        <Row label="Type" value={PROPERTY_TYPE_LABELS[property.type] ?? property.type} />
        <Row label="Bedrooms" value={property.bedrooms ?? "–"} />
        <Row label="Bathrooms" value={property.bathrooms ?? "–"} />
        <Row label="Sleeps" value={property.maxOccupancy ?? "–"} />
      </div>

      {amenities.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-zinc-900">In the property</h2>
          <div className="flex flex-wrap gap-1.5">
            {amenities.map((a) => (
              <span key={a.id} className={badge("neutral")}>
                {a.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {property.notes && (
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-zinc-900">Notes</h2>
          <p className="text-sm whitespace-pre-line text-zinc-600">{property.notes}</p>
        </div>
      )}
    </div>
  );
}
