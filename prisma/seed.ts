import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_SUPER_ADMIN_EMAIL;
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("SEED_SUPER_ADMIN_EMAIL and SEED_SUPER_ADMIN_PASSWORD must be set in .env");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Super Admin already exists: ${email}`);
  } else {
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: {
        name: "Gym Owner",
        email,
        role: "SUPER_ADMIN",
        status: "ACTIVE",
        passwordHash,
      },
    });
    console.log(`✅ Super Admin created: ${email} — log in and change the password immediately.`);
  }

  const settings = await prisma.gymSettings.findUnique({ where: { id: "singleton" } });
  if (!settings) {
    await prisma.gymSettings.create({
      data: {
        id: "singleton",
        gymName: "Your Gym Name",
        addressLine: "123 Fitness Street, Your City",
        phone: "+91 90000 00000",
        email: "contact@yourgym.com",
        invoicePrefix: "INV",
        defaultPricing: { "1": 1200, "3": 3300, "6": 6000, "12": 10800 },
      },
    });
    console.log("✅ Default GymSettings created — update branding from Super Admin settings page.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
