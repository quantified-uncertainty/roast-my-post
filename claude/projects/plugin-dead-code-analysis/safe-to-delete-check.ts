#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { execSync } from 'child_process';

interface FileStatus {
  file: string;
  safeToDelete: boolean;
  reason: string;
  gitStatus?: string;
}

class SafeDeleteChecker {
  private projectRoot = '/Users/ozziegooen/Documents/Github/ui-cleanup';
  private pluginDir = 'src/lib/analysis-plugins';
  
  // Files we know are dead from our analysis
  private deadFiles = [
    'PluginContext.ts',
    'analyzers/ErrorPatternAnalyzer.ts',
    'builders/PromptBuilder.ts',
    'builders/SchemaBuilder.ts',
    'index.ts',
    'plugins/index.ts',
    'plugins/forecast/commentGeneration.ts',
    'plugins/math/simpleMathLocationFinder.ts',
    'utils/commentGenerator.ts',
    'utils/extractionHelper.ts',
    'utils/findTextInChunk.ts',
    'utils/findingToHighlight.ts',
    'utils/pluginHelpers.ts',
    'utils/pluginLoggerHelper.ts'
  ];
  
  async checkFiles() {
    console.log('🔍 Checking which files are safe to delete...\n');
    
    const results: FileStatus[] = [];
    
    for (const file of this.deadFiles) {
      const fullPath = path.join(this.pluginDir, file);
      const result = await this.checkFile(fullPath);
      results.push(result);
    }
    
    // Report results
    this.reportResults(results);
  }
  
  private async checkFile(relativePath: string): Promise<FileStatus> {
    const fullPath = path.join(this.projectRoot, relativePath);
    
    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      return {
        file: relativePath,
        safeToDelete: false,
        reason: 'File does not exist'
      };
    }
    
    // Check git status
    let gitStatus = 'clean';
    try {
      execSync(`cd "${this.projectRoot}" && git diff --quiet "${relativePath}"`);
    } catch {
      gitStatus = 'modified';
    }
    
    // Search for any imports of this file across the entire codebase
    const fileName = path.basename(relativePath, path.extname(relativePath));
    const dirName = path.dirname(relativePath);
    
    // Search patterns
    const searchPatterns = [
      fileName, // Direct file name
      relativePath.replace(/\\/g, '/'), // Full path
      relativePath.replace(/\\/g, '/').replace(/\.ts$/, ''), // Without extension
      `./${path.relative(this.pluginDir, relativePath).replace(/\\/g, '/')}`, // Relative import
    ];
    
    // Check for imports
    let foundImports = false;
    let importLocations: string[] = [];
    
    for (const pattern of searchPatterns) {
      try {
        const grepResult = execSync(
          `cd "${this.projectRoot}" && rg -l "${pattern}" src --type ts --type tsx || true`,
          { encoding: 'utf-8' }
        ).trim();
        
        if (grepResult) {
          const files = grepResult.split('\n').filter(f => f && f !== relativePath);
          if (files.length > 0) {
            foundImports = true;
            importLocations.push(...files);
          }
        }
      } catch {
        // Ignore grep errors
      }
    }
    
    // Remove duplicates and filter out the file itself
    importLocations = [...new Set(importLocations)].filter(f => !f.includes(fileName));
    
    // Determine if safe to delete
    let safeToDelete = true;
    let reason = 'No imports found';
    
    if (foundImports && importLocations.length > 0) {
      // Check if all imports are from test files
      const nonTestImports = importLocations.filter(f => !f.includes('.test.') && !f.includes('.spec.'));
      
      if (nonTestImports.length === 0) {
        reason = 'Only imported by test files';
        safeToDelete = true; // Still safe if only tests use it
      } else {
        reason = `Imported by: ${nonTestImports.slice(0, 3).join(', ')}${nonTestImports.length > 3 ? '...' : ''}`;
        safeToDelete = false;
      }
    }
    
    if (gitStatus === 'modified') {
      reason += ' (file has uncommitted changes)';
      safeToDelete = false;
    }
    
    return {
      file: relativePath,
      safeToDelete,
      reason,
      gitStatus
    };
  }
  
  private reportResults(results: FileStatus[]) {
    console.log('📊 Safety Check Results\n');
    console.log('=' .repeat(80) + '\n');
    
    const safeFiles = results.filter(r => r.safeToDelete);
    const unsafeFiles = results.filter(r => !r.safeToDelete);
    
    if (safeFiles.length > 0) {
      console.log('✅ Safe to Delete:\n');
      for (const file of safeFiles) {
        console.log(`   ${file.file}`);
        console.log(`   └─ ${file.reason}\n`);
      }
    }
    
    if (unsafeFiles.length > 0) {
      console.log('\n❌ NOT Safe to Delete:\n');
      for (const file of unsafeFiles) {
        console.log(`   ${file.file}`);
        console.log(`   └─ ${file.reason}\n`);
      }
    }
    
    // Generate deletion script
    if (safeFiles.length > 0) {
      console.log('\n📝 To delete safe files, run:\n');
      console.log('```bash');
      for (const file of safeFiles) {
        console.log(`git rm "${file.file}"`);
      }
      console.log('```\n');
      
      // Also create a script file
      const scriptContent = '#!/bin/bash\n\n' +
        '# Auto-generated script to delete dead code files\n' +
        '# Generated on: ' + new Date().toISOString() + '\n\n' +
        'cd "' + this.projectRoot + '"\n\n' +
        safeFiles.map(f => `git rm "${f.file}"`).join('\n') + '\n';
      
      fs.writeFileSync(
        path.join(this.projectRoot, 'scripts/delete-dead-code.sh'),
        scriptContent,
        { mode: 0o755 }
      );
      
      console.log('Script saved to: scripts/delete-dead-code.sh');
    }
    
    console.log('\n📈 Summary:');
    console.log(`   Total files checked: ${results.length}`);
    console.log(`   Safe to delete: ${safeFiles.length}`);
    console.log(`   Not safe: ${unsafeFiles.length}`);
  }
}

// Run the checker
const checker = new SafeDeleteChecker();
checker.checkFiles().catch(console.error);