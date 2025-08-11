import { existsSync } from 'fs';
import { resolve, dirname } from 'path';

/**
 * Find the workspace root directory by looking for pnpm-workspace.yaml
 * @param startPath Starting directory to search from (defaults to __dirname)
 * @returns Absolute path to workspace root
 * @throws Error if workspace root cannot be found
 */
export function findWorkspaceRoot(startPath: string = __dirname): string {
  let currentDir = startPath;
  
  // Traverse up the directory tree looking for pnpm-workspace.yaml
  while (currentDir !== '/') {
    const workspaceFile = resolve(currentDir, 'pnpm-workspace.yaml');
    if (existsSync(workspaceFile)) {
      return currentDir;
    }
    currentDir = dirname(currentDir);
  }
  
  // If we can't find it, try some common patterns relative to the package location
  // This handles cases where the package is in internal-packages/jobs
  const possibleRoots = [
    resolve(startPath, '../..'), // From src/utils -> internal-packages/jobs -> root
    resolve(startPath, '../../..'), // From src/utils -> internal-packages -> root
    resolve(startPath, '../../../..'), // From dist/utils -> dist -> internal-packages/jobs -> root
  ];
  
  for (const root of possibleRoots) {
    const workspaceFile = resolve(root, 'pnpm-workspace.yaml');
    if (existsSync(workspaceFile)) {
      return root;
    }
  }
  
  throw new Error('Could not find workspace root (pnpm-workspace.yaml not found)');
}

/**
 * Load environment variables from the web app's .env files
 * @param workspaceRoot Root directory of the workspace
 */
export function loadWebAppEnvironment(workspaceRoot: string): void {
  // These need to be loaded before any other imports that might use env vars
  const { config } = require('dotenv');
  
  // Load in order of precedence (later files override earlier ones)
  // .env.local takes precedence over .env
  const envPaths = [
    resolve(workspaceRoot, 'apps/web/.env'),        // Production/fallback
    resolve(workspaceRoot, 'apps/web/.env.local'),  // Development/local overrides
  ];
  
  for (const envPath of envPaths) {
    if (existsSync(envPath)) {
      config({ path: envPath, override: false });
      console.log(`✅ Loaded environment from ${envPath}`);
    }
  }
  
  // System environment variables take highest precedence (already loaded)
}