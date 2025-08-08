#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Building @roast/db package...');

// Step 1: Run TypeScript compiler
console.log('1. Compiling TypeScript...');
try {
  execSync('tsc', { stdio: 'inherit' });
} catch (error) {
  console.error('TypeScript compilation failed:', error.message);
  process.exit(1);
}

// Step 2: Create symlink to generated Prisma client
console.log('2. Creating symlink to Prisma client...');
const distDir = path.join(__dirname, 'dist');
const generatedLink = path.join(distDir, 'generated');
const generatedTarget = path.join(__dirname, 'generated');

// Remove existing symlink if it exists
if (fs.existsSync(generatedLink)) {
  fs.unlinkSync(generatedLink);
}

// Create relative symlink
fs.symlinkSync('../generated', generatedLink);
console.log(`   Created symlink: dist/generated -> ../generated`);

console.log('✅ Build complete!');