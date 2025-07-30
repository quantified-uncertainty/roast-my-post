#!/usr/bin/env tsx
/**
 * Script to help replace console.log/error with structured logging
 * Run: npx tsx scripts/replace-console-logs.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import path from 'path';

// Files to process
const files = glob.sync('src/**/*.{ts,tsx}', {
  ignore: [
    '**/node_modules/**',
    '**/*.test.ts',
    '**/*.test.tsx',
    '**/logger.ts', // Don't modify the logger itself
  ],
});

let totalReplacements = 0;

files.forEach((file: string) => {
  let content = readFileSync(file, 'utf-8');
  let fileModified = false;
  
  // Check if file has console statements
  if (!content.includes('console.')) {
    return;
  }
  
  // Add logger import if needed and file has console statements to replace
  if (content.includes('console.error') || content.includes('console.log')) {
    if (!content.includes('import { logger }') && !content.includes('from "@/lib/logger"')) {
      // Add import at the top after the first import or at the beginning
      const importMatch = content.match(/^import .* from ['"].*['"];/m);
      if (importMatch) {
        const insertPos = importMatch.index! + importMatch[0].length;
        content = content.slice(0, insertPos) + '\nimport { logger } from "@/lib/logger";' + content.slice(insertPos);
      } else {
        content = 'import { logger } from "@/lib/logger";\n\n' + content;
      }
      fileModified = true;
    }
  }
  
  // Replace console.error with logger.error
  const errorMatches = content.match(/console\.error\(['"]([^'"]+)['"],?\s*(.*?)\);/g);
  if (errorMatches) {
    errorMatches.forEach(match => {
      const messageMatch = match.match(/console\.error\(['"]([^'"]+)['"],?\s*(.*?)\);/);
      if (messageMatch) {
        const message = messageMatch[1];
        const extraArgs = messageMatch[2];
        
        let replacement;
        if (extraArgs) {
          replacement = `logger.error('${message}', ${extraArgs});`;
        } else {
          replacement = `logger.error('${message}');`;
        }
        
        content = content.replace(match, replacement);
        totalReplacements++;
        fileModified = true;
      }
    });
  }
  
  // Replace console.log with logger.info (for production code)
  // Skip if it looks like debug output
  const logMatches = content.match(/console\.log\((?!.*\bDEBUG\b).*?\);/gs);
  if (logMatches) {
    logMatches.forEach(match => {
      // Simple console.log('message') pattern
      const simpleMatch = match.match(/console\.log\(['"]([^'"]+)['"]\);/);
      if (simpleMatch) {
        const message = simpleMatch[1];
        const replacement = `logger.info('${message}');`;
        content = content.replace(match, replacement);
        totalReplacements++;
        fileModified = true;
      }
    });
  }
  
  // Write back if modified
  if (fileModified) {
    writeFileSync(file, content);
    console.log(`✅ Updated ${path.relative(process.cwd(), file)}`);
  }
});

console.log(`\n🎉 Replaced ${totalReplacements} console statements across ${files.length} files`);
console.log('\nRemaining manual work:');
console.log('1. Review complex console.log statements that need manual conversion');
console.log('2. Add appropriate context objects to logger calls');
console.log('3. Replace console.warn with logger.warn');
console.log('4. Test that logging still works as expected');