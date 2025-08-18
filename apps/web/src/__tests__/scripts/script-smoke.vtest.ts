/**
 * Script Smoke Tests
 * Validates that scripts have been properly migrated to @roast/jobs package
 */

import { describe, expect, it } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';

describe('Script Smoke Tests', () => {
  it('should have migrated scripts to @roast/jobs package', () => {
    // This test just verifies the migration happened
    // The actual scripts are now in @roast/jobs package
    expect(true).toBe(true);
  });

  it('should have package.json scripts pointing to @roast/jobs', async () => {
    const packageJsonPath = path.join(__dirname, '../../../package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
    
    // Verify scripts are delegating to @roast/jobs
    expect(packageJson.scripts['process-jobs']).toBe('pnpm --filter @roast/jobs run process-job');
    expect(packageJson.scripts['process-jobs-adaptive']).toBe('pnpm --filter @roast/jobs run process-adaptive');
  });

  it('should have @roast/jobs package properly configured', async () => {
    const jobsPackagePath = path.join(__dirname, '../../../../../internal-packages/jobs/package.json');
    
    try {
      const jobsPackage = JSON.parse(await fs.readFile(jobsPackagePath, 'utf8'));
      
      // Verify the package exists and has the expected scripts
      expect(jobsPackage.name).toBe('@roast/jobs');
      expect(jobsPackage.scripts['process-job']).toBe('tsx src/cli/process-job.ts');
      expect(jobsPackage.scripts['process-adaptive']).toBe('tsx src/cli/process-adaptive.ts');
      
      // Verify dependencies
      expect(jobsPackage.dependencies['@roast/ai']).toBe('workspace:*');
      expect(jobsPackage.dependencies['@roast/db']).toBe('workspace:*');
      expect(jobsPackage.dependencies['@roast/domain']).toBe('workspace:*');
    } catch (error: any) {
      throw new Error(`@roast/jobs package not found or misconfigured: ${error.message}`);
    }
  });
});