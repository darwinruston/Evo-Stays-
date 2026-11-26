import { PendingButton } from "@/components/PendingButton";
import type { ActionResult } from "@/lib/actionResult";
import { ActionForm } from "@/components/ActionForm";
import { STOCK_BAND_LABELS, type StockLevelBand } from "@/lib/stock";
import { button } from "@/lib/ui";

const BAND_ORDER: StockLevelBand[] = ["high", "medium", "low", "none"];

const CHOSEN: Record<StockLevelBand, string> = {
  high: "!bg-emerald-600",
  medium: "!bg-amber-600",
  low: "!bg-orange-700",
  none: "!bg-rose-700",
};

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
  action: (formData: FormData) => Promise<ActionResult>;
  current: StockLevelBand;
}) {
  return (
    <ActionForm action={action} className="grid grid-cols-4 gap-1">
      {BAND_ORDER.map((band) => (
        <PendingButton
          key={band}
          name="band"
          value={band}
          className={`${button(band === current ? "primary" : "secondary", "sm")} ${band === current ? CHOSEN[band] : ""} !px-1 !py-1.5 text-xs`}
        >
          {STOCK_BAND_LABELS[band]}
        </PendingButton>
      ))}
    </ActionForm>
  );
}
