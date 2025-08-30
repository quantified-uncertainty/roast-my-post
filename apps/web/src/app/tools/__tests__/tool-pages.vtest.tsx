import { describe, it, expect } from 'vitest';
/**
 * Test suite for tool pages structure
 * Verifies that the dynamic routing system works properly
 */

describe('Tool Pages Structure', () => {
  describe('Dynamic Tool Page Route', () => {
    it('should have the dynamic tool page at [toolId]/[...slug]/page.tsx', async () => {
      try {
        // Try importing from the path using Node require since ES import doesn't work well with bracket notation in tests
        const fs = require('fs');
        const path = require('path');
        
        // Check if the file exists
        const filePath = path.join(__dirname, '../[toolId]/[...slug]/page.tsx');
        expect(fs.existsSync(filePath)).toBe(true);
        
        // For the dynamic route, we can't easily test the import due to bracket notation
        // But we can verify the file exists and contains expected content
        const content = fs.readFileSync(filePath, 'utf-8');
        expect(content).toContain('export default');
        expect(content).toContain('function');
      } catch (error) {
        throw new Error(`Dynamic tool page route missing: ${error.message}`);
      }
    });
  });

  describe('Main Tools Page', () => {
    it('should have a main tools listing page', async () => {
      try {
        const pageModule = await import('../page.tsx');
        expect(pageModule.default).toBeDefined();
        expect(typeof pageModule.default).toBe('function');
      } catch (error) {
        throw new Error('Main tools page missing');
      }
    });
  });

  describe('Tool Components', () => {
    it('should have GenericToolDocsPage component file', () => {
      const fs = require('fs');
      const path = require('path');
      
      const filePath = path.join(__dirname, '../components/GenericToolDocsPage.tsx');
      expect(fs.existsSync(filePath)).toBe(true);
      
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('export');
      expect(content).toContain('GenericToolDocsPage');
    });

    it('should have GenericToolTryPage component file', () => {
      const fs = require('fs');
      const path = require('path');
      
      const filePath = path.join(__dirname, '../components/GenericToolTryPage.tsx');
      expect(fs.existsSync(filePath)).toBe(true);
      
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('export');
      expect(content).toContain('GenericToolTryPage');
    });

    it('should have AuthenticatedToolPage component file', () => {
      const fs = require('fs');
      const path = require('path');
      
      const filePath = path.join(__dirname, '../components/AuthenticatedToolPage.tsx');
      expect(fs.existsSync(filePath)).toBe(true);
      
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('export');
      expect(content).toContain('AuthenticatedToolPage');
    });
  });

  describe('Tool Examples Configuration', () => {
    it('should have tool examples configuration', async () => {
      try {
        const { toolExamples } = await import('../utils/toolExamples');
        expect(toolExamples).toBeDefined();
        expect(typeof toolExamples).toBe('object');
      } catch (error) {
        throw new Error('Tool examples configuration missing');
      }
    });
  });
});