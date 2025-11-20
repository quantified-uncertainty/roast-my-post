import { describe, it, expect } from 'vitest';
/**
 * Test suite for tool pages structure
 * Verifies that the dynamic routing system works properly
 */

describe('Tool Pages Structure', () => {
  describe('Tool Page Routes', () => {
    it('should have the docs page at [toolId]/docs/page.tsx', () => {
      const fs = require('fs');
      const path = require('path');
      
      const filePath = path.join(__dirname, '../[toolId]/docs/page.tsx');
      expect(fs.existsSync(filePath)).toBe(true);
      
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('export default');
      expect(content).toContain('GenericToolDocsPage');
    });

    it('should have the try page at [toolId]/try/page.tsx', () => {
      const fs = require('fs');
      const path = require('path');
      
      const filePath = path.join(__dirname, '../[toolId]/try/page.tsx');
      expect(fs.existsSync(filePath)).toBe(true);
      
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('export default');
      expect(content).toContain('ToolTryPageClient');
    });

    it('should have the layout at [toolId]/layout.tsx', () => {
      const fs = require('fs');
      const path = require('path');
      
      const filePath = path.join(__dirname, '../[toolId]/layout.tsx');
      expect(fs.existsSync(filePath)).toBe(true);
      
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('export default');
      expect(content).toContain('ToolLayout');
    });
  });

  describe('Main Tools Page', () => {
    it('should have a main tools listing page', () => {
      const fs = require('fs');
      const path = require('path');
      
      const filePath = path.join(__dirname, '../page.tsx');
      expect(fs.existsSync(filePath)).toBe(true);
      
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('export default');
      expect(content).toContain('ToolsIndexPage');
    });
  });

  describe('Tool Components', () => {
    it('should have GenericToolDocsPage component file', () => {
      const fs = require('fs');
      const path = require('path');
      
      // The component is in DocsPage.tsx but exports GenericToolDocsPage
      const filePath = path.join(__dirname, '../components/DocsPage.tsx');
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