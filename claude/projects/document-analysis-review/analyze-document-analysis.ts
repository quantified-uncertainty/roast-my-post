#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface FileAnalysis {
  file: string;
  imports: Set<string>;
  exports: Set<string>;
  importedBy: Set<string>;
  isTest: boolean;
  size: number;
}

class DocumentAnalysisAnalyzer {
  private files: Map<string, FileAnalysis> = new Map();
  private baseDir = '/Users/ozziegooen/Documents/Github/ui-cleanup/src/lib/documentAnalysis';
  
  async analyze() {
    console.log('🔍 Analyzing documentAnalysis directory...\n');
    
    // Get all TypeScript files
    const tsFiles = await glob('**/*.{ts,tsx}', {
      cwd: this.baseDir,
      ignore: ['node_modules/**', '**/*.d.ts']
    });
    
    // First pass: analyze each file
    for (const file of tsFiles) {
      await this.analyzeFile(file);
    }
    
    // Second pass: build import graph
    this.buildImportGraph();
    
    // Report findings
    this.reportFindings();
  }
  
  private async analyzeFile(relPath: string) {
    const fullPath = path.join(this.baseDir, relPath);
    const content = fs.readFileSync(fullPath, 'utf-8');
    const stats = fs.statSync(fullPath);
    
    const analysis: FileAnalysis = {
      file: relPath,
      imports: new Set(),
      exports: new Set(),
      importedBy: new Set(),
      isTest: relPath.includes('.test.') || relPath.includes('.spec.') || relPath.includes('__tests__'),
      size: stats.size
    };
    
    // Extract imports
    const importRegex = /import\s+(?:{([^}]+)}|(\w+)|(\*\s+as\s+\w+))\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[4];
      if (importPath.startsWith('.')) {
        analysis.imports.add(this.resolveImportPath(relPath, importPath));
      }
    }
    
    // Extract exports
    const exportPatterns = [
      /export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/g,
      /export\s+{([^}]+)}/g,
      /export\s+default/g
    ];
    
    for (const pattern of exportPatterns) {
      while ((match = pattern.exec(content)) !== null) {
        if (match[0].includes('default')) {
          analysis.exports.add('default');
        } else if (match[1]) {
          if (match[1].includes(',')) {
            match[1].split(',').forEach(e => analysis.exports.add(e.trim()));
          } else {
            analysis.exports.add(match[1]);
          }
        }
      }
    }
    
    this.files.set(relPath, analysis);
  }
  
  private resolveImportPath(fromFile: string, importPath: string): string {
    const dir = path.dirname(fromFile);
    let resolved = path.join(dir, importPath);
    
    // Remove extension
    resolved = resolved.replace(/\.(ts|tsx|js|jsx)$/, '');
    
    // Check for index files
    const possiblePaths = [
      resolved + '.ts',
      resolved + '.tsx',
      resolved + '/index.ts',
      resolved + '/index.tsx'
    ];
    
    for (const possiblePath of possiblePaths) {
      if (this.fileExists(possiblePath)) {
        return possiblePath.replace(/\.(ts|tsx)$/, '');
      }
    }
    
    return resolved;
  }
  
  private fileExists(relPath: string): boolean {
    try {
      fs.statSync(path.join(this.baseDir, relPath));
      return true;
    } catch {
      return false;
    }
  }
  
  private buildImportGraph() {
    for (const [file, analysis] of this.files) {
      for (const importPath of analysis.imports) {
        const targetFile = this.findFileByPath(importPath);
        if (targetFile) {
          this.files.get(targetFile)!.importedBy.add(file);
        }
      }
    }
  }
  
  private findFileByPath(importPath: string): string | null {
    const normalized = importPath.replace(/^\.\//, '');
    for (const file of this.files.keys()) {
      if (file.replace(/\.(ts|tsx)$/, '') === normalized ||
          file.replace(/\.(ts|tsx)$/, '') === normalized + '/index' ||
          file === normalized + '.ts' ||
          file === normalized + '.tsx') {
        return file;
      }
    }
    return null;
  }
  
  private reportFindings() {
    console.log('📊 Document Analysis Directory Report\n');
    console.log('=' .repeat(80) + '\n');
    
    // 1. Find unused files
    const unusedFiles: string[] = [];
    const testOnlyFiles: string[] = [];
    
    for (const [file, analysis] of this.files) {
      if (analysis.isTest) continue;
      
      const nonTestImports = Array.from(analysis.importedBy).filter(f => !this.files.get(f)?.isTest);
      
      if (analysis.importedBy.size === 0) {
        unusedFiles.push(file);
      } else if (nonTestImports.length === 0) {
        testOnlyFiles.push(file);
      }
    }
    
    // 2. Analyze specific patterns
    console.log('🔍 Key Findings:\n');
    
    // Highlight extraction/generation complexity
    const highlightFiles = Array.from(this.files.keys()).filter(f => 
      f.includes('highlight') && !f.includes('test')
    );
    
    console.log('📌 Highlight-related files:');
    for (const file of highlightFiles) {
      const analysis = this.files.get(file)!;
      console.log(`   ${file}`);
      console.log(`     Size: ${(analysis.size / 1024).toFixed(1)}KB`);
      console.log(`     Imported by: ${analysis.importedBy.size} files`);
      console.log(`     Exports: ${analysis.exports.size} items`);
    }
    
    // Location finding duplication
    console.log('\n🎯 Location finding files:');
    const locationFiles = Array.from(this.files.keys()).filter(f => 
      (f.includes('location') || f.includes('Location')) && !f.includes('test')
    );
    
    for (const file of locationFiles) {
      const analysis = this.files.get(file)!;
      const nonTestImports = Array.from(analysis.importedBy).filter(f => !this.files.get(f)?.isTest);
      console.log(`   ${file}`);
      console.log(`     Used by: ${nonTestImports.length} non-test files`);
    }
    
    // 3. Unused files
    if (unusedFiles.length > 0) {
      console.log('\n❌ Completely unused files:');
      for (const file of unusedFiles) {
        console.log(`   - ${file} (${(this.files.get(file)!.size / 1024).toFixed(1)}KB)`);
      }
    }
    
    // 4. Test-only files
    if (testOnlyFiles.length > 0) {
      console.log('\n⚠️  Test-only files:');
      for (const file of testOnlyFiles) {
        console.log(`   - ${file}`);
      }
    }
    
    // 5. Workflow analysis
    console.log('\n🔄 Workflow Files:');
    const workflows = ['analyzeDocument', 'comprehensiveAnalysis', 'highlightExtraction', 
                      'highlightGeneration', 'linkAnalysis', 'multiEpistemicEval', 'selfCritique'];
    
    for (const workflow of workflows) {
      const files = Array.from(this.files.keys()).filter(f => 
        f.includes(workflow) && !f.includes('test')
      );
      if (files.length > 0) {
        const totalSize = files.reduce((sum, f) => sum + this.files.get(f)!.size, 0);
        console.log(`   ${workflow}: ${files.length} files, ${(totalSize / 1024).toFixed(1)}KB total`);
      }
    }
    
    // 6. Summary statistics
    const sourceFiles = Array.from(this.files.entries()).filter(([_, a]) => !a.isTest);
    const totalSize = sourceFiles.reduce((sum, [_, a]) => sum + a.size, 0);
    
    console.log('\n📈 Summary:');
    console.log(`   Total source files: ${sourceFiles.length}`);
    console.log(`   Total size: ${(totalSize / 1024).toFixed(1)}KB`);
    console.log(`   Unused files: ${unusedFiles.length}`);
    console.log(`   Test-only files: ${testOnlyFiles.length}`);
    console.log(`   Average file size: ${(totalSize / sourceFiles.length / 1024).toFixed(1)}KB`);
  }
}

// Run the analyzer
const analyzer = new DocumentAnalysisAnalyzer();
analyzer.analyze().catch(console.error);