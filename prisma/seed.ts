import { PrismaClient, Role, PropertyType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const staff: { name: string; email: string; password: string; role: Role }[] = [
    { name: "Admin User", email: "admin@evostays.test", password: "password123", role: Role.ADMIN },
    { name: "Office User", email: "office@evostays.test", password: "password123", role: Role.OFFICE },
    { name: "Cleaner User", email: "cleaner@evostays.test", password: "password123", role: Role.CLEANER },
  ];

  for (const u of staff) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { name: u.name, email: u.email, passwordHash, role: u.role },
    });
  }

  // Two clients, each with their own login. Two rather than one on purpose:
  // the thing most worth testing in this app is that one host cannot reach
  // the other's portfolio, and that needs a second portfolio to fail against.
  const harbour = await prisma.client.upsert({
    where: { id: "seed-client-harbour" },
    update: {},
    create: {
      id: "seed-client-harbour",
      name: "Harbour Lets",
      email: "hello@harbourlets.example",
      phone: "07700 900123",
      properties: {
        create: [
          {
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

  const peak = await prisma.client.upsert({
    where: { id: "seed-client-peak" },
    update: {},
    create: {
      id: "seed-client-peak",
      name: "Peak Retreats",
      email: "stay@peakretreats.example",
      phone: "07700 900456",
      properties: {
        create: [
          {
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

  const clientLogins: { name: string; email: string; clientId: string }[] = [
    { name: "Harbour Lets", email: "client@evostays.test", clientId: harbour.id },
    { name: "Peak Retreats", email: "client2@evostays.test", clientId: peak.id },
  ];

  for (const c of clientLogins) {
    const passwordHash = await bcrypt.hash("password123", 10);
    await prisma.user.upsert({
      where: { email: c.email },
      update: { clientId: c.clientId },
      create: {
        name: c.name,
        email: c.email,
        passwordHash,
        role: Role.CLIENT,
        clientId: c.clientId,
      },
    });
  }

  console.log(
    "Seeded logins:",
    [...staff.map((u) => u.email), ...clientLogins.map((c) => c.email)]
      .map((e) => `${e} / password123`)
      .join(", "),
  );
  console.log("Seeded clients:", [harbour.name, peak.name].join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
