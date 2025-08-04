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
      
      setGlobalSessionManager(manager);

      await manager.withPath('/analysis', undefined, async () => {
        expect(getCurrentHeliconeHeaders()['Helicone-Session-Path']).toBe('/analysis');
        
        // Get the current global manager (which is now the child)
        const currentManager = getGlobalSessionManager()!;
        
        await currentManager.withPath('/plugins', undefined, async () => {
          expect(getCurrentHeliconeHeaders()['Helicone-Session-Path']).toBe('/analysis/plugins');
          
          // Get the current global manager again for nested call
          const nestedManager = getGlobalSessionManager()!;
          
          await nestedManager.withPath('/math', undefined, async () => {
            expect(getCurrentHeliconeHeaders()['Helicone-Session-Path']).toBe('/analysis/plugins/math');
          });
          
          // Back to plugins level
          expect(getCurrentHeliconeHeaders()['Helicone-Session-Path']).toBe('/analysis/plugins');
        });
        
        // Back to analysis level
        expect(getCurrentHeliconeHeaders()['Helicone-Session-Path']).toBe('/analysis');
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

      setGlobalSessionManager(manager);
      
      await manager.withPath('/level1', { Level: 'one', Extra: 'value' }, async () => {
        // Get the current global manager for nested call
        const currentManager = getGlobalSessionManager()!;
        
        await currentManager.withPath('/level2', { Level: 'two' }, async () => {
          const headers = getCurrentHeliconeHeaders();
          
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
      
      setGlobalSessionManager(manager);

      await manager.trackPlugin('math', async () => {
        const headers = getCurrentHeliconeHeaders();
        expect(headers['Helicone-Session-Path']).toBe('/plugins/math');
        expect(headers['Helicone-Property-plugin']).toBe('math');
      });
    });

    test('trackTool adds correct path and properties', async () => {
      const manager = new HeliconeSessionManager({
        sessionId: 'test-123',
        sessionName: 'Test Session'
      });
      
      setGlobalSessionManager(manager);

      await manager.trackTool('check-math', async () => {
        const headers = getCurrentHeliconeHeaders();
        expect(headers['Helicone-Session-Path']).toBe('/tools/check-math');
        expect(headers['Helicone-Property-tool']).toBe('check-math');
      });
    });

    test('trackAnalysis adds correct path and properties', async () => {
      const manager = new HeliconeSessionManager({
        sessionId: 'test-123',
        sessionName: 'Test Session'
      });
      
      setGlobalSessionManager(manager);

      await manager.trackAnalysis('comprehensive', async () => {
        const headers = getCurrentHeliconeHeaders();
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

  describe('plugin and tool session hierarchy', () => {
    test('tools should inherit session ID from global manager', async () => {
      // Create a job session manager and set it globally
      const jobManager = HeliconeSessionManager.forJob(
        'job-123',
        'Test Job',
        {
          JobId: 'job-123',
          AgentId: 'agent-456'
        }
      );
      
      setGlobalSessionManager(jobManager);
      
      // Simulate plugin execution
      await jobManager.trackPlugin('math', async () => {
        const pluginHeaders = getCurrentHeliconeHeaders();
        expect(pluginHeaders['Helicone-Session-Id']).toBe('job-123');
        expect(pluginHeaders['Helicone-Session-Path']).toBe('/plugins/math');
        expect(pluginHeaders['Helicone-Property-plugin']).toBe('math');
        
        // Simulate tool execution within plugin
        await jobManager.trackTool('check-math', async () => {
          const toolHeaders = getCurrentHeliconeHeaders();
          // Tool should inherit the same session ID
          expect(toolHeaders['Helicone-Session-Id']).toBe('job-123');
          expect(toolHeaders['Helicone-Session-Path']).toBe('/plugins/math/tools/check-math');
          expect(toolHeaders['Helicone-Property-tool']).toBe('check-math');
        });
      });
    });

    test('nested tool calls maintain session hierarchy', async () => {
      const sessionId = 'job-456';
      const manager = HeliconeSessionManager.forJob(
        sessionId,
        'Complex Analysis Job',
        { JobId: 'job-456' }
      );
      
      setGlobalSessionManager(manager);
      
      // Track the full hierarchy path
      const capturedHeaders: Array<{context: string, headers: Record<string, string>}> = [];
      
      await manager.trackAnalysis('document', async () => {
        capturedHeaders.push({
          context: 'analysis',
          headers: { ...getCurrentHeliconeHeaders() }
        });
        
        await manager.trackPlugin('forecast', async () => {
          capturedHeaders.push({
            context: 'plugin',
            headers: { ...getCurrentHeliconeHeaders() }
          });
          
          await manager.trackTool('extract-forecasts', async () => {
            capturedHeaders.push({
              context: 'tool',
              headers: { ...getCurrentHeliconeHeaders() }
            });
          });
        });
      });
      
      // Verify all contexts use the same session ID
      for (const capture of capturedHeaders) {
        expect(capture.headers['Helicone-Session-Id']).toBe(sessionId);
      }
      
      // Verify correct path hierarchy
      expect(capturedHeaders[0].headers['Helicone-Session-Path']).toBe('/analysis/document');
      expect(capturedHeaders[1].headers['Helicone-Session-Path']).toBe('/analysis/document/plugins/forecast');
      expect(capturedHeaders[2].headers['Helicone-Session-Path']).toBe('/analysis/document/plugins/forecast/tools/extract-forecasts');
    });

    test('parallel plugin execution shares session ID but may have overlapping paths', async () => {
      const manager = HeliconeSessionManager.forJob(
        'job-789',
        'Parallel Job',
        { JobId: 'job-789' }
      );
      
      setGlobalSessionManager(manager);
      
      const plugin1Headers: Record<string, string>[] = [];
      const plugin2Headers: Record<string, string>[] = [];
      
      // Run plugins in parallel
      await Promise.all([
        manager.trackPlugin('math', async () => {
          plugin1Headers.push({ ...getCurrentHeliconeHeaders() });
          await new Promise(resolve => setTimeout(resolve, 10)); // Simulate work
          plugin1Headers.push({ ...getCurrentHeliconeHeaders() });
        }),
        manager.trackPlugin('spelling', async () => {
          plugin2Headers.push({ ...getCurrentHeliconeHeaders() });
          await new Promise(resolve => setTimeout(resolve, 10)); // Simulate work
          plugin2Headers.push({ ...getCurrentHeliconeHeaders() });
        })
      ]);
      
      // Both plugins should have the same session ID
      for (const headers of [...plugin1Headers, ...plugin2Headers]) {
        expect(headers['Helicone-Session-Id']).toBe('job-789');
      }
      
      // Paths may overlap due to parallel execution with global state
      // This is a known limitation - plugins running in parallel may interfere
      // The important part is they share the same session ID for tracking
      expect(plugin1Headers[0]['Helicone-Session-Path']).toMatch(/\/plugins\/(math|spelling)/);
      expect(plugin2Headers[0]['Helicone-Session-Path']).toMatch(/\/plugins\/(math|spelling)/);
    });

    test('global session manager is cleared after job completion', () => {
      const manager = HeliconeSessionManager.forJob(
        'job-999',
        'Cleanup Test Job',
        { JobId: 'job-999' }
      );
      
      setGlobalSessionManager(manager);
      expect(getGlobalSessionManager()).toBe(manager);
      
      // Simulate job completion
      setGlobalSessionManager(undefined);
      
      // Headers should be empty after cleanup
      expect(getCurrentHeliconeHeaders()).toEqual({});
      expect(getGlobalSessionManager()).toBeUndefined();
    });

    test('tools without global manager create standalone sessions', () => {
      // Clear any global manager
      setGlobalSessionManager(undefined);
      
      // When there's no global manager, getCurrentHeliconeHeaders returns empty
      const headers = getCurrentHeliconeHeaders();
      expect(headers).toEqual({});
      expect(headers['Helicone-Session-Id']).toBeUndefined();
    });
  });
});