// A made-up company, only for taking the public website's screenshots (see
// capture.mjs beside this). Everything in it is invented. Rebuilds itself from
// scratch each time, and `--remove` takes it away again.
//
//   npx tsx scripts/marketing/demo-data.ts
//
// For a local database only: it refuses to run in production.
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import sharp from "sharp";
import { prisma, scopedDb } from "../../src/lib/prisma";

const ORG = "showcase-org";
// A new random password every time, for the logins capture.mjs signs in with.
// Never written into the code, so running this somewhere real by mistake does
// not create logins anyone could guess. Kept in storage/, which is not in git.
const PASSWORD = randomBytes(18).toString("base64url");
const PASSWORD_FILE = path.join(process.cwd(), "storage", "showcase-password.txt");

const day = (offset: number, hour = 11, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(hour, minute, 0, 0);
  return d;
};
// A calendar date with no time, as tasks and safety checks store them.
const date = (offset: number) => {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate() + offset));
};

// A simple drawn picture of a building, so property pages have a cover without
// using anyone's photograph.
async function cover(propertyId: string, sky: string, wall: string, roof: string): Promise<string> {
  const windows = [0, 1, 2]
    .flatMap((c) => [0, 1].map((r) => `<rect x="${250 + c * 110}" y="${270 + r * 110}" width="64" height="70" rx="6" fill="#fef9c3"/>`))
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
    <rect width="800" height="600" fill="${sky}"/>
    <circle cx="660" cy="110" r="52" fill="#fde68a"/>
    <path d="M190 240 L400 110 L610 240 Z" fill="${roof}"/>
    <rect x="215" y="230" width="370" height="290" fill="${wall}"/>
    ${windows}
    <rect x="368" y="420" width="64" height="100" rx="8" fill="${roof}"/>
    <rect y="515" width="800" height="85" fill="#4d7c5f"/>
  </svg>`;
  const dir = path.join(process.cwd(), "storage", "property-photos", propertyId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "cover.png"), await sharp(Buffer.from(svg)).png().toBuffer());
  return `${propertyId}/cover.png`;
}

async function remove() {
  const db = scopedDb(ORG);
  // In an order that never leaves something pointing at a row already gone.
  await db.notification.deleteMany({});
  await db.auditLog.deleteMany({});
  await db.task.deleteMany({});
  await db.issue.deleteMany({});
  await db.clean.deleteMany({});
  await db.cleanSeries.deleteMany({});
  await db.property.deleteMany({});
  await db.client.deleteMany({});
  await db.stockItem.deleteMany({});
  await db.user.deleteMany({});
  await db.laundryFacility.deleteMany({});
  await prisma.organization.deleteMany({ where: { id: ORG } });
}

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Demo data is for a local database only");
  await remove();
  if (process.argv.includes("--remove")) return console.log("Removed.");

  await prisma.organization.create({
    data: { id: ORG, name: "Brightside Property Care", onboardingCompletedAt: new Date() },
  });
  const db = scopedDb(ORG);
  const organizationId = ORG;
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const laundry = await db.laundryFacility.create({
    data: { organizationId, name: "Fresh Fold Linen", depotAddress: "Unit 4, Mill Road, Sheffield, S1 4RG" },
  });

  const person = (name: string, email: string, role: "ADMIN" | "OFFICE" | "CLEANER" | "LINEN", extra = {}) =>
    db.user.create({ data: { organizationId, name, email, role, passwordHash, ...extra } });
  const sam = await person("Sam Taylor", "showcase.admin@evostays.test", "ADMIN");
  const alex = await person("Alex Morgan", "showcase.office@evostays.test", "OFFICE");
  const priya = await person("Priya Shah", "showcase.priya@evostays.test", "CLEANER", { hourlyRate: 14.5 });
  const marcus = await person("Marcus Reid", "showcase.marcus@evostays.test", "CLEANER", { hourlyRate: 14.5 });
  const jo = await person("Jo Evans", "showcase.jo@evostays.test", "CLEANER", { hourlyRate: 15 });
  await person("Fresh Fold", "showcase.linen@evostays.test", "LINEN", { laundryFacilityId: laundry.id });

  const harbour = await db.client.create({ data: { organizationId, name: "Harbour Lets" } });
  const peak = await db.client.create({ data: { organizationId, name: "Peak Retreats" } });

  const listed = ["Dishwasher", "Washer", "Dryer", "Oven", "Microwave", "Refrigerator", "Kettle", "Toaster", "Bathtub", "Hair dryer", "Iron"];
  const places = [
    { id: "showcase-riverside", client: harbour, nickname: "Riverside Loft", address: "12 Wapping High Street, London, E1W 1NJ", type: "APARTMENT", beds: 2, baths: 1, sleeps: 4, cleaner: priya, art: ["#bae6fd", "#f8fafc", "#0f766e"], extra: ["Private entrance"], notes: "Key safe to the left of the main door, code 4821. Lift to the 3rd floor." },
    { id: "showcase-dockside", client: harbour, nickname: "Dockside Studio", address: "4 Narrow Street, London, E14 8DP", type: "STUDIO", beds: 1, baths: 1, sleeps: 2, cleaner: priya, art: ["#fecdd3", "#fff7ed", "#9f1239"], extra: [], notes: "Smart lock on the front door. Stairs only." },
    { id: "showcase-millstone", client: peak, nickname: "Millstone Cottage", address: "3 Church Lane, Hathersage, S32 1AJ", type: "COTTAGE", beds: 3, baths: 2, sleeps: 6, cleaner: marcus, art: ["#ddd6fe", "#fef3c7", "#6d28d9"], extra: ["Garden or backyard", "Indoor fireplace", "Free parking on premises"], notes: "Lockbox on the gatepost. Parking for two cars on the drive." },
    { id: "showcase-weir", client: peak, nickname: "Weir House", address: "8 Dale Road, Bakewell, DE45 1PW", type: "HOUSE", beds: 4, baths: 3, sleeps: 8, cleaner: jo, art: ["#bbf7d0", "#e2e8f0", "#1e3a8a"], extra: ["Hot tub", "BBQ grill", "Garden or backyard"], notes: "Key safe by the side gate, code 2096." },
    { id: "showcase-quay", client: harbour, nickname: "Quay Penthouse", address: "21 Clove Hitch Quay, London, SW11 3TN", type: "APARTMENT", beds: 3, baths: 2, sleeps: 6, cleaner: jo, art: ["#fed7aa", "#f1f5f9", "#c2410c"], extra: ["Patio or balcony", "Elevator in building", "EV charger"], notes: "Concierge holds the fob. Ask for flat 21." },
  ] as const;

  for (const p of places) {
    await db.property.create({
      data: {
        id: p.id,
        organizationId,
        clientId: p.client.id,
        nickname: p.nickname,
        name: p.nickname,
        address: p.address,
        type: p.type,
        bedrooms: p.beds,
        bathrooms: p.baths,
        maxOccupancy: p.sleeps,
        accessNotes: p.notes,
        accessOptions: ["KEY_SAFE"],
        amenities: [...listed, ...p.extra],
        amenitiesSyncedAt: new Date(),
        laundryFacilityId: laundry.id,
      },
    });
    const [sky, wall, roof] = p.art;
    await db.propertyImage.create({
      data: { organizationId, propertyId: p.id, path: await cover(p.id, sky, wall, roof), isPrimary: true },
    });
    await db.propertyCleaner.create({ data: { organizationId, propertyId: p.id, cleanerId: p.cleaner.id } });
  }

  const items: Record<string, string> = {};
  for (const name of ["Toilet roll", "Bin bags", "Hand soap", "Welcome tea and coffee", "Dishwasher tablets", "Rinse aid", "Washing up liquid"]) {
    items[name] = (await db.stockItem.create({ data: { organizationId, name } })).id;
  }
  const bands = ["HIGH", "HIGH", "MEDIUM", "HIGH", "LOW", "MEDIUM", "HIGH"] as const;
  for (const p of places) {
    let i = 0;
    for (const id of Object.values(items)) {
      const band = p.id === "showcase-riverside" ? bands[i] : "HIGH";
      await db.propertyStockLevel.create({ data: { organizationId, propertyId: p.id, stockItemId: id, band } });
      i++;
    }
  }

  const clean = (id: string, propertyId: string, assignedToId: string, when: Date, extra = {}) =>
    db.clean.create({
      data: { id, organizationId, propertyId, assignedToId, createdById: sam.id, scheduledFor: when, guestCount: 4, ...extra },
    });
  const today1 = await clean("showcase-c1", "showcase-riverside", priya.id, day(0, 11), { instructions: "Guests arrive at 3pm. Please leave the welcome tray out.", plannedArrivalAt: day(0, 11) });
  await clean("showcase-c2", "showcase-millstone", marcus.id, day(0, 12), { plannedArrivalAt: day(0, 12, 15) });
  await clean("showcase-c3", "showcase-quay", jo.id, day(0, 14));
  await clean("showcase-c4", "showcase-dockside", priya.id, day(1, 10, 30));
  await clean("showcase-c5", "showcase-weir", jo.id, day(1, 11));
  await clean("showcase-c6", "showcase-riverside", priya.id, day(3, 11));
  await clean("showcase-c7", "showcase-millstone", marcus.id, day(4, 10));
  await clean("showcase-c8", "showcase-quay", jo.id, day(8, 11));
  const done = await clean("showcase-done", "showcase-weir", jo.id, day(-1, 11), { status: "COMPLETED", arrivedAt: day(-1, 11, 4) });
  await db.cleanLog.create({
    data: { organizationId, cleanId: done.id, recordedById: jo.id, teamSize: 2, arrivedAt: day(-1, 11, 4), departedAt: day(-1, 13, 40), note: "All done. Hot tub cover needs a new strap." },
  });

  await db.issue.create({
    data: { organizationId, propertyId: "showcase-riverside", cleanId: today1.id, reportedById: priya.id, category: "BROKEN", severity: "MEDIUM", description: "Shower tray cracked along the back edge, water getting underneath.", createdAt: day(-2, 12) },
  });
  await db.issue.create({
    data: { organizationId, propertyId: "showcase-weir", reportedById: jo.id, category: "APPLIANCE", severity: "LOW", description: "Hot tub cover strap has snapped.", createdAt: day(-1, 13) },
  });

  const task = async (title: string, offset: number, who: string[], extra = {}) => {
    const t = await db.task.create({ data: { organizationId, title, dueOn: date(offset), createdById: sam.id, ...extra } });
    for (const userId of who) await db.taskAssignee.create({ data: { organizationId, taskId: t.id, userId } });
    return t;
  };
  const onboarding = await task("Onboard Quay Penthouse", 6, [sam.id, alex.id], { propertyId: "showcase-quay", priority: "HIGH", status: "IN_PROGRESS" });
  let position = 0;
  for (const [title, status] of [["Photograph every room", "DONE"], ["Set up stock levels", "DONE"], ["Give the cleaners access notes", "TODO"], ["Check smoke alarms", "TODO"]] as const) {
    await db.task.create({ data: { organizationId, title, status, parentId: onboarding.id, position: position++, createdById: sam.id } });
  }
  await task("Replace shower tray at Riverside Loft", 2, [alex.id], { propertyId: "showcase-riverside", priority: "URGENT" });
  await task("Order guest towels", 4, [alex.id]);
  await task("Check window locks", 12, [sam.id], { propertyId: "showcase-millstone", repeat: "QUARTERLY" });

  const check = (propertyId: string, templateKey: string, title: string, months: number, done: number, due: number) =>
    db.propertySafetyCheck.create({
      data: { organizationId, propertyId, templateKey, title, intervalMonths: months, lastCompletedOn: date(done), dueOn: date(due) },
    });
  await check("showcase-riverside", "gas-safety", "Gas safety certificate", 12, -355, 10);
  await check("showcase-millstone", "electrical", "Electrical safety report (EICR)", 60, -1780, 45);
  await check("showcase-weir", "alarms", "Smoke and carbon monoxide alarms tested", 1, -34, -4);
  await check("showcase-quay", "insurance", "Building and liability insurance", 12, -290, 75);
  await check("showcase-dockside", "gas-safety", "Gas safety certificate", 12, -60, 305);
  await check("showcase-riverside", "fire-risk", "Fire risk assessment", 12, -120, 245);

  await mkdir(path.dirname(PASSWORD_FILE), { recursive: true });
  await writeFile(PASSWORD_FILE, PASSWORD);
  console.log("Demo company ready: Brightside Property Care");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
