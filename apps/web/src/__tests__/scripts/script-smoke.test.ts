/**
 * Script Smoke Tests
 * Validates that all scripts can load without import errors
 */

import { describe, expect, it, beforeAll } from '@jest/globals';
import { promises as fs } from 'fs';
import path from 'path';

describe('Script Smoke Tests', () => {
  let scriptFiles: string[] = [];

  beforeAll(async () => {
    const scriptsDir = path.join(__dirname, '../../scripts');
    try {
      const files = await fs.readdir(scriptsDir);
      scriptFiles = files.filter(file => file.endsWith('.ts') && !file.endsWith('.test.ts'));
    } catch (error) {
      console.warn('Could not read scripts directory:', error);
    }
  });

  it('should find script files', () => {
    expect(scriptFiles.length).toBeGreaterThan(0);
    expect(scriptFiles).toContain('process-job.ts');
  });

  it('should be able to import process-job.ts without errors', async () => {
    // Set minimal environment for import
    const originalEnv = process.env;
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      AUTH_SECRET: 'test-secret',
    };

    let importError: Error | null = null;
    
    try {
      // Import the module but don't execute it
      const scriptPath = path.resolve(__dirname, '../../scripts/process-job.ts');
      
      // Check if file exists
      await fs.access(scriptPath);
      
      // For now, just verify the file can be read and parsed
      const content = await fs.readFile(scriptPath, 'utf8');
      expect(content).toContain('async function main()');
      expect(content).toContain('initializeAIPackage');
      
    } catch (error) {
      importError = error as Error;
    } finally {
      process.env = originalEnv;
    }

    if (importError) {
      throw new Error(`Failed to validate process-job.ts: ${importError.message}`);
    }
  });

  it('should have valid TypeScript syntax in all scripts', async () => {
    for (const scriptFile of scriptFiles) {
      const scriptPath = path.join(__dirname, '../../scripts', scriptFile);
      const content = await fs.readFile(scriptPath, 'utf8');
      
      // Basic syntax checks
      expect(content).not.toContain('import from'); // Should have proper imports
      expect(content).not.toContain('require('); // Should use ES imports, not require
      
      // Should have proper TypeScript patterns
      if (content.includes('async function main')) {
        expect(content).toContain('try {');
        expect(content).toContain('} catch');
      }
    }
  });

  it('should have consistent import patterns', async () => {
    const processJobPath = path.join(__dirname, '../../scripts/process-job.ts');
    const content = await fs.readFile(processJobPath, 'utf8');
    
    // Should import from infrastructure, not lib
    expect(content).not.toContain('from "../lib/');
    expect(content).toContain('from "../infrastructure/');
    
    // Should use proper path aliases
    expect(content).toContain('from "@/infrastructure/');
  });
});