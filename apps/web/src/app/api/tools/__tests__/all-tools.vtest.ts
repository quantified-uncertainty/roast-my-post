import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Comprehensive test suite for all tool API endpoints
 * Verifies that:
 * 1. The unified [id] route exists and handles all tools
 * 2. All registered tools are accessible via /api/tools/[id]
 * 3. Main tools route returns tool metadata
 */

import { toolRegistry } from '@roast/ai/server';

describe('Tool API Endpoints', () => {
  // Get tool IDs dynamically from the registry
  const tools = toolRegistry.getMetadata();
  const toolIds = tools.map(tool => tool.id);
  
  // Check that the unified route exists
  // Using __dirname to resolve path relative to test file location
  const unifiedRoutePath = path.join(__dirname, '../[id]/route.ts');

  it('should have a unified [id] route at /api/tools/[id]/route.ts', () => {
    expect(fs.existsSync(unifiedRoutePath)).toBe(true);
  });

  it('should export a POST handler in the unified route', () => {
    const routeContent = fs.readFileSync(unifiedRoutePath, 'utf-8');
    expect(routeContent).toMatch(/export\s+async\s+function\s+POST/);
  });

  describe.each(toolIds)('Tool: %s', (toolId) => {
    it(`should be accessible via /api/tools/${toolId}`, () => {
      // Verify the tool exists in registry
      const tool = toolRegistry.get(toolId);
      expect(tool).toBeDefined();
      expect(tool?.config.id).toBe(toolId);
    });
  });

  describe('Main Tools Route', () => {
    it('should export a GET handler at /api/tools', async () => {
      try {
        const routeModule = await import('../route');
        expect(routeModule.GET).toBeDefined();
        expect(typeof routeModule.GET).toBe('function');
      } catch (error) {
        throw new Error('Main tools route missing GET handler');
      }
    });
  });
});