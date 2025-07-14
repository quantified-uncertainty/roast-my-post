import { prisma } from "../src/lib/prisma";

async function migratePricesToDollars() {
  console.log("Starting migration of priceInCents to priceInDollars...");
  
  // Get all tasks with priceInCents
  const tasks = await prisma.task.findMany({
    select: {
      id: true,
      priceInCents: true,
    },
  });
  
  console.log(`Found ${tasks.length} tasks to migrate`);
  
  // Update each task
  let updated = 0;
  for (const task of tasks) {
    await prisma.task.update({
      where: { id: task.id },
      data: {
        priceInDollars: task.priceInCents / 100, // Convert cents to dollars
      },
    });
    updated++;
    if (updated % 100 === 0) {
      console.log(`Updated ${updated} tasks...`);
    }
  }
  
  console.log(`Migration complete! Updated ${updated} tasks.`);
}

migratePricesToDollars()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });