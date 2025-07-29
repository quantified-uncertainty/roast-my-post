#!/usr/bin/env tsx

import { execSync } from 'child_process';
import * as path from 'path';

const projectRoot = '/Users/ozziegooen/Documents/Github/ui-cleanup';
const filesToCheck = [
  'src/lib/documentAnalysis/index.ts',
  'src/lib/documentAnalysis/multiEpistemicEval/demo-metadata.ts',
  'src/lib/documentAnalysis/utils/LocationUtils.ts',
  'src/lib/documentAnalysis/shared/types.ts',
  'src/lib/documentAnalysis/shared/simplePluginLocationWrappers.ts',
  'src/lib/documentAnalysis/shared/retryUtils.ts',
  'src/lib/documentAnalysis/shared/errorCategorization.ts',
  'src/lib/documentAnalysis/shared/enhancedPluginLocationWrappers.ts',
  'src/lib/documentAnalysis/linkAnalysis/prompts.ts',
  'src/lib/documentAnalysis/highlightGeneration/types.ts'
];

console.log('🔍 Verifying files are safe to delete...\n');

let allSafe = true;

for (const file of filesToCheck) {
  const fileName = path.basename(file, path.extname(file));
  const dirName = path.dirname(file);
  
  console.log(`Checking: ${file}`);
  
  // Search for imports of this file
  const searchPatterns = [
    fileName,
    file.replace('src/', ''),
    file.replace('src/', '@/'),
    `./${fileName}`,
    `../${fileName}`,
    file.replace(/\.ts$/, '')
  ];
  
  let found = false;
  let locations: string[] = [];
  
  for (const pattern of searchPatterns) {
    try {
      // Use grep to search (fallback since rg might not be available)
      const result = execSync(
        `cd "${projectRoot}" && grep -r "${pattern}" src --include="*.ts" --include="*.tsx" || true`,
        { encoding: 'utf-8' }
      ).trim();
      
      if (result) {
        const lines = result.split('\n').filter(line => {
          // Filter out the file itself and other false positives
          return !line.includes(file) && 
                 !line.includes('.test.') &&
                 !line.includes('// ') &&
                 !line.includes('* ');
        });
        
        if (lines.length > 0) {
          found = true;
          locations.push(...lines.map(l => l.split(':')[0]));
        }
      }
    } catch {
      // Ignore errors
    }
  }
  
  // Remove duplicates
  locations = [...new Set(locations)];
  
  if (found && locations.length > 0) {
    console.log(`  ❌ UNSAFE - Found imports in:`);
    locations.slice(0, 3).forEach(loc => console.log(`     ${loc}`));
    if (locations.length > 3) {
      console.log(`     ... and ${locations.length - 3} more`);
    }
    allSafe = false;
  } else {
    console.log(`  ✅ Safe to delete - no imports found`);
  }
  console.log();
}

if (allSafe) {
  console.log('✅ All files are safe to delete!\n');
  
  // Generate deletion script
  console.log('Run this command to delete all files:');
  console.log('```bash');
  for (const file of filesToCheck) {
    console.log(`git rm ${file}`);
  }
  console.log('```');
} else {
  console.log('⚠️  Some files may not be safe to delete. Please review the results above.');
}