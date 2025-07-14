import { prisma } from "../src/lib/prisma";

async function dropPriceInCents() {
  console.log("Dropping priceInCents column...");
  
  try {
    await prisma.$executeRaw`ALTER TABLE "Task" DROP COLUMN "priceInCents"`;
    console.log("Successfully dropped priceInCents column!");
  } catch (e) {
    console.error("Failed to drop column:", e);
    throw e;
  }
}

dropPriceInCents()
  .catch((e) => {
    console.error("Script failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });