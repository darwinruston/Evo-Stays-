import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const users: { name: string; email: string; password: string; role: Role }[] = [
    { name: "Admin User", email: "admin@evostays.test", password: "password123", role: Role.ADMIN },
    { name: "Office User", email: "office@evostays.test", password: "password123", role: Role.OFFICE },
    { name: "Cleaner User", email: "cleaner@evostays.test", password: "password123", role: Role.CLEANER },
    { name: "Client User", email: "client@evostays.test", password: "password123", role: Role.CLIENT },
  ];

  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { name: u.name, email: u.email, passwordHash, role: u.role },
    });
  }

  console.log("Seeded users:", users.map((u) => `${u.email} / ${u.password}`).join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
