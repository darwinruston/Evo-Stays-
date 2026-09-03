import { formatDuration, formatScheduledFor } from "@/lib/schedule";
import { card } from "@/lib/ui";

type LogPhoto = { id: string; path: string; stage: "BEFORE" | "AFTER" };
type LogStockUsage = {
  id: string;
  countedQty: number;
  restockedQty: number;
  stockItem: { name: string; unit: string | null };
};

type LogLike = {
  note: string | null;
  arrivedAt: Date | null;
  departedAt: Date | null;
  recordedBy: { name: string };
  photos: LogPhoto[];
  stockUsage?: LogStockUsage[];
};

function PhotoGroup({ title, photos, alt }: { title: string; photos: LogPhoto[]; alt: string }) {
  if (photos.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-medium tracking-wide text-zinc-500 uppercase">{title}</h3>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos.map((p) => (
          <li key={p.id} className={card("overflow-hidden")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/photos/${p.path}`} alt={alt} className="h-32 w-full object-cover" />
          </li>
        ))}
      </ul>
    </div>
  );
}

function StockUsageGroup({ usage }: { usage: LogStockUsage[] }) {
  if (usage.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-medium tracking-wide text-zinc-500 uppercase">Stock counted</h3>
      <ul className="flex flex-col gap-1">
        {usage.map((u) => (
          <li key={u.id} className="flex justify-between text-sm">
            <span className="text-zinc-600">{u.stockItem.name}</span>
            <span>
              {u.countedQty} {u.stockItem.unit ?? ""} on hand
              {u.restockedQty > 0 && ` · restocked ${u.restockedQty}`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// What actually happened on a turnover. Shown to staff, to the cleaner who
// did it, and to the owning client -- there's nothing here a host shouldn't
// see about their own property.
export function CleanLogView({ log, alt }: { log: LogLike; alt: string }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="text-sm text-zinc-600">
        {log.arrivedAt && log.departedAt ? (
          <>
            {formatScheduledFor(log.arrivedAt)} – {formatScheduledFor(log.departedAt)} (
            {formatDuration(log.arrivedAt, log.departedAt)})
          </>
        ) : (
          "Time on site not recorded"
        )}
        {` · ${log.recordedBy.name}`}
      </div>

      {log.note && <p className="text-sm whitespace-pre-line text-zinc-600">{log.note}</p>}

      <PhotoGroup title="Before" photos={log.photos.filter((p) => p.stage === "BEFORE")} alt={alt} />
      <PhotoGroup title="After" photos={log.photos.filter((p) => p.stage === "AFTER")} alt={alt} />
      {log.stockUsage && <StockUsageGroup usage={log.stockUsage} />}
    </div>
  );
}
