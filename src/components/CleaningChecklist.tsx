import { CLEANING_CHECKLIST } from "@/lib/cleaningChecklist";

// One line per room, room name then a comma list of what "done" looks like
// -- a quick reminder to read on arrival, not a tickbox form on top of the
// before/after photos and stock count already being recorded.
export function CleaningChecklist() {
  return (
    <ul className="flex flex-col gap-1.5 text-sm text-zinc-600">
      {CLEANING_CHECKLIST.map(({ room, items }) => (
        <li key={room}>
          <span className="font-medium text-zinc-900">{room}</span> — {items.join(", ")}
        </li>
      ))}
    </ul>
  );
}
