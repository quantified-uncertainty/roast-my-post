#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Migrates a Jest test file to Vitest
 * @param {string} filePath - Path to the test file
 * @param {boolean} dryRun - If true, only show what would be changed
 */
function migrateFile(filePath, dryRun = false) {
  const content = fs.readFileSync(filePath, 'utf8');
  let modified = content;
  let changes = [];

  // 1. Update imports
  if (modified.includes("from 'jest'") || modified.includes('from "jest"')) {
    modified = modified.replace(/from ['"]jest['"]/g, "from 'vitest'");
    changes.push('Updated jest imports to vitest');
  }

  // 2. Replace jest.fn() with vi.fn()
  if (modified.includes('jest.fn(')) {
    modified = modified.replace(/\bjest\.fn\(/g, 'vi.fn(');
    changes.push('Replaced jest.fn() with vi.fn()');
  }

  // 3. Replace jest.mock() with vi.mock()
  if (modified.includes('jest.mock(')) {
    modified = modified.replace(/\bjest\.mock\(/g, 'vi.mock(');
    changes.push('Replaced jest.mock() with vi.mock()');
  }

  // 4. Replace jest.spyOn() with vi.spyOn()
  if (modified.includes('jest.spyOn(')) {
    modified = modified.replace(/\bjest\.spyOn\(/g, 'vi.spyOn(');
    changes.push('Replaced jest.spyOn() with vi.spyOn()');
  }

  // 5. Replace other jest.* methods
  const jestMethods = [
    'clearAllMocks', 'resetAllMocks', 'restoreAllMocks',
    'clearAllTimers', 'runAllTimers', 'runOnlyPendingTimers',
    'advanceTimersByTime', 'runAllTicks', 'useFakeTimers',
    'useRealTimers', 'setSystemTime', 'getRealSystemTime'
  ];

  jestMethods.forEach(method => {
    const pattern = new RegExp(`\\bjest\\.${method}\\(`, 'g');
    if (modified.match(pattern)) {
      modified = modified.replace(pattern, `vi.${method}(`);
      changes.push(`Replaced jest.${method}() with vi.${method}()`);
    }
  });

  // 6. Add vi import if needed
  if (changes.length > 0 && modified.includes('vi.')) {
    // Check if vi is already imported
    if (!modified.includes('{ vi }') && !modified.includes('{vi}')) {
      // Add vi to existing vitest import
      if (modified.includes("from 'vitest'")) {
        modified = modified.replace(
          /from 'vitest'/,
          (match) => {
            const importMatch = modified.match(/import\s*{([^}]+)}\s*from\s*'vitest'/);
            if (importMatch) {
              const imports = importMatch[1];
              if (!imports.includes('vi')) {
                return match.replace('{', '{ vi, ');
              }
            }
            return match;
          }
        );
        if (!modified.includes('{ vi')) {
          // If simple replacement didn't work, try a more complex pattern
          modified = modified.replace(
            /import\s*{\s*([^}]+)\s*}\s*from\s*'vitest'/,
            (match, imports) => {
              if (!imports.includes('vi')) {
                return `import { vi, ${imports} } from 'vitest'`;
              }
              return match;
            }
          );
        }
      } else {
        // Add new import for vi
        modified = `import { vi } from 'vitest';\n${modified}`;
        changes.push('Added vi import from vitest');
      }
    }
  }

  // 7. Remove @jest-environment comments
  if (modified.includes('@jest-environment')) {
    modified = modified.replace(/\/\*\*[\s\S]*?@jest-environment[\s\S]*?\*\//g, '');
    modified = modified.replace(/\/\/\s*@jest-environment.*/g, '');
    changes.push('Removed @jest-environment comments');
  }

  // 8. Rename file from .test.ts to .vtest.ts
  const newPath = filePath.replace(/\.(test|spec)\.(ts|tsx|js|jsx)$/, '.vtest.$2');

  if (changes.length === 0) {
    return { filePath, newPath, skipped: true };
  }

  if (dryRun) {
    log(`\nWould migrate: ${filePath}`, 'yellow');
    log(`  → ${newPath}`, 'blue');
    changes.forEach(change => log(`  - ${change}`, 'green'));
    return { filePath, newPath, changes, dryRun: true };
  }

  // Write the modified content
  fs.writeFileSync(filePath, modified);
  
  // Rename the file
  fs.renameSync(filePath, newPath);

  log(`\nMigrated: ${filePath}`, 'green');
  log(`  → ${newPath}`, 'blue');
  changes.forEach(change => log(`  - ${change}`, 'green'));

  return { filePath, newPath, changes, migrated: true };
}

/**
 * Find test files without jest-specific features
 */
async function findSimpleTests() {
  const { stdout } = await execAsync(
    `grep -L "jest\\." src/**/*.test.ts src/**/*.test.tsx 2>/dev/null || true`
  );
  
  return stdout
    .split('\n')
    .filter(file => file && !file.includes('node_modules') && !file.includes('.vtest.'));
}

/**
 * Find test files with jest features
 */
async function findTestsWithMocks() {
  const { stdout } = await execAsync(
    `grep -l "jest\\." src/**/*.test.ts src/**/*.test.tsx 2>/dev/null || true`
  );
  
  return stdout
    .split('\n')
    .filter(file => file && !file.includes('node_modules') && !file.includes('.vtest.'));
}

// Main CLI
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const options = args.slice(1);
  
  const dryRun = options.includes('--dry-run');
  const limit = options.includes('--limit') 
    ? parseInt(options[options.indexOf('--limit') + 1]) 
    : undefined;

  if (!command || command === 'help') {
    console.log(`
Vitest Migration Helper

Usage:
  node migrate-to-vitest.js <command> [options]

Commands:
  simple       Migrate simple tests without jest mocks
  with-mocks   Migrate tests that use jest.fn(), jest.mock(), etc.
  file <path>  Migrate a specific file
  list-simple  List simple test files (no jest features)
  list-mocks   List test files with jest features
  help         Show this help message

Options:
  --dry-run    Show what would be changed without modifying files
  --limit N    Only process N files

Examples:
  node migrate-to-vitest.js simple --limit 5 --dry-run
  node migrate-to-vitest.js file src/utils/example.test.ts
  node migrate-to-vitest.js with-mocks --limit 10
`);
    return;
  }

  if (command === 'file') {
    const filePath = args[1];
    if (!filePath) {
      log('Error: Please provide a file path', 'red');
      return;
    }
    migrateFile(filePath, dryRun);
    return;
  }

  if (command === 'list-simple') {
    const files = await findSimpleTests();
    log(`\nFound ${files.length} simple test files:`, 'blue');
    files.forEach(file => console.log(`  ${file}`));
    return;
  }

  if (command === 'list-mocks') {
    const files = await findTestsWithMocks();
    log(`\nFound ${files.length} test files with jest features:`, 'blue');
    files.forEach(file => console.log(`  ${file}`));
    return;
  }

  if (command === 'simple') {
    const files = await findSimpleTests();
    const toProcess = limit ? files.slice(0, limit) : files;
    
    log(`\nMigrating ${toProcess.length} simple test files...`, 'blue');
    
    for (const file of toProcess) {
      try {
        migrateFile(file, dryRun);
      } catch (error) {
        log(`Error migrating ${file}: ${error.message}`, 'red');
      }
    }
    
    log(`\n✅ Processed ${toProcess.length} files`, 'green');
    return;
  }

  if (command === 'with-mocks') {
    const files = await findTestsWithMocks();
    const toProcess = limit ? files.slice(0, limit) : files;
    
    log(`\nMigrating ${toProcess.length} test files with mocks...`, 'blue');
    
    for (const file of toProcess) {
      try {
        migrateFile(file, dryRun);
      } catch (error) {
        log(`Error migrating ${file}: ${error.message}`, 'red');
      }
    }
    
    log(`\n✅ Processed ${toProcess.length} files`, 'green');
    return;
  }

  log(`Unknown command: ${command}`, 'red');
  log('Run "node migrate-to-vitest.js help" for usage information', 'yellow');
}

// Run the CLI
if (require.main === module) {
  main().catch(error => {
    log(`Error: ${error.message}`, 'red');
    process.exit(1);
  });
}