import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Lionheart2005", 12);

  const admin = await prisma.user.upsert({
    where: { email: "gitauevans6@gmail.com" },
    update: {},
    create: {
      name: "Admin",
      email: "gitauevans6@gmail.com",
      passwordHash,
      isAdmin: true,
    },
  });

  console.log("Admin user created:", admin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });