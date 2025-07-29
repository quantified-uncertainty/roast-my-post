#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { glob } from 'glob';

interface ExportInfo {
  name: string;
  file: string;
  line: number;
  kind: 'function' | 'class' | 'interface' | 'type' | 'const' | 'enum' | 'namespace';
}

interface ImportInfo {
  name: string;
  file: string;
  fromFile: string;
  line: number;
}

class DeadCodeAnalyzer {
  private exports: Map<string, ExportInfo[]> = new Map();
  private imports: Map<string, ImportInfo[]> = new Map();
  private fileExports: Map<string, Set<string>> = new Map();
  private fileImports: Map<string, Set<string>> = new Map();
  private tsFiles: string[] = [];
  
  constructor(private baseDir: string) {}

  async analyze() {
    console.log('🔍 Analyzing dead code in:', this.baseDir);
    
    // Find all TypeScript files
    this.tsFiles = await glob('**/*.{ts,tsx}', {
      cwd: this.baseDir,
      ignore: ['node_modules/**', '**/*.test.ts', '**/*.test.tsx', '**/*.d.ts']
    });
    
    console.log(`Found ${this.tsFiles.length} TypeScript files to analyze\n`);
    
    // First pass: collect all exports
    for (const file of this.tsFiles) {
      this.collectExports(path.join(this.baseDir, file));
    }
    
    // Second pass: collect all imports
    for (const file of this.tsFiles) {
      this.collectImports(path.join(this.baseDir, file));
    }
    
    // Analyze usage
    this.analyzeUsage();
  }
  
