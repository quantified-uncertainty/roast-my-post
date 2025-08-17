/**
 * Tests for tool configurations to ensure they're properly structured
 * Prevents issues where tool configs have API paths instead of page paths
 */

import { toolRegistry } from '@roast/ai';

describe('Tool Configurations', () => {
  describe('Tool Config Path Validation', () => {
    it('should have valid page paths for all tool configs', () => {
      const tools = toolRegistry.getMetadata();
      
      expect(tools.length).toBeGreaterThan(0);
      
      tools.forEach(tool => {
        // Tool path should be a page path, not an API path
        expect(tool.path).toBeDefined();
        expect(tool.path).toMatch(/^\/tools\/[a-z0-9-]+$/);
        
        // Should NOT be an API path
        expect(tool.path).not.toMatch(/^\/api\/tools\//);
        
        // Should match the tool ID
        expect(tool.path).toBe(`/tools/${tool.id}`);
      });
    });

    it('should have consistent tool IDs and paths', () => {
      const tools = toolRegistry.getMetadata();
      
      tools.forEach(tool => {
        // Tool ID should be kebab-case
        expect(tool.id).toMatch(/^[a-z0-9-]+$/);
        
        // Path should match ID
        expect(tool.path).toBe(`/tools/${tool.id}`);
        
        // Name should exist and be reasonable
        expect(tool.name).toBeDefined();
        expect(tool.name.length).toBeGreaterThan(3);
        
        // Description should exist and be reasonable
        expect(tool.description).toBeDefined();
        expect(tool.description.length).toBeGreaterThan(10);
      });
    });

    it('should have valid categories for all tools', () => {
      const tools = toolRegistry.getMetadata();
      const validCategories = ['analysis', 'research', 'utility'];
      
      tools.forEach(tool => {
        expect(tool.category).toBeDefined();
        expect(validCategories).toContain(tool.category);
      });
    });

    it('should have valid status for all tools', () => {
      const tools = toolRegistry.getMetadata();
      const validStatuses = ['stable', 'beta', 'experimental'];
      
      tools.forEach(tool => {
        expect(tool.status).toBeDefined();
        expect(validStatuses).toContain(tool.status);
      });
    });

    it('should not have duplicate tool IDs', () => {
      const tools = toolRegistry.getMetadata();
      const toolIds = tools.map(tool => tool.id);
      const uniqueIds = new Set(toolIds);
      
      expect(toolIds.length).toBe(uniqueIds.size);
    });

    it('should not have duplicate tool paths', () => {
      const tools = toolRegistry.getMetadata();
      const toolPaths = tools.map(tool => tool.path);
      const uniquePaths = new Set(toolPaths);
      
      expect(toolPaths.length).toBe(uniquePaths.size);
    });
  });

  describe('Individual Tool Config Validation', () => {
    // Test specific tools that have had issues in the past
    it('fuzzy-text-locator should have correct page path', () => {
      const tools = toolRegistry.getMetadata();
      const fuzzyTextLocator = tools.find(tool => tool.id === 'fuzzy-text-locator');
      
      expect(fuzzyTextLocator).toBeDefined();
      expect(fuzzyTextLocator!.path).toBe('/tools/fuzzy-text-locator');
      expect(fuzzyTextLocator!.path).not.toBe('/api/tools/fuzzy-text-locator');
    });

    it('all major tools should have correct page paths', () => {
      const tools = toolRegistry.getMetadata();
      const majorToolIds = [
        'check-spelling-grammar',
        'check-math',
        'fact-checker',
        'fuzzy-text-locator',
        'perplexity-research'
      ];

      majorToolIds.forEach(toolId => {
        const tool = tools.find(t => t.id === toolId);
        expect(tool).toBeDefined();
        expect(tool!.path).toBe(`/tools/${toolId}`);
        expect(tool!.path).not.toContain('/api/');
      });
    });
  });

  describe('Tool Registry Structure', () => {
    it('should have getMetadata method', () => {
      expect(typeof toolRegistry.getMetadata).toBe('function');
    });

    it('should return consistent data from getMetadata', () => {
      const tools1 = toolRegistry.getMetadata();
      const tools2 = toolRegistry.getMetadata();
      
      expect(tools1).toEqual(tools2);
      expect(tools1.length).toBe(tools2.length);
    });

    it('should have all required fields for each tool', () => {
      const tools = toolRegistry.getMetadata();
      const requiredFields = ['id', 'name', 'path', 'description', 'category', 'status'];
      
      tools.forEach(tool => {
        requiredFields.forEach(field => {
          expect(tool).toHaveProperty(field);
          expect(tool[field as keyof typeof tool]).toBeDefined();
          
          // String fields should not be empty
          if (typeof tool[field as keyof typeof tool] === 'string') {
            expect((tool[field as keyof typeof tool] as string).length).toBeGreaterThan(0);
          }
        });
      });
    });
  });
});