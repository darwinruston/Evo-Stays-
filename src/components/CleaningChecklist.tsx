import { CLEANING_CHECKLIST } from "@/lib/cleaningChecklist";
import { card } from "@/lib/ui";

// One card per room, a quick reminder to read on arrival -- not a tickbox
// form on top of the before/after photos and stock count already being
// recorded.
export function CleaningChecklist() {
  return (
    <div className="flex flex-col gap-2">
      {CLEANING_CHECKLIST.map(({ room, items }) => (
        <div key={room} className={card("p-3")}>
          <h3 className="text-sm font-semibold text-zinc-900">{room}</h3>
          <ul className="mt-1.5 flex flex-col gap-1">
            {items.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-zinc-600">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-zinc-400" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
