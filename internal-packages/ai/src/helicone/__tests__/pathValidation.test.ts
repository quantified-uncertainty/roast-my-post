import { describe, expect, test } from '@jest/globals';
import { HeliconeSessionManager } from '../simpleSessionManager';

describe('Path Validation Fix', () => {
  test('rejects empty path segments', async () => {
    const manager = new HeliconeSessionManager({
      sessionId: 'test-123',
      sessionName: 'Test'
    });
    
    // Should reject paths with empty segments
    await expect(
      manager.withPath('/plugins//math', undefined, async () => {})
    ).rejects.toThrow('Invalid path format');
    
    await expect(
      manager.withPath('/plugins/', undefined, async () => {})
    ).rejects.toThrow('Invalid path format');
  });
  
  test('accepts valid paths', async () => {
    const manager = new HeliconeSessionManager({
      sessionId: 'test-123',
      sessionName: 'Test'
    });
    
    // Root path
    await expect(
      manager.withPath('/', undefined, async () => 'ok')
    ).resolves.toBe('ok');
    
    // Single segment
    await expect(
      manager.withPath('/plugins', undefined, async () => 'ok')
    ).resolves.toBe('ok');
    
    // Multiple segments
    await expect(
      manager.withPath('/plugins/math', undefined, async () => 'ok')
    ).resolves.toBe('ok');
    
    // With hyphens and underscores
    await expect(
      manager.withPath('/plugins/spell-checker', undefined, async () => 'ok')
    ).resolves.toBe('ok');
    
    await expect(
      manager.withPath('/tools/check_math', undefined, async () => 'ok')
    ).resolves.toBe('ok');
  });
  
  test('rejects invalid characters', async () => {
    const manager = new HeliconeSessionManager({
      sessionId: 'test-123',
      sessionName: 'Test'
    });
    
    await expect(
      manager.withPath('/plugins/math!', undefined, async () => {})
    ).rejects.toThrow('Invalid path format');
    
    await expect(
      manager.withPath('/plugins/math@tool', undefined, async () => {})
    ).rejects.toThrow('Invalid path format');
  });
});