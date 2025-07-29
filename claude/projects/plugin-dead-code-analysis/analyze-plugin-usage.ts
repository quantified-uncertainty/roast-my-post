#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface UsageInfo {
  file: string;
  line: number;
  context: string;
}

class PluginUsageAnalyzer {
  private pluginExports: Map<string, string[]> = new Map();
  private usageMap: Map<string, UsageInfo[]> = new Map();
  
  constructor(private projectRoot: string) {}
  
  async analyze() {
    console.log('🔍 Analyzing plugin usage across the entire project...\n');
    
    // First, collect all exports from the plugins directory
    await this.collectPluginExports();
    
    // Then search for usage across the entire codebase
    await this.searchForUsage();
    
    // Report findings
    this.reportResults();
  }
  
  private async collectPluginExports() {
    const pluginFiles = await glob('src/lib/analysis-plugins/**/*.{ts,tsx}', {
      cwd: this.projectRoot,
      ignore: ['**/*.test.ts', '**/*.test.tsx', '**/*.d.ts']
    });
    
    console.log(`Found ${pluginFiles.length} plugin files to analyze\n`);
    
    // Collect main exports we care about
    this.pluginExports.set('PluginManager', ['src/lib/analysis-plugins/PluginManager.ts']);
    this.pluginExports.set('TextChunk', ['src/lib/analysis-plugins/TextChunk.ts']);
    this.pluginExports.set('createChunks', ['src/lib/analysis-plugins/TextChunk.ts', 'src/lib/analysis-plugins/utils/createChunksWithTool.ts']);
    this.pluginExports.set('MathPlugin', ['src/lib/analysis-plugins/plugins/math/index.ts']);
    this.pluginExports.set('SpellingPlugin', ['src/lib/analysis-plugins/plugins/spelling/index.ts']);
    this.pluginExports.set('FactCheckPlugin', ['src/lib/analysis-plugins/plugins/fact-check/index.ts']);
    this.pluginExports.set('ForecastPlugin', ['src/lib/analysis-plugins/plugins/forecast/index.ts']);
    
    // Add utility exports
    this.pluginExports.set('findTextInChunk', ['src/lib/analysis-plugins/utils/findTextInChunk.ts']);
    this.pluginExports.set('generateCommentsFromFindings', ['src/lib/analysis-plugins/utils/commentGenerator.ts']);
    this.pluginExports.set('convertFindingToHighlight', ['src/lib/analysis-plugins/utils/findingToHighlight.ts']);
    this.pluginExports.set('batchLocateFindings', ['src/lib/analysis-plugins/utils/locationFinder.ts']);
  }
  
  private async searchForUsage() {
    // Search across the entire codebase, excluding the plugin directory itself
    const allFiles = await glob('src/**/*.{ts,tsx}', {
      cwd: this.projectRoot,
      ignore: [
        'src/lib/analysis-plugins/**',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.d.ts',
        'node_modules/**'
      ]
    });
    
    console.log(`Searching for usage in ${allFiles.length} files...\n`);
    
    for (const file of allFiles) {
      const fullPath = path.join(this.projectRoot, file);
      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');
      
      for (const [exportName] of this.pluginExports) {
        lines.forEach((line, idx) => {
          // Look for imports
          if (line.includes(`import`) && line.includes(exportName)) {
            this.addUsage(exportName, file, idx + 1, line.trim());
          }
          // Look for usage in code
          else if (line.includes(exportName) && !line.includes('export')) {
            this.addUsage(exportName, file, idx + 1, line.trim());
          }
        });
      }
    }
  }
  
  private addUsage(exportName: string, file: string, line: number, context: string) {
    if (!this.usageMap.has(exportName)) {
      this.usageMap.set(exportName, []);
    }
    this.usageMap.get(exportName)!.push({ file, line, context });
  }
  
  private reportResults() {
    console.log('📊 Plugin Usage Report\n');
    console.log('=' .repeat(80) + '\n');
    
    const unusedExports: string[] = [];
    const usedExports: string[] = [];
    
    for (const [exportName, locations] of this.pluginExports) {
      const usages = this.usageMap.get(exportName) || [];
      
      if (usages.length === 0) {
        unusedExports.push(exportName);
      } else {
        usedExports.push(exportName);
        console.log(`✅ ${exportName} (${usages.length} usage${usages.length > 1 ? 's' : ''})`);
        console.log(`   Defined in: ${locations.join(', ')}`);
        console.log(`   Used in:`);
        
        // Group by file
        const byFile = new Map<string, UsageInfo[]>();
        for (const usage of usages) {
          if (!byFile.has(usage.file)) {
            byFile.set(usage.file, []);
          }
          byFile.get(usage.file)!.push(usage);
        }
        
        for (const [file, fileUsages] of byFile) {
          console.log(`     - ${file} (${fileUsages.length} time${fileUsages.length > 1 ? 's' : ''})`);
          if (fileUsages.length <= 3) {
            fileUsages.forEach(u => {
              console.log(`       Line ${u.line}: ${u.context.substring(0, 60)}...`);
            });
          }
        }
        console.log();
      }
    }
    
    if (unusedExports.length > 0) {
      console.log('\n❌ Potentially Unused Exports:\n');
      for (const name of unusedExports) {
        const locations = this.pluginExports.get(name)!;
        console.log(`   - ${name} (${locations.join(', ')})`);
      }
    }
    
    console.log('\n📈 Summary:');
    console.log(`   Total exports tracked: ${this.pluginExports.size}`);
    console.log(`   Used exports: ${usedExports.length}`);
    console.log(`   Unused exports: ${unusedExports.length}`);
    console.log(`   Usage rate: ${((usedExports.length / this.pluginExports.size) * 100).toFixed(1)}%`);
  }
}

// Run the analyzer
const analyzer = new PluginUsageAnalyzer('/Users/ozziegooen/Documents/Github/ui-cleanup');
analyzer.analyze().catch(console.error);