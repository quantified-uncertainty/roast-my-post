#!/usr/bin/env npx tsx
import { prisma } from "../../src/lib/prisma";
import * as dotenv from 'dotenv';
import * as path from 'path';

// Check for --prod flag
const args = process.argv.slice(2);
const prodIndex = args.indexOf('--prod');
const isProd = prodIndex !== -1;

if (isProd) {
  // Remove --prod from args
  args.splice(prodIndex, 1);
  
  // Load production environment
  dotenv.config({ path: path.join(process.cwd(), '.env.production.local') });
  console.log('🚀 Running in production mode');
}

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

// Get email from command line argument (after removing --prod if present)
const email = args[0];

if (!email) {
  console.error("Usage: npm run set-admin [--prod] <email>");
  process.exit(1);
}

setAdmin(email);