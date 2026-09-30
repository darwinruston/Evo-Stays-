import { Role, PropertyType, CleanStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma, scopedDb } from "@/lib/prisma";

async function main() {
  // The platform owner's own account -- deliberately a separate login under
  // its own organization, not the Demo Cleaning Co admin below. That
  // account is a customer using Evo Stays as a service, same as any other
  // organization; this one is the platform owner managing the platform
  // itself (see requirePlatformOwner in src/lib/authz.ts and the /owner
  // area), and the two should never be the same login. The organization
  // this account technically belongs to is just satisfying the schema's
  // FK (every User needs one) -- the owner never sees it, since /owner
  // never scopes into its own organization the way /admin does.
  const platformOrg = await prisma.organization.upsert({
    where: { id: "seed-org-platform" },
    update: {},
    create: { id: "seed-org-platform", name: "Platform Administration" },
  });
  await scopedDb(platformOrg.id).user.upsert({
    where: { email: "owner@evostays.test" },
    update: {},
    create: {
      organizationId: platformOrg.id,
      name: "Platform Owner",
      email: "owner@evostays.test",
      passwordHash: await bcrypt.hash("password123", 10),
      role: Role.ADMIN,
    },
  });

  // Everything below belongs to one demo organization -- a fresh install's
  // very first real customer (the JFMS-equivalent -- see the createStaff
  // comment on PLATFORM_OWNER_EMAIL in .env). Organization itself carries no
  // RLS (see UNSCOPED_MODELS in src/lib/prisma.ts), so this upsert uses the
  // raw client directly; everything else goes through the scoped `db` built
  // from it, since RLS would otherwise reject every insert below (its WITH
  // CHECK has nothing to compare against without app.current_organization_id
  // set).
  const organization = await prisma.organization.upsert({
    where: { id: "seed-org-demo" },
    update: {},
    create: { id: "seed-org-demo", name: "Demo Cleaning Co" },
  });
  const db = scopedDb(organization.id);

  const staff: { name: string; email: string; password: string; role: Role }[] = [
    { name: "Admin User", email: "admin@evostays.test", password: "password123", role: Role.ADMIN },
    { name: "Office User", email: "office@evostays.test", password: "password123", role: Role.OFFICE },
    // Two cleaners on purpose: a cleaner may only see properties they're
    // assigned at, and proving that needs someone to be shut out of one.
    { name: "Cleaner User", email: "cleaner@evostays.test", password: "password123", role: Role.CLEANER },
    { name: "Second Cleaner", email: "cleaner2@evostays.test", password: "password123", role: Role.CLEANER },
  ];

  for (const u of staff) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await db.user.upsert({
      where: { email: u.email },
      update: {},
      create: { organizationId: organization.id, name: u.name, email: u.email, passwordHash, role: u.role },
    });
  }

  // Two clients (contact records only -- no login, see prisma/schema.prisma).
  // Two rather than one on purpose: the thing most worth testing in this app
  // is that a cleaner can't reach a property they're not assigned at, which
  // needs a second portfolio to fail against.
  const harbour = await db.client.upsert({
    where: { id: "seed-client-harbour" },
    update: {},
    create: {
      id: "seed-client-harbour",
      organizationId: organization.id,
      name: "Harbour Lets",
      email: "hello@harbourlets.example",
      phone: "07700 900123",
      properties: {
        create: [
          {
            organizationId: organization.id,
            name: "Riverside Loft",
            address: "12 Wapping High Street, London, E1W 1NJ",
            type: PropertyType.APARTMENT,
            bedrooms: 2,
            bathrooms: 1,
            maxOccupancy: 4,
            accessOptions: ["KEY_SAFE", "LIFT", "COMMUNAL_ENTRANCE"],
            accessNotes: "Key safe to the left of the main door, code 4821. Lift to 3rd floor.",
          },
          {
            organizationId: organization.id,
            name: "Dockside Studio",
            address: "4 Narrow Street, London, E14 8DP",
            type: PropertyType.STUDIO,
            bedrooms: 1,
            bathrooms: 1,
            maxOccupancy: 2,
            accessOptions: ["SMART_LOCK", "STAIRS_ONLY"],
            accessNotes: "Keypad code changes weekly — check the schedule before travelling.",
          },
        ],
      },
    },
  });

  const peak = await db.client.upsert({
    where: { id: "seed-client-peak" },
    update: {},
    create: {
      id: "seed-client-peak",
      organizationId: organization.id,
      name: "Peak Retreats",
      email: "stay@peakretreats.example",
      phone: "07700 900456",
      properties: {
        create: [
          {
            organizationId: organization.id,
            name: "Millstone Cottage",
            address: "3 Church Lane, Hathersage, S32 1AJ",
            type: PropertyType.COTTAGE,
            bedrooms: 3,
            bathrooms: 2,
            maxOccupancy: 6,
            accessOptions: ["LOCKBOX", "PARKING_ON_SITE"],
            accessNotes: "Lockbox on the gatepost. Parking for two cars on the drive.",
          },
        ],
      },
    },
  });

  // Cleans. cleaner@ works the Harbour Lets places; cleaner2@ has the Peak
  // Retreats cottage, so cleaner@ has a property they must not be able to
  // reach.
  const [admin, cleaner1, cleaner2] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { email: "admin@evostays.test" } }),
    db.user.findUniqueOrThrow({ where: { email: "cleaner@evostays.test" } }),
    db.user.findUniqueOrThrow({ where: { email: "cleaner2@evostays.test" } }),
  ]);

  const [riverside, dockside, millstone] = await Promise.all([
    db.property.findFirstOrThrow({ where: { name: "Riverside Loft" } }),
    db.property.findFirstOrThrow({ where: { name: "Dockside Studio" } }),
    db.property.findFirstOrThrow({ where: { name: "Millstone Cottage" } }),
  ]);

  function at(daysFromNow: number, hour: number): Date {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    d.setHours(hour, 0, 0, 0);
    return d;
  }

  const cleans = [
    {
      id: "seed-clean-riverside-past",
      propertyId: riverside.id,
      assignedToId: cleaner1.id,
      scheduledFor: at(-3, 11),
      status: CleanStatus.COMPLETED,
      instructions: "Guest checked out early — full turnover, restock the welcome tray.",
    },
    {
      id: "seed-clean-riverside-next",
      propertyId: riverside.id,
      assignedToId: cleaner1.id,
      scheduledFor: at(1, 11),
      status: CleanStatus.PENDING,
      instructions: "Back-to-back booking, guest arrives 3pm sharp.",
    },
    {
      id: "seed-clean-dockside-today",
      propertyId: dockside.id,
      assignedToId: cleaner1.id,
      scheduledFor: at(0, 14),
      status: CleanStatus.PENDING,
      instructions: null,
    },
    {
      id: "seed-clean-millstone",
      propertyId: millstone.id,
      assignedToId: cleaner2.id,
      scheduledFor: at(2, 10),
      status: CleanStatus.PENDING,
      instructions: "Log burner needs emptying between stays.",
    },
  ];

  for (const c of cleans) {
    await db.clean.upsert({
      where: { id: c.id },
      update: {},
      create: { organizationId: organization.id, ...c, createdById: admin.id },
    });
  }

  // A completed clean needs its log, otherwise the history view has nothing
  // to show.
  await db.cleanLog.upsert({
    where: { cleanId: "seed-clean-riverside-past" },
    update: {},
    create: {
      organizationId: organization.id,
      cleanId: "seed-clean-riverside-past",
      recordedById: cleaner1.id,
      note: "All done. Shower sealant is starting to go mouldy — worth flagging to the owner.",
      arrivedAt: at(-3, 11),
      departedAt: at(-3, 13),
    },
  });

  // A starter catalogue and one property's stock levels -- bin bags and hand
  // soap seeded as Low, so the "running low" view has something to show
  // without needing a real clean to happen first.
  const stockItemDefs = [
    { name: "Toilet roll", unit: "roll" },
    { name: "Bin bags", unit: "bag" },
    { name: "Hand soap", unit: "bottle" },
    { name: "Welcome tea/coffee", unit: "sachet" },
  ];
  const stockItems = await Promise.all(
    stockItemDefs.map((s) =>
      db.stockItem.upsert({
        where: { organizationId_name: { organizationId: organization.id, name: s.name } },
        update: {},
        create: { organizationId: organization.id, ...s },
      }),
    ),
  );
  const [toiletRoll, binBags, handSoap] = stockItems;

  const stockLevels = [
    { stockItemId: toiletRoll.id, band: "MEDIUM" as const },
    { stockItemId: binBags.id, band: "LOW" as const },
    { stockItemId: handSoap.id, band: "LOW" as const },
  ];
  for (const level of stockLevels) {
    await db.propertyStockLevel.upsert({
      where: { propertyId_stockItemId: { propertyId: riverside.id, stockItemId: level.stockItemId } },
      update: {},
      create: { organizationId: organization.id, propertyId: riverside.id, ...level },
    });
  }

  console.log("Seeded platform owner login: owner@evostays.test / password123");
  console.log(
    "Seeded logins:",
    staff.map((u) => `${u.email} / password123`).join(", "),
  );
  console.log("Seeded organization:", organization.name);
  console.log("Seeded clients:", [harbour.name, peak.name].join(", "));
  console.log("Seeded cleans:", cleans.length);
  console.log("Seeded stock items:", stockItems.map((s) => s.name).join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
