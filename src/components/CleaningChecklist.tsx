import { mergeChecklist } from "@/lib/cleaningChecklist";
import { card } from "@/lib/ui";

// One card per room, a quick reminder to read on arrival -- not a tickbox
// form on top of the before/after photos and stock count already being
// recorded. `extras` are this property's own additions (see
// PropertyChecklistItem in schema.prisma), marked so a cleaner who knows the
// standard list by heart can spot at a glance what's different here.
export function CleaningChecklist({ extras = [] }: { extras?: { room: string; text: string }[] }) {
  return (
    // A grid, not a single flex column -- the cleaner's own page never
    // renders this wider than its phone-first max-w-md, so it always stays
    // one column there regardless. Given real width (the admin preview),
    // it fans the room cards out sideways instead of stacking every one of
    // them into one long scroll.
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {mergeChecklist(extras).map(({ room, items }) => (
        <div key={room} className={card("p-3")}>
          <h3 className="text-sm font-semibold text-zinc-900 [overflow-wrap:anywhere]">{room}</h3>
          <ul className="mt-1.5 flex flex-col gap-1">
            {items.map((item, i) => (
              <li
                key={`${i}-${item.text}`}
                className={`flex items-start gap-2 text-sm ${item.propertySpecific ? "font-medium text-zinc-900" : "text-zinc-600"}`}
              >
                <span
                  className={`mt-2 h-1 w-1 shrink-0 rounded-full ${item.propertySpecific ? "bg-zinc-900" : "bg-zinc-400"}`}
                />
                <span className="min-w-0 [overflow-wrap:anywhere]">
                  {item.text}
                  {item.propertySpecific && (
                    <span className="ml-1.5 text-xs font-normal text-zinc-500">· this property</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
