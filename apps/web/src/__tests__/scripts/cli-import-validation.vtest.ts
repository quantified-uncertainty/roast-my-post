/**
 * CLI Import Validation Tests
 * 
 * These tests validate that CLI components can be imported in Node.js contexts
 * without server-only module errors. This catches import issues that mocked 
 * unit tests miss.
 */

import { describe, it, expect } from 'vitest';

describe('CLI Import Validation', () => {
  it('should be able to import and instantiate JobRepository (CLI use case)', async () => {
    // This will fail if JobRepository or its dependencies import server-only modules
    const { JobRepository } = await import('@roast/db');
    
    // Verify the class can be instantiated without throwing server-only errors
    const repo = new JobRepository();
    expect(repo).toBeInstanceOf(JobRepository);
  });

  it('should be able to import CLI-safe database client', async () => {
    const { cliPrisma } = await import('@roast/db');
    
    expect(cliPrisma).toBeDefined();
    // Verify it has expected Prisma client methods
    expect(cliPrisma.job).toBeDefined();
    expect(cliPrisma.evaluation).toBeDefined();
  });

  it('should be able to import main database exports without server-only errors', async () => {
    // This tests that the main @roast/db exports work in Node.js contexts
    const dbModule = await import('@roast/db');
    
    expect(dbModule.JobRepository).toBeDefined();
    expect(dbModule.cliPrisma).toBeDefined();
    expect(dbModule.generateId).toBeDefined();
  });
});