#!/usr/bin/env npx tsx
import { prisma } from "../src/lib/prisma";

async function setAdmin(email: string) {
  try {
    const user = await prisma.user.update({
      where: { email },
      data: { role: "ADMIN" },
    });
    
    console.log(`✅ Successfully set user ${user.email} as ADMIN`);
  } catch (error) {
    console.error("❌ Error setting admin:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.error("Usage: npm run set-admin <email>");
  process.exit(1);
}

setAdmin(email);