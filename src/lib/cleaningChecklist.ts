// The business's standard turnover checklist -- one fixed list for every
// property rather than something configured per property, since the whole
// point is a quick, consistent reminder of what "done" looks like, not a
// per-property form to fill in on top of before/after photos and stock.
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
