#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface FileUsage {
  imports: Set<string>;
  exports: Set<string>;
  isTest: boolean;
  hasDefaultExport: boolean;
}

class DetailedPluginAnalyzer {
  private fileUsage: Map<string, FileUsage> = new Map();
  private importGraph: Map<string, Set<string>> = new Map(); // file -> files that import it
  
  constructor(private baseDir: string) {}
  
  async analyze() {
    console.log('🔍 Performing detailed analysis of plugin system...\n');
    
    // Get all files
    const files = await glob('**/*.{ts,tsx}', {
      cwd: this.baseDir,
      ignore: ['node_modules/**', '**/*.d.ts']
    });
    
    // Analyze each file
    for (const file of files) {
      await this.analyzeFile(file);
    }
    
    // Report findings
    this.reportFindings();
  }
  
  private async analyzeFile(file: string) {
    const fullPath = path.join(this.baseDir, file);
    const content = fs.readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');
    
    const usage: FileUsage = {
      imports: new Set(),
      exports: new Set(),
      isTest: file.includes('.test.') || file.includes('.spec.'),
      hasDefaultExport: false
    };
    
    // Quick regex-based analysis
    for (const line of lines) {
      // Check imports
      const importMatch = line.match(/import\s+(?:{([^}]+)}|(\w+)|(\*))\s+from\s+['"]([^'"]+)['"]/);
      if (importMatch) {
        const importPath = importMatch[4];
        if (importPath.startsWith('.')) {
          // Resolve relative import
          const resolvedPath = this.resolveImport(file, importPath);
          if (!this.importGraph.has(resolvedPath)) {
            this.importGraph.set(resolvedPath, new Set());
          }
          this.importGraph.get(resolvedPath)!.add(file);
          
          // Track what's imported
          if (importMatch[1]) {
            // Named imports
            const names = importMatch[1].split(',').map(n => n.trim());
            names.forEach(n => usage.imports.add(n));
          } else if (importMatch[2]) {
            // Default import
            usage.imports.add('default');
          }
        }
      }
      
      // Check exports
      if (line.match(/export\s+default/)) {
        usage.hasDefaultExport = true;
        usage.exports.add('default');
      } else if (line.match(/export\s+(?:const|function|class|interface|type|enum)\s+(\w+)/)) {
        const match = line.match(/export\s+(?:const|function|class|interface|type|enum)\s+(\w+)/);
        if (match) {
          usage.exports.add(match[1]);
        }
      } else if (line.match(/export\s+{([^}]+)}/)) {
        const match = line.match(/export\s+{([^}]+)}/);
        if (match) {
          const names = match[1].split(',').map(n => n.trim());
          names.forEach(n => usage.exports.add(n));
        }
      }
    }
    
    this.fileUsage.set(file, usage);
  }
  
  private resolveImport(fromFile: string, importPath: string): string {
    const dir = path.dirname(fromFile);
    let resolved = path.join(dir, importPath);
    
    // Normalize and remove extensions
    resolved = resolved.replace(/\.(ts|tsx|js|jsx)$/, '');
    
    // Check for index files
    if (fs.existsSync(path.join(this.baseDir, resolved + '.ts'))) {
      return resolved;
    } else if (fs.existsSync(path.join(this.baseDir, resolved + '.tsx'))) {
      return resolved;
    } else if (fs.existsSync(path.join(this.baseDir, resolved, 'index.ts'))) {
      return path.join(resolved, 'index');
    } else if (fs.existsSync(path.join(this.baseDir, resolved, 'index.tsx'))) {
      return path.join(resolved, 'index');
    }
    
    return resolved;
  }
  
  private reportFindings() {
    console.log('📊 Detailed Analysis Results\n');
    console.log('=' .repeat(80) + '\n');
    
    // 1. Find truly unused files (not imported by any non-test file)
    const unusedFiles: string[] = [];
    const testOnlyFiles: string[] = [];
    
    for (const [file, usage] of this.fileUsage) {
      if (usage.isTest) continue;
      
      const importedBy = this.importGraph.get(file.replace(/\.(ts|tsx)$/, '')) || new Set();
      const nonTestImports = Array.from(importedBy).filter(f => !this.fileUsage.get(f)?.isTest);
      
      if (importedBy.size === 0) {
        unusedFiles.push(file);
      } else if (nonTestImports.length === 0) {
        testOnlyFiles.push(file);
      }
    }
    
    // 2. Report unused files
    if (unusedFiles.length > 0) {
      console.log('❌ Completely Unused Files (not imported anywhere):\n');
      for (const file of unusedFiles.sort()) {
        const usage = this.fileUsage.get(file)!;
        console.log(`   - ${file}`);
        if (usage.exports.size > 0) {
          console.log(`     Exports: ${Array.from(usage.exports).join(', ')}`);
        }
      }
      console.log();
    }
    
    // 3. Report test-only files
    if (testOnlyFiles.length > 0) {
      console.log('⚠️  Test-Only Files (only imported by test files):\n');
      for (const file of testOnlyFiles.sort()) {
        const usage = this.fileUsage.get(file)!;
        const importedBy = this.importGraph.get(file.replace(/\.(ts|tsx)$/, '')) || new Set();
        console.log(`   - ${file}`);
        console.log(`     Used by tests: ${Array.from(importedBy).join(', ')}`);
      }
      console.log();
    }
    
    // 4. Analyze key components
    console.log('🔑 Key Component Analysis:\n');
    
    const keyFiles = [
      'PluginManager.ts',
      'plugins/math/index.ts',
      'plugins/spelling/index.ts',
      'plugins/fact-check/index.ts',
      'plugins/forecast/index.ts'
    ];
    
    for (const keyFile of keyFiles) {
      const fullKey = Array.from(this.fileUsage.keys()).find(f => f.endsWith(keyFile));
      if (!fullKey) continue;
      
      const importedBy = this.importGraph.get(fullKey.replace(/\.(ts|tsx)$/, '')) || new Set();
      const nonTestImports = Array.from(importedBy).filter(f => !this.fileUsage.get(f)?.isTest);
      
      console.log(`📄 ${keyFile}`);
      console.log(`   Status: ${nonTestImports.length > 0 ? '✅ ACTIVE' : '❌ UNUSED'}`);
      if (nonTestImports.length > 0) {
        console.log(`   Used by: ${nonTestImports.join(', ')}`);
      } else {
        console.log(`   Only used by tests: ${Array.from(importedBy).join(', ')}`);
      }
      console.log();
    }
    
    // 5. Summary statistics
    console.log('\n📈 Summary Statistics:\n');
    const totalFiles = Array.from(this.fileUsage.keys()).filter(f => !this.fileUsage.get(f)?.isTest).length;
    const testFiles = Array.from(this.fileUsage.keys()).filter(f => this.fileUsage.get(f)?.isTest).length;
    
    console.log(`   Total source files: ${totalFiles}`);
    console.log(`   Test files: ${testFiles}`);
    console.log(`   Unused files: ${unusedFiles.length}`);
    console.log(`   Test-only files: ${testOnlyFiles.length}`);
    console.log(`   Active files: ${totalFiles - unusedFiles.length - testOnlyFiles.length}`);
    
    // 6. Check which plugins are actually enabled
    console.log('\n🔌 Plugin Status (from PluginManager.ts):\n');
    const pmFile = Array.from(this.fileUsage.keys()).find(f => f.endsWith('PluginManager.ts'));
    if (pmFile) {
      const content = fs.readFileSync(path.join(this.baseDir, pmFile), 'utf-8');
      const lines = content.split('\n');
      
      const pluginLines = lines.filter(line => 
        line.includes('new (await import') && line.includes('Plugin()')
      );
      
      for (const line of pluginLines) {
        const isCommented = line.trim().startsWith('//');
        const pluginMatch = line.match(/plugins\/([^"']+)/);
        if (pluginMatch) {
          const pluginName = pluginMatch[1];
          console.log(`   ${isCommented ? '❌ DISABLED' : '✅ ENABLED'}: ${pluginName}`);
        }
      }
    }
  }
}

// Run analyzer
const analyzer = new DetailedPluginAnalyzer('/Users/ozziegooen/Documents/Github/ui-cleanup/src/lib/analysis-plugins');
analyzer.analyze().catch(console.error);