#!/usr/bin/env tsx
/**
 * Script to add an API key to the database
 * Usage: tsx scripts/add-api-key.ts <userId> <keyName> <plainKey>
 */

import { prisma } from '@/lib/prisma';
import { hashApiKey } from '@/lib/crypto';

async function main() {
  const [userId, keyName, plainKey] = process.argv.slice(2);
  
  if (!userId || !keyName || !plainKey) {
    console.error('Usage: tsx scripts/add-api-key.ts <userId> <keyName> <plainKey>');
    console.error('Example: tsx scripts/add-api-key.ts user123 "My API Key" rmp_abc123...');
    process.exit(1);
  }
  
  if (!plainKey.startsWith('rmp_')) {
    console.error('API key must start with "rmp_"');
    process.exit(1);
  }
  
  try {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      // Try to find by email instead
      const userByEmail = await prisma.user.findUnique({
        where: { email: userId }
      });
      
      if (!userByEmail) {
        console.error(`User not found: ${userId}`);
        process.exit(1);
      }
      
      // Use the found user
      const hashedKey = hashApiKey(plainKey);
      
      const apiKey = await prisma.apiKey.create({
        data: {
          key: hashedKey,
          name: keyName,
          userId: userByEmail.id,
        }
      });
      
      console.log(`✅ API key created successfully!`);
      console.log(`   Name: ${apiKey.name}`);
      console.log(`   User: ${userByEmail.email} (${userByEmail.id})`);
      console.log(`   Created: ${apiKey.createdAt}`);
      console.log(`   Plain key: ${plainKey}`);
      console.log(`   ID: ${apiKey.id}`);
    } else {
      const hashedKey = hashApiKey(plainKey);
      
      const apiKey = await prisma.apiKey.create({
        data: {
          key: hashedKey,
          name: keyName,
          userId: user.id,
        }
      });
      
      console.log(`✅ API key created successfully!`);
      console.log(`   Name: ${apiKey.name}`);
      console.log(`   User: ${user.email} (${user.id})`);
      console.log(`   Created: ${apiKey.createdAt}`);
      console.log(`   Plain key: ${plainKey}`);
      console.log(`   ID: ${apiKey.id}`);
    }
    
  } catch (error) {
    console.error('Error creating API key:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();