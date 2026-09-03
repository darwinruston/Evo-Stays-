import { STOCK_BAND_LABELS, type StockLevelBand } from "@/lib/stock";
import { button } from "@/lib/ui";

const BAND_ORDER: StockLevelBand[] = ["high", "medium", "low", "none"];

// Same tap-a-level interaction as the cleaner's stock step (see
// StockLevelStep in src/app/cleaner/cleans/[id]/page.tsx) -- nobody counts
// bin bags exactly, whether some were just used or a fresh case just
// arrived, so correcting it here works the same way a cleaner records it:
// pick the level, not a number. One form, four submit buttons each setting
// a different `band` value; the current level renders primary/filled so it
// reads at a glance which one is active, same visual language as
// StockLevelIndicator.
export function StockLevelToggle({
  action,
  current,
}: {
  action: (formData: FormData) => void;
  current: StockLevelBand;
}) {
  return (
    <form action={action} className="flex flex-wrap gap-1.5">
      {BAND_ORDER.map((band) => (
        <button
          key={band}
          type="submit"
          name="band"
          value={band}
          className={button(band === current ? "primary" : "secondary", "sm")}
        >
          {STOCK_BAND_LABELS[band]}
        </button>
      ))}
    </form>
  );
}
