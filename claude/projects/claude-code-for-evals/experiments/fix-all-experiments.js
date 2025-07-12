#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Files to fix
const files = [
  '09-file-io-comparison/with-file-io.js',
  '09-file-io-comparison/with-preload.js',
  '10-chunked-analysis/analyze-chunks.js',
  '11-focused-tasks/find-math-errors.js',
  '11-focused-tasks/find-typos.js',
  '11-focused-tasks/find-contradictions.js'
];

const importFix = `import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from project root
dotenv.config({ path: path.join(__dirname, '../../../../../.env') });

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ERROR: ANTHROPIC_API_KEY not found in environment');
  console.error('Please set ANTHROPIC_API_KEY in your .env file');
  process.exit(1);
}
`;

files.forEach(file => {
  if (file === '09-file-io-comparison/with-file-io.js') {
    console.log(`✓ Already fixed ${file}`);
    return;
  }
  
  const filePath = path.join(__dirname, file);
  console.log(`Fixing ${file}...`);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if already fixed
    if (content.includes('dotenv')) {
      console.log(`✓ Already has dotenv import`);
      return;
    }
    
    // Add imports after the Anthropic import
    content = content.replace(
      /import Anthropic from '@anthropic-ai\/sdk';/,
      `import Anthropic from '@anthropic-ai/sdk';\n${importFix}`
    );
    
    // Fix the Anthropic initialization
    content = content.replace(
      /const anthropic = new Anthropic\(\);/,
      'const anthropic = new Anthropic({\n  apiKey: process.env.ANTHROPIC_API_KEY\n});'
    );
    
    fs.writeFileSync(filePath, content);
    console.log(`✓ Fixed ${file}`);
  } catch (error) {
    console.error(`✗ Error fixing ${file}:`, error.message);
  }
});

console.log('\nNow installing dotenv...');
const { execSync } = require('child_process');
execSync('npm install dotenv', { stdio: 'inherit', cwd: path.join(__dirname, '../../../../..') });

console.log('\n✅ All experiments fixed! They should now load your API key from .env');