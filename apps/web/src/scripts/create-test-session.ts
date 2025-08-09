#!/usr/bin/env npx tsx
/**
 * Create a test session directly in the database for development testing
 * Usage: npx tsx src/scripts/create-test-session.ts
 */

import { prisma } from '@roast/db';
import { randomBytes } from 'crypto';

async function createTestSession() {
  try {
    // Use the admin user or create a test user
    const user = await prisma.user.findFirst({
      where: { email: 'ozzieagooen@gmail.com' }
    });

    if (!user) {
      console.error('Admin user not found. Please create a user first.');
      process.exit(1);
    }

    // Generate a session token
    const sessionToken = randomBytes(32).toString('hex');
    
    // Create session that expires in 30 days
    const session = await prisma.session.create({
      data: {
        sessionToken,
        userId: user.id,
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      }
    });

    console.log('✅ Test session created successfully!');
    console.log('');
    console.log('To use this session, set the following cookie in your browser:');
    console.log('');
    console.log(`  Cookie Name: next-auth.session-token`);
    console.log(`  Cookie Value: ${sessionToken}`);
    console.log(`  Domain: localhost`);
    console.log(`  Path: /`);
    console.log('');
    console.log('You can set this cookie using browser DevTools:');
    console.log('1. Open DevTools (F12)');
    console.log('2. Go to Application/Storage tab');
    console.log('3. Click on Cookies > http://localhost:3000');
    console.log('4. Click "+" to add a new cookie');
    console.log('5. Set the name and value as shown above');
    console.log('');
    console.log('Or use this JavaScript in the browser console:');
    console.log(`document.cookie = "next-auth.session-token=${sessionToken}; path=/; max-age=2592000";`);
    console.log('');
    console.log('User details:');
    console.log(`  Email: ${user.email}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  User ID: ${user.id}`);

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error creating test session:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

createTestSession();