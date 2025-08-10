import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';

describe('generated-readmes.ts', () => {
  it('should be up-to-date with source README.md files', async () => {
    // Dynamic import to avoid path issues
    const { allTools } = await import('@roast/ai/tools/all-tools');
    const { toolReadmes } = await import('@roast/ai/tools/generated-readmes');
    
    // Read current README files (same logic as generate script)
    const currentReadmes: Record<string, string> = {};
    const aiToolsPath = path.resolve(__dirname, '../../../../internal-packages/ai/src/tools');
    
    for (const [id, tool] of Object.entries(allTools)) {
      const readmePath = path.join(aiToolsPath, id, 'README.md');
      
      if (fs.existsSync(readmePath)) {
        try {
          currentReadmes[id] = fs.readFileSync(readmePath, 'utf-8');
        } catch (error) {
          currentReadmes[id] = `# ${tool.config.name}\n\n*README content not available*`;
        }
      } else {
        currentReadmes[id] = `# ${tool.config.name}\n\n*README content not available*`;
      }
    }
    
    // Calculate expected hash
    const currentContent = JSON.stringify(currentReadmes, null, 2);
    const expectedHash = createHash('sha256').update(currentContent).digest('hex');
    
    // Read the hash from the generated file
    const generatedFilePath = path.join(aiToolsPath, 'generated-readmes.ts');
    const generatedContent = fs.readFileSync(generatedFilePath, 'utf-8');
    const hashMatch = generatedContent.match(/README Hash: ([a-f0-9]{64})/);
    
    if (!hashMatch) {
      throw new Error('Could not find README hash in generated file');
    }
    
    const actualHash = hashMatch[1];
    
    // Compare hashes with helpful error message
    if (actualHash !== expectedHash) {
      throw new Error(
        `Generated README file is out of date!\n` +
        `Expected hash: ${expectedHash}\n` +
        `Actual hash:   ${actualHash}\n\n` +
        `Please run: pnpm --filter @roast/ai run generate-readmes\n` +
        `Or from project root: cd internal-packages/ai && pnpm run generate-readmes`
      );
    }
    
    // Also verify the actual content matches (more detailed error)
    expect(toolReadmes).toEqual(currentReadmes);
  });
  
  it('should have README content for all tools in the registry', async () => {
    const { allTools } = await import('@roast/ai/tools/all-tools');
    const { toolReadmes } = await import('@roast/ai/tools/generated-readmes');
    
    const toolIds = Object.keys(allTools);
    const readmeIds = Object.keys(toolReadmes);
    
    // Every tool should have a README entry (even if it's the fallback content)
    for (const toolId of toolIds) {
      expect(readmeIds).toContain(toolId);
      expect(toolReadmes[toolId as keyof typeof toolReadmes]).toBeDefined();
      expect(toolReadmes[toolId as keyof typeof toolReadmes]).not.toBe('');
    }
  });
  
  it('should not have orphaned README entries', async () => {
    const { allTools } = await import('@roast/ai/tools/all-tools');
    const { toolReadmes } = await import('@roast/ai/tools/generated-readmes');
    
    const toolIds = Object.keys(allTools);
    const readmeIds = Object.keys(toolReadmes);
    
    // No README entries should exist for tools not in the registry
    for (const readmeId of readmeIds) {
      expect(toolIds).toContain(readmeId);
    }
  });
});