// The business's standard turnover checklist -- the same baseline for every
// property: a quick, consistent reminder of what "done" looks like, not a
// per-property form to fill in on top of before/after photos and stock.
// A property can ADD items particular to it (see PropertyChecklistItem in
// schema.prisma and mergeChecklist below), but never remove from this.
export const CLEANING_CHECKLIST: { room: string; items: string[] }[] = [
  {
    room: "Kitchen",
    items: [
      "sink clear",
      "dishes & cutlery put away",
      "dishwasher run & emptied",
      "fridge wiped out",
      "surfaces wiped down",
    ],
  },
  {
    room: "Bathroom",
    items: ["toilet, sink & shower cleaned", "mirror streak-free", "fresh towels out", "bin emptied"],
  },
  {
    room: "Bedrooms",
    items: ["fresh linen, bed made", "surfaces dusted", "floor clear"],
  },
  {
    room: "Living area",
    items: ["surfaces clear & dusted", "cushions straightened", "floor vacuumed"],
  },
  {
    room: "General",
    items: ["bins emptied, bags replaced", "windows & doors locked", "nothing left behind from the last guest"],
  },
];

export const STANDARD_ROOMS = CLEANING_CHECKLIST.map((r) => r.room);

// Caps for a property addition -- long enough for "hot tub: test chlorine &
// pH, top up if below the line on the card", short enough to still read as
// a checklist line rather than a paragraph.
export const CHECKLIST_ROOM_MAX = 40;
export const CHECKLIST_TEXT_MAX = 200;

// A room typed as "kitchen" or " Kitchen " should land in the standard
// Kitchen card, not start a second one beside it -- so a typed room that
// matches a standard one (ignoring case and spacing) takes its spelling.
export function normaliseRoom(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  return STANDARD_ROOMS.find((r) => r.toLowerCase() === trimmed.toLowerCase()) ?? trimmed;
}

export type ChecklistItem = { text: string; propertySpecific: boolean };
export type ChecklistRoom = { room: string; items: ChecklistItem[] };

// The standard list with a property's additions folded in: an addition in
// a standard room is appended to that room's card; one in any other room
// ("Hot tub", "Garden") gets a card of its own after the standard ones, in
// the order those rooms were first added. Matching is case-insensitive for
// the same reason as normaliseRoom -- older rows may predate it.
export function mergeChecklist(extras: { room: string; text: string }[] = []): ChecklistRoom[] {
  const rooms: ChecklistRoom[] = CLEANING_CHECKLIST.map(({ room, items }) => ({
    room,
    items: items.map((text) => ({ text, propertySpecific: false })),
  }));
  for (const extra of extras) {
    const room = normaliseRoom(extra.room);
    const existing = rooms.find((r) => r.room.toLowerCase() === room.toLowerCase());
    const item = { text: extra.text, propertySpecific: true };
    if (existing) existing.items.push(item);
    else rooms.push({ room, items: [item] });
  }
  return rooms;
}
