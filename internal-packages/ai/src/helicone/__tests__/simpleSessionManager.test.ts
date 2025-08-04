import { describe, expect, test, beforeEach } from '@jest/globals';
import { 
  HeliconeSessionManager, 
  setGlobalSessionManager,
  getGlobalSessionManager,
  getCurrentHeliconeHeaders 
} from '../simpleSessionManager';

describe('HeliconeSessionManager', () => {
  beforeEach(() => {
    // Clear global session before each test
    setGlobalSessionManager(undefined);
  });

  describe('constructor validation', () => {
    test('validates session ID format', () => {
      expect(() => {
        new HeliconeSessionManager({
          sessionId: 'invalid session id!',
          sessionName: 'Test Session'
        });
      }).toThrow('Invalid session ID');
    });

    test('accepts valid session ID', () => {
      expect(() => {
        new HeliconeSessionManager({
          sessionId: 'valid-session-123',
          sessionName: 'Test Session'
        });
      }).not.toThrow();
    });
  });

  describe('header generation', () => {
    test('generates basic headers', () => {
      const manager = new HeliconeSessionManager({
        sessionId: 'test-123',
        sessionName: 'Test Session'
      });

      const headers = manager.getHeaders();
      
      expect(headers['Helicone-Session-Id']).toBe('test-123');
      expect(headers['Helicone-Session-Name']).toBe('Test Session');
      expect(headers['Helicone-Session-Path']).toBe('/');
    });

    test('includes user ID when provided', () => {
      const manager = new HeliconeSessionManager({
        sessionId: 'test-123',
        sessionName: 'Test Session',
        userId: 'user@example.com'
      });

      const headers = manager.getHeaders();
      expect(headers['Helicone-User-Id']).toBe('user@example.com');
    });

    test('includes properties as headers', () => {
      const manager = new HeliconeSessionManager({
        sessionId: 'test-123',
        sessionName: 'Test Session',
        properties: {
          JobId: 'job-456',
          AgentName: 'TestAgent'
        }
      });

      const headers = manager.getHeaders();
      expect(headers['Helicone-Property-JobId']).toBe('job-456');
      expect(headers['Helicone-Property-AgentName']).toBe('TestAgent');
    });
  });

  describe('path tracking', () => {
    test('tracks nested paths correctly', async () => {
      const manager = new HeliconeSessionManager({
        sessionId: 'test-123',
        sessionName: 'Test Session'
      });

      await manager.withPath('/analysis', undefined, async () => {
        expect(manager.getCurrentPath()).toBe('/analysis');
        
        await manager.withPath('/plugins', undefined, async () => {
          expect(manager.getCurrentPath()).toBe('/analysis/plugins');
          
          await manager.withPath('/math', undefined, async () => {
            expect(manager.getCurrentPath()).toBe('/analysis/plugins/math');
          });
          
          // Back to plugins level
          expect(manager.getCurrentPath()).toBe('/analysis/plugins');
        });
        
        // Back to analysis level
        expect(manager.getCurrentPath()).toBe('/analysis');
      });
      
      // Back to root
      expect(manager.getCurrentPath()).toBe('/');
    });

    test('validates path format', async () => {
      const manager = new HeliconeSessionManager({
        sessionId: 'test-123',
        sessionName: 'Test Session'
      });

      await expect(async () => {
        await manager.withPath('invalid-path', undefined, async () => {});
      }).rejects.toThrow('Invalid path format');
    });
  });

  describe('property stacking', () => {
    test('stacks properties with later values winning', async () => {
      const manager = new HeliconeSessionManager({
        sessionId: 'test-123',
        sessionName: 'Test Session',
        properties: {
          Level: 'base',
          JobId: 'job-123'
        }
      });

      await manager.withPath('/level1', { Level: 'one', Extra: 'value' }, async () => {
        await manager.withPath('/level2', { Level: 'two' }, async () => {
          const headers = manager.getHeaders();
          
          // Level should be 'two' (last one wins)
          expect(headers['Helicone-Property-Level']).toBe('two');
          // Extra should still be there
          expect(headers['Helicone-Property-Extra']).toBe('value');
          // JobId from base should still be there
          expect(headers['Helicone-Property-JobId']).toBe('job-123');
        });
      });
    });
  });

  describe('header sanitization', () => {
    test('sanitizes non-ASCII characters', () => {
      const manager = new HeliconeSessionManager({
        sessionId: 'test-123',
        sessionName: 'Test "Smart Quotes" – with em-dash'
      });

      const headers = manager.getHeaders();
      expect(headers['Helicone-Session-Name']).toBe('Test "Smart Quotes" - with em-dash');
    });

    test('truncates long values', () => {
      const longName = 'a'.repeat(250);
      const manager = new HeliconeSessionManager({
        sessionId: 'test-123',
        sessionName: longName
      });

      const headers = manager.getHeaders();
      expect(headers['Helicone-Session-Name'].length).toBe(200);
      expect(headers['Helicone-Session-Name'].endsWith('...')).toBe(true);
    });

    test('removes newlines', () => {
      const manager = new HeliconeSessionManager({
        sessionId: 'test-123',
        sessionName: 'Line 1\nLine 2\rLine 3'
      });

      const headers = manager.getHeaders();
      expect(headers['Helicone-Session-Name']).toBe('Line 1 Line 2 Line 3');
    });
  });

  describe('convenience methods', () => {
    test('trackPlugin adds correct path and properties', async () => {
      const manager = new HeliconeSessionManager({
        sessionId: 'test-123',
        sessionName: 'Test Session'
      });

      await manager.trackPlugin('math', async () => {
        const headers = manager.getHeaders();
        expect(headers['Helicone-Session-Path']).toBe('/plugins/math');
        expect(headers['Helicone-Property-plugin']).toBe('math');
      });
    });

    test('trackTool adds correct path and properties', async () => {
      const manager = new HeliconeSessionManager({
        sessionId: 'test-123',
        sessionName: 'Test Session'
      });

      await manager.trackTool('check-math', async () => {
        const headers = manager.getHeaders();
        expect(headers['Helicone-Session-Path']).toBe('/tools/check-math');
        expect(headers['Helicone-Property-tool']).toBe('check-math');
      });
    });

    test('trackAnalysis adds correct path and properties', async () => {
      const manager = new HeliconeSessionManager({
        sessionId: 'test-123',
        sessionName: 'Test Session'
      });

      await manager.trackAnalysis('comprehensive', async () => {
        const headers = manager.getHeaders();
        expect(headers['Helicone-Session-Path']).toBe('/analysis/comprehensive');
        expect(headers['Helicone-Property-analysis']).toBe('comprehensive');
      });
    });
  });

  describe('forJob factory method', () => {
    test('creates job session with correct configuration', () => {
      const manager = HeliconeSessionManager.forJob(
        'job-123',
        'Test Job Name',
        {
          AgentId: 'agent-456',
          DocumentId: 'doc-789'
        }
      );

      const headers = manager.getHeaders();
      expect(headers['Helicone-Session-Id']).toBe('job-123');
      expect(headers['Helicone-Session-Name']).toBe('Test Job Name');
      expect(headers['Helicone-Property-AgentId']).toBe('agent-456');
      expect(headers['Helicone-Property-DocumentId']).toBe('doc-789');
    });
  });

  describe('global session management', () => {
    test('sets and gets global session manager', () => {
      expect(getGlobalSessionManager()).toBeUndefined();
      
      const manager = new HeliconeSessionManager({
        sessionId: 'global-123',
        sessionName: 'Global Session'
      });
      
      setGlobalSessionManager(manager);
      expect(getGlobalSessionManager()).toBe(manager);
      
      setGlobalSessionManager(undefined);
      expect(getGlobalSessionManager()).toBeUndefined();
    });

    test('getCurrentHeliconeHeaders returns headers from global manager', () => {
      expect(getCurrentHeliconeHeaders()).toEqual({});
      
      const manager = new HeliconeSessionManager({
        sessionId: 'global-123',
        sessionName: 'Global Session'
      });
      
      setGlobalSessionManager(manager);
      
      const headers = getCurrentHeliconeHeaders();
      expect(headers['Helicone-Session-Id']).toBe('global-123');
      expect(headers['Helicone-Session-Name']).toBe('Global Session');
    });
  });

  describe('error handling', () => {
    test('returns value from async function', async () => {
      const manager = new HeliconeSessionManager({
        sessionId: 'test-123',
        sessionName: 'Test Session'
      });

      const result = await manager.withPath('/test', undefined, async () => {
        return 'test-value';
      });

      expect(result).toBe('test-value');
    });

    test('propagates errors from async function', async () => {
      const manager = new HeliconeSessionManager({
        sessionId: 'test-123',
        sessionName: 'Test Session'
      });

      await expect(async () => {
        await manager.withPath('/test', undefined, async () => {
          throw new Error('Test error');
        });
      }).rejects.toThrow('Test error');
    });

    test('cleans up path stack on error', async () => {
      const manager = new HeliconeSessionManager({
        sessionId: 'test-123',
        sessionName: 'Test Session'
      });

      try {
        await manager.withPath('/test', undefined, async () => {
          expect(manager.getCurrentPath()).toBe('/test');
          throw new Error('Test error');
        });
      } catch (e) {
        // Expected error
      }

      // Path should be cleaned up
      expect(manager.getCurrentPath()).toBe('/');
    });
  });
});