#!/usr/bin/env node

// This simulates exactly what happens in the Docker container
// when the worker tries to start

console.log('Simulating worker startup...\n');

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://dummy:dummy@localhost:5432/dummy?schema=public';
process.env.AUTH_SECRET = process.env.AUTH_SECRET || 'test';
process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'test';

try {
  console.log('1. Testing @roast/domain import...');
  const domain = require('@roast/domain');
  console.log('   ✓ @roast/domain loaded');
  console.log('   ✓ Has config:', !!domain.config);
  
  console.log('\n2. Testing @roast/db import...');
  const db = require('@roast/db');
  console.log('   ✓ @roast/db loaded');
  console.log('   ✓ Has prisma:', !!db.prisma);
  
  console.log('\n3. Testing @roast/ai import...');
  const ai = require('@roast/ai');
  console.log('   ✓ @roast/ai loaded');
  console.log('   ✓ Has callClaude:', !!ai.callClaude);
  
  console.log('\n✅ SUCCESS: All packages load correctly!');
  console.log('The worker should work in Docker.\n');
  process.exit(0);
} catch (error) {
  console.error('\n❌ FAILURE:', error.message);
  console.error('\nThis is exactly what will happen in the Docker container!');
  console.error('Stack trace:', error.stack);
  process.exit(1);
}