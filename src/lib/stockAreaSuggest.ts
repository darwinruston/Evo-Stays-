// Suggests where a stock item is usually kept from its name, so adding an item
// is faster: type "Toilet roll" and Bathroom is already chosen. It only ever
// suggests; the person can change it. No service is called: it is a built-in
// list of everyday short-let consumables and the kind of place each normally
// lives, matched to whatever the company has called its own areas.

type Kind = "kitchen" | "kitchen-cupboard" | "bathroom" | "bedroom" | "living" | "store";

// Most specific first: the first rule whose words appear in the name wins, so
// "toilet cleaner" (cleaning kit) is found before "toilet" (bathroom).
const RULES: { kind: Kind; words: string[] }[] = [
  {
    kind: "store",
    words: [
      "toilet cleaner", "toilet duck", "bleach", "disinfectant", "multi surface", "multi-surface", "surface spray",
      "cleaning spray", "glass cleaner", "polish", "descaler", "limescale", "mop", "bucket", "hoover", "vacuum",
      "dustpan", "brush head", "duster", "dusters", "microfibre", "gloves", "cleaning", "laundry", "washing powder",
      "washing liquid", "fabric softener", "dryer sheet", "detergent", "light bulb", "lightbulb", "bulbs", "batteries",
      "battery", "extension lead",
    ],
  },
  {
    kind: "kitchen-cupboard",
    words: [
      "bin bag", "bin liner", "bin bags", "dishwasher", "rinse aid", "dishwasher salt", "cling film", "clingfilm", "foil",
      "baking", "salt", "pepper", "spice", "olive oil", "cooking oil", "oil", "vinegar", "flour", "pasta", "rice",
      "food bag", "freezer bag", "sandwich bag", "oven cleaner", "oven glove",
    ],
  },
  {
    kind: "kitchen",
    words: [
      "kitchen roll", "kitchen towel", "washing up", "washing-up", "washing up liquid", "dish soap", "dishwashing",
      "washing-up liquid", "sponge", "sponges", "scourer", "scouring", "tea towel", "tea towels", "dish cloth",
      "dishcloth", "tea", "coffee", "sugar", "milk", "sweetener", "biscuit", "welcome", "water", "juice", "capsule",
      "pod", "filter", "kettle", "toaster",
    ],
  },
  {
    kind: "bathroom",
    words: [
      "toilet roll", "loo roll", "toilet paper", "toilet", "loo", "shampoo", "conditioner", "shower", "body wash",
      "body lotion", "bath", "hand soap", "hand wash", "handwash", "soap", "toothpaste", "toothbrush", "cotton", "razor",
      "sanitary", "tampon", "flannel", "face cloth", "mouthwash", "deodorant", "air freshener", "plug-in", "bath mat",
      "bathmat", "bathroom",
    ],
  },
  {
    kind: "bedroom",
    words: [
      "pillow", "duvet", "blanket", "mattress", "hanger", "hangers", "slipper", "sleep", "bedside", "sheet", "bedding",
      "throw", "cushion", "bedroom",
    ],
  },
  {
    kind: "living",
    words: ["tissue", "tissues", "candle", "matches", "remote", "board game", "games", "magazine", "book", "guide", "living", "lounge", "tv"],
  },
];

function includesWord(name: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Whole words only ("tea" is not "steam"), and a plural counts ("candle" matches "candles").
  return new RegExp(`(^|[^a-z])${escaped}(s|es)?($|[^a-z])`).test(name);
}

function kindFor(itemName: string): Kind | null {
  const name = itemName.toLowerCase().trim();
  if (name.length < 3) return null;
  for (const rule of RULES) {
    if (rule.words.some((w) => includesWord(name, w))) return rule.kind;
  }
  return null;
}

// What an area's name means, whatever the company has called it.
const has = (name: string, ...parts: string[]) => parts.some((p) => name.includes(p));
const isKitchen = (n: string) => has(n, "kitchen");
const isCupboard = (n: string) => has(n, "cupboard", "cabinet", "unit", "pantry", "under sink", "under-sink");

// Tried in order for each kind, so a company with only "Kitchen" still gets a
// sensible answer for something that would go in the kitchen cupboard.
const PREFERRED: Record<Kind, ((areaName: string) => boolean)[]> = {
  kitchen: [(n) => isKitchen(n) && !isCupboard(n), isKitchen],
  "kitchen-cupboard": [
    (n) => isKitchen(n) && isCupboard(n),
    (n) => has(n, "under sink", "under-sink"),
    (n) => isKitchen(n),
    (n) => has(n, "store", "utility", "storage"),
  ],
  bathroom: [(n) => has(n, "bathroom", "en-suite", "ensuite", "en suite", "shower room", "toilet", "wc", "cloakroom")],
  bedroom: [(n) => has(n, "bedroom", "bed room", "master", "guest room")],
  living: [(n) => has(n, "living", "lounge", "sitting", "front room", "reception")],
  store: [
    (n) => has(n, "store", "utility", "storage", "cleaning", "cleaner"),
    (n) => isCupboard(n) && !isKitchen(n),
    (n) => has(n, "cupboard", "cabinet"),
  ],
};

// The id of the company's area an item of this name most likely belongs in, or
// null when nothing in the name points anywhere (or the company has no area
// that fits). `areas` is the company's own list, in any order.
export function suggestStockArea(itemName: string, areas: { id: string; name: string }[]): string | null {
  const kind = kindFor(itemName);
  if (!kind) return null;
  for (const matches of PREFERRED[kind]) {
    const area = areas.find((a) => matches(a.name.toLowerCase()));
    if (area) return area.id;
  }
  return null;
}