  private collectExports(filePath: string) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true
    );
    
    const relPath = path.relative(this.baseDir, filePath);
    const exports = new Set<string>();
    this.fileExports.set(relPath, exports);
    
    const visit = (node: ts.Node) => {
      if (ts.isExportDeclaration(node)) {
        if (node.exportClause && ts.isNamedExports(node.exportClause)) {
          node.exportClause.elements.forEach(element => {
            const name = element.name.text;
            exports.add(name);
            this.addExport(name, relPath, sourceFile.getLineAndCharacterOfPosition(element.pos).line, 'const');
          });
        }
      } else if (ts.isFunctionDeclaration(node) && node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
        const name = node.name?.text;
        if (name) {
          exports.add(name);
          this.addExport(name, relPath, sourceFile.getLineAndCharacterOfPosition(node.pos).line, 'function');
        }
      } else if (ts.isClassDeclaration(node) && node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
        const name = node.name?.text;
        if (name) {
          exports.add(name);
          this.addExport(name, relPath, sourceFile.getLineAndCharacterOfPosition(node.pos).line, 'class');
        }
      } else if (ts.isInterfaceDeclaration(node) && node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
        const name = node.name.text;
        exports.add(name);
        this.addExport(name, relPath, sourceFile.getLineAndCharacterOfPosition(node.pos).line, 'interface');
      } else if (ts.isTypeAliasDeclaration(node) && node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
        const name = node.name.text;
        exports.add(name);
        this.addExport(name, relPath, sourceFile.getLineAndCharacterOfPosition(node.pos).line, 'type');
      } else if (ts.isVariableStatement(node) && node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
        node.declarationList.declarations.forEach(decl => {
          if (ts.isIdentifier(decl.name)) {
            const name = decl.name.text;
            exports.add(name);
            this.addExport(name, relPath, sourceFile.getLineAndCharacterOfPosition(decl.pos).line, 'const');
          }
        });
      }
      
      ts.forEachChild(node, visit);
    };
    
    visit(sourceFile);
  }
  
  private collectImports(filePath: string) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true
    );
    
    const relPath = path.relative(this.baseDir, filePath);
    const imports = new Set<string>();
    this.fileImports.set(relPath, imports);
    
    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = (node.moduleSpecifier as ts.StringLiteral).text;
        
        if (node.importClause) {
          // Default import
          if (node.importClause.name) {
            const name = node.importClause.name.text;
            imports.add(name);
            this.addImport(name, relPath, moduleSpecifier, sourceFile.getLineAndCharacterOfPosition(node.pos).line);
          }
          
          // Named imports
          if (node.importClause.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
            node.importClause.namedBindings.elements.forEach(element => {
              const name = element.name.text;
              imports.add(name);
              this.addImport(name, relPath, moduleSpecifier, sourceFile.getLineAndCharacterOfPosition(element.pos).line);
            });
          }
        }
      }
      
      ts.forEachChild(node, visit);
    };
    
    visit(sourceFile);
  }
  
  private addExport(name: string, file: string, line: number, kind: ExportInfo['kind']) {
    if (!this.exports.has(name)) {
      this.exports.set(name, []);
    }
    this.exports.get(name)!.push({ name, file, line, kind });
  }
  
  private addImport(name: string, file: string, fromFile: string, line: number) {
    if (!this.imports.has(name)) {
      this.imports.set(name, []);
    }
    this.imports.get(name)!.push({ name, file, fromFile, line });
  }
  
  private analyzeUsage() {
    console.log('📊 Analysis Results\n');
    
    // Find unused exports
    const unusedExports: ExportInfo[] = [];
    
    for (const [exportName, exportInfos] of this.exports) {
      const importInfos = this.imports.get(exportName) || [];
      
      for (const exportInfo of exportInfos) {
        // Check if this specific export is imported anywhere
        const isUsed = importInfos.some(imp => {
          // Skip imports from the same file
          if (imp.file === exportInfo.file) return false;
          
          // Check if the import path could resolve to this export
          return this.couldImportResolveToExport(imp.fromFile, imp.file, exportInfo.file);
        });
        
        if (!isUsed) {
          unusedExports.push(exportInfo);
        }
      }
    }
    
    // Group by file
    const unusedByFile = new Map<string, ExportInfo[]>();
    for (const exp of unusedExports) {
      if (!unusedByFile.has(exp.file)) {
        unusedByFile.set(exp.file, []);
      }
      unusedByFile.get(exp.file)!.push(exp);
    }
    
    // Display results
    if (unusedByFile.size === 0) {
      console.log('✅ No dead code detected!');
    } else {
      console.log(`⚠️  Found ${unusedExports.length} potentially unused exports in ${unusedByFile.size} files:\n`);
      
      for (const [file, exports] of unusedByFile) {
        console.log(`\n📄 ${file}`);
        for (const exp of exports.sort((a, b) => a.line - b.line)) {
          console.log(`   Line ${exp.line}: ${exp.kind} ${exp.name}`);
        }
      }
    }
    
    // Show summary statistics
    console.log('\n📈 Summary:');
    console.log(`   Total exports analyzed: ${this.exports.size}`);
    console.log(`   Total imports analyzed: ${this.imports.size}`);
    console.log(`   Unused exports: ${unusedExports.length}`);
    console.log(`   Files with unused code: ${unusedByFile.size}`);
  }
  
  private couldImportResolveToExport(importPath: string, importingFile: string, exportFile: string): boolean {
    // Handle relative imports
    if (importPath.startsWith('.')) {
      const importingDir = path.dirname(importingFile);
      const resolvedPath = path.normalize(path.join(importingDir, importPath));
      
      // Remove extension and index suffix
      const normalizedExportFile = exportFile.replace(/\.(ts|tsx)$/, '').replace(/\/index$/, '');
      const normalizedResolvedPath = resolvedPath.replace(/\.(ts|tsx)$/, '').replace(/\/index$/, '');
      
      return normalizedExportFile === normalizedResolvedPath || 
             normalizedExportFile === resolvedPath ||
             exportFile === resolvedPath + '.ts' ||
             exportFile === resolvedPath + '.tsx' ||
             exportFile === resolvedPath + '/index.ts' ||
             exportFile === resolvedPath + '/index.tsx';
    }
    
    // Handle absolute imports (from src/)
    if (importPath.startsWith('@/')) {
      const resolvedPath = importPath.replace('@/', 'src/');
      const normalizedExportFile = exportFile.replace(/\.(ts|tsx)$/, '').replace(/\/index$/, '');
      const normalizedResolvedPath = resolvedPath.replace(/\.(ts|tsx)$/, '').replace(/\/index$/, '');
      
      return normalizedExportFile === normalizedResolvedPath ||
             exportFile === resolvedPath + '.ts' ||
             exportFile === resolvedPath + '.tsx' ||
             exportFile === resolvedPath + '/index.ts' ||
             exportFile === resolvedPath + '/index.tsx';
    }
    
    return false;
  }
}

// Run the analyzer
const analyzer = new DeadCodeAnalyzer('/Users/ozziegooen/Documents/Github/ui-cleanup/src/lib/analysis-plugins');
analyzer.analyze().catch(console.error);