// Puts stock in the order a cleaner can walk through the house, so they are not
// jumping from the bathroom to the kitchen and back to check it. Nobody sets
// anything up: the place each item usually lives is worked out from its name,
// from a built-in list of everyday short-let stock ("Toilet roll" is
// bathroom, "Bin bags" are kitchen cupboard, "Bleach" is the store cupboard).
// Something the list doesn't recognise goes at the end, in name order, and
// the check works exactly as it did before.
//
// The zones are in walking order. Something kept in two places, like hand
// soap, simply lands in the one it most often lives in.

export type StockZone = { id: string; name: string; position: number };

const ZONES: Record<string, StockZone> = {
  kitchen: { id: "kitchen", name: "Kitchen", position: 1 },
  "kitchen-cupboard": { id: "kitchen-cupboard", name: "Kitchen cupboard", position: 2 },
  living: { id: "living", name: "Living area", position: 3 },
  bathroom: { id: "bathroom", name: "Bathroom", position: 4 },
  bedroom: { id: "bedroom", name: "Bedroom", position: 5 },
  store: { id: "store", name: "Store cupboard", position: 6 },
};

// Most specific first: the first rule whose words appear in the name wins, so
// "toilet cleaner" (cleaning kit) is found before "toilet" (bathroom).
const RULES: { zone: keyof typeof ZONES; words: string[] }[] = [
  {
    zone: "store",
    words: [
      "toilet cleaner", "toilet duck", "bleach", "disinfectant", "multi surface", "multi-surface", "surface spray",
      "cleaning spray", "glass cleaner", "polish", "descaler", "limescale", "mop", "bucket", "hoover", "vacuum",
      "dustpan", "brush head", "duster", "microfibre", "gloves", "cleaning", "laundry", "washing powder",
      "washing liquid", "fabric softener", "dryer sheet", "detergent", "light bulb", "lightbulb", "bulbs", "batteries",
      "battery", "extension lead",
    ],
  },
  {
    zone: "kitchen-cupboard",
    words: [
      "bin bag", "bin liner", "dishwasher", "rinse aid", "cling film", "clingfilm", "foil", "baking", "salt",
      "pepper", "spice", "olive oil", "cooking oil", "oil", "vinegar", "flour", "pasta", "rice", "food bag",
      "freezer bag", "sandwich bag", "oven cleaner", "oven glove",
    ],
  },
  {
    zone: "kitchen",
    words: [
      "kitchen roll", "kitchen towel", "washing up", "washing-up", "dish soap", "dishwashing", "sponge", "scourer",
      "scouring", "tea towel", "dish cloth", "dishcloth", "tea", "coffee", "sugar", "milk", "sweetener", "biscuit",
      "welcome", "water", "juice", "capsule", "pod", "filter", "kettle", "toaster",
    ],
  },
  {
    zone: "bathroom",
    words: [
      "toilet roll", "loo roll", "toilet paper", "toilet", "loo", "shampoo", "conditioner", "shower", "body wash",
      "body lotion", "bath", "hand soap", "hand wash", "handwash", "soap", "toothpaste", "toothbrush", "cotton",
      "razor", "sanitary", "tampon", "flannel", "face cloth", "mouthwash", "deodorant", "air freshener", "plug-in",
      "bathroom",
    ],
  },
  {
    zone: "bedroom",
    words: [
      "pillow", "duvet", "blanket", "mattress", "hanger", "slipper", "sleep", "bedside", "sheet", "bedding", "throw",
      "cushion", "bedroom",
    ],
  },
  {
    zone: "living",
    words: ["tissue", "candle", "matches", "remote", "board game", "games", "magazine", "book", "guide", "living", "lounge", "tv"],
  },
];

function includesWord(name: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Whole words only ("tea" is not "steam"), and a plural counts ("candle" matches "candles").
  return new RegExp(`(^|[^a-z])${escaped}(s|es)?($|[^a-z])`).test(name);
}

// Where this item usually lives, or null if nothing in its name says.
export function stockZoneFor(itemName: string): StockZone | null {
  const name = itemName.toLowerCase().trim();
  if (name.length < 3) return null;
  for (const rule of RULES) {
    if (rule.words.some((w) => includesWord(name, w))) return ZONES[rule.zone];
  }
  return null;
}

function compareByZone(aName: string, bName: string): number {
  const aPos = stockZoneFor(aName)?.position ?? Number.MAX_SAFE_INTEGER;
  const bPos = stockZoneFor(bName)?.position ?? Number.MAX_SAFE_INTEGER;
  if (aPos !== bPos) return aPos - bPos;
  return aName.localeCompare(bName);
}

// Walking order, then name, so it is the same every time and easy to find your
// place in.
export function sortByStockZone<T>(rows: T[], nameOf: (row: T) => string): T[] {
  return [...rows].sort((a, b) => compareByZone(nameOf(a), nameOf(b)));
}

// The same list split into runs by zone, for headings. Items with no known
// zone share one run at the end (zone null).
export function groupByStockZone<T>(rows: T[], nameOf: (row: T) => string): { zone: StockZone | null; rows: T[] }[] {
  const groups: { zone: StockZone | null; rows: T[] }[] = [];
  for (const row of sortByStockZone(rows, nameOf)) {
    const zone = stockZoneFor(nameOf(row));
    const last = groups[groups.length - 1];
    if (last && (last.zone?.id ?? null) === (zone?.id ?? null)) last.rows.push(row);
    else groups.push({ zone, rows: [row] });
  }
  return groups;
}
