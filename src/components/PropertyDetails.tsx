import { ACCESS_OPTION_LABELS, PROPERTY_TYPE_LABELS, parseAccessOptions } from "@/lib/accessOptions";
import { badge, card } from "@/lib/ui";

type PropertyLike = {
  address: string;
  type: string;
  bedrooms: number | null;
  bathrooms: number | null;
  maxOccupancy: number | null;
  accessOptions: unknown;
  accessNotes: string | null;
  notes: string | null;
};

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
export function PropertyDetails({ property }: { property: PropertyLike }) {
  const access = parseAccessOptions(property.accessOptions);

  return (
    <div className="flex flex-col gap-4">
      <div className={card("divide-y divide-black/5 px-4 py-1")}>
        <Row label="Address" value={property.address} />
        <Row label="Type" value={PROPERTY_TYPE_LABELS[property.type] ?? property.type} />
        <Row label="Bedrooms" value={property.bedrooms ?? "—"} />
        <Row label="Bathrooms" value={property.bathrooms ?? "—"} />
        <Row label="Sleeps" value={property.maxOccupancy ?? "—"} />
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-zinc-900">Access</h2>
        {access.length === 0 && !property.accessNotes ? (
          <p className="text-sm text-zinc-600">Nothing recorded yet.</p>
        ) : (
          <>
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

      {property.notes && (
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-zinc-900">Notes</h2>
          <p className="text-sm whitespace-pre-line text-zinc-600">{property.notes}</p>
        </div>
      )}
    </div>
  );
}
