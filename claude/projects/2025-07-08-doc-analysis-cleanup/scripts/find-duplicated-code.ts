#!/usr/bin/env tsx

/**
 * Script to identify duplicated code patterns in the documentAnalysis system
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { glob } from 'glob';

const ANALYSIS_DIR = join(process.cwd(), 'src/lib/documentAnalysis');

// Known duplication patterns to check
const DUPLICATION_PATTERNS = [
  {
    name: 'Anthropic Error Handling',
    pattern: /if \(error\?\.status === 429\)[\s\S]*?throw new Error.*Anthropic API error/,
    minLength: 200
  },
  {
    name: 'Format Fixing Function',
    pattern: /function formatFixing|const formatFixing/,
    minLength: 50
  },
  {
    name: 'Logger vs Console',
    pattern: /(logger\.error|console\.error)/g,
    minLength: 0
  }
];

async function findDuplicatedCode() {
  console.log('🔍 Searching for duplicated code in documentAnalysis...\n');

  const files = await glob('**/*.ts', { 
    cwd: ANALYSIS_DIR,
    ignore: ['**/*.test.ts', '**/node_modules/**']
  });

  const results: Record<string, { files: string[], instances: string[] }> = {};

  for (const file of files) {
    const filePath = join(ANALYSIS_DIR, file);
    const content = readFileSync(filePath, 'utf-8');

    for (const { name, pattern, minLength } of DUPLICATION_PATTERNS) {
      const matches = content.match(pattern);
      
      if (matches && matches[0].length >= minLength) {
        if (!results[name]) {
          results[name] = { files: [], instances: [] };
        }
        
        results[name].files.push(file);
        results[name].instances.push(matches[0].substring(0, 100) + '...');
      }
    }
  }

  // Report findings
  console.log('📊 Duplication Report:\n');

  for (const [patternName, data] of Object.entries(results)) {
    if (data.files.length > 1) {
      console.log(`❌ ${patternName} - Found in ${data.files.length} files:`);
      data.files.forEach(f => console.log(`   - ${f}`));
      console.log('');
    }
  }

  // Check for inconsistent error handling
  let loggerCount = 0;
  let consoleCount = 0;

  for (const file of files) {
    const content = readFileSync(join(ANALYSIS_DIR, file), 'utf-8');
    const loggerMatches = content.match(/logger\.error/g);
    const consoleMatches = content.match(/console\.error/g);
    
    if (loggerMatches) loggerCount += loggerMatches.length;
    if (consoleMatches) consoleCount += consoleMatches.length;
  }

  console.log('⚠️  Inconsistent Error Logging:');
  console.log(`   - logger.error: ${loggerCount} occurrences`);
  console.log(`   - console.error: ${consoleCount} occurrences`);
  console.log('');

  // Check for lost data fields
  console.log('💾 Data Loss Check:');
  console.log('   Checking if comment title field is used...');
  
  const commentExtractionFile = readFileSync(
    join(ANALYSIS_DIR, 'commentExtraction/index.ts'), 
    'utf-8'
  );
  
  if (!commentExtractionFile.includes('title:')) {
    console.log('   ❌ Comment title field is generated but never saved!');
  }
  
  if (!commentExtractionFile.includes('observation') && 
      !commentExtractionFile.includes('significance')) {
    console.log('   ❌ Observation and significance fields are generated but never saved!');
  }
}

findDuplicatedCode().catch(console.error);