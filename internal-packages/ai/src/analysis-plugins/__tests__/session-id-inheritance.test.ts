/**
 * Test to verify that Helicone session IDs are properly inherited
 * from parent context to child tool calls
 */

import { sessionContext } from '../../helicone/sessionContext';
import { createHeliconeHeaders } from '../../helicone/sessions';
import type { HeliconeSessionConfig } from '../../helicone/sessions';

describe('Helicone Session ID Inheritance', () => {
  beforeEach(() => {
    sessionContext.setSession(undefined);
  });

  afterEach(() => {
    sessionContext.setSession(undefined);
  });

  describe('Session Context Behavior', () => {
    it('should preserve session ID when extending path', () => {
      // Set up parent session
      const parentSession: HeliconeSessionConfig = {
        sessionId: 'parent-job-123',
        sessionName: 'Parent Job',
        sessionPath: '/jobs/analysis',
        customProperties: {
          jobType: 'document-analysis',
          documentId: 'doc-456'
        }
      };
      
      sessionContext.setSession(parentSession);
      
      // Extend the path (what tools should do)
      const extendedSession = sessionContext.withPath('/tools/spell-check');
      
      // Session ID should be preserved
      expect(extendedSession?.sessionId).toBe('parent-job-123');
      expect(extendedSession?.sessionName).toBe('Parent Job');
      expect(extendedSession?.sessionPath).toBe('/jobs/analysis/tools/spell-check');
      expect(extendedSession?.customProperties).toEqual({
        jobType: 'document-analysis',
        documentId: 'doc-456'
      });
    });

    it('should preserve session when adding properties', () => {
      const parentSession: HeliconeSessionConfig = {
        sessionId: 'parent-job-456',
        sessionName: 'Analysis Job',
        sessionPath: '/analysis'
      };
      
      sessionContext.setSession(parentSession);
      
      // Add properties (what tools might do)
      const enhancedSession = sessionContext.withProperties({
        tool: 'math-checker',
        operation: 'verify'
      });
      
      // Session ID and path should be preserved
      expect(enhancedSession?.sessionId).toBe('parent-job-456');
      expect(enhancedSession?.sessionPath).toBe('/analysis');
      expect(enhancedSession?.customProperties).toEqual({
        tool: 'math-checker',
        operation: 'verify'
      });
    });

    it('should handle nested context correctly', () => {
      const mainSession: HeliconeSessionConfig = {
        sessionId: 'main-789',
        sessionName: 'Main Analysis',
        sessionPath: '/main',
        customProperties: {
          source: 'api'
        }
      };
      
      sessionContext.setSession(mainSession);
      
      // First level - plugin extends
      const pluginSession = sessionContext.withPath('/plugins/fact-check');
      expect(pluginSession?.sessionId).toBe('main-789');
      expect(pluginSession?.sessionPath).toBe('/main/plugins/fact-check');
      
      // Second level - tool extends from plugin context
      // This simulates what should happen when a tool is called from a plugin
      const toolSession = sessionContext.withPath('/tools/perplexity');
      expect(toolSession?.sessionId).toBe('main-789');
      expect(toolSession?.sessionPath).toBe('/main/tools/perplexity');
    });
  });

  describe('Helicone Headers Generation', () => {
    it('should generate correct headers for extended session', () => {
      const baseSession: HeliconeSessionConfig = {
        sessionId: 'job-999',
        sessionName: 'Test Job',
        sessionPath: '/test',
        customProperties: {
          env: 'test'
        }
      };
      
      sessionContext.setSession(baseSession);
      
      // Extend for tool usage
      const toolSession = sessionContext.withPath('/tools/grammar-check');
      const headers = toolSession ? createHeliconeHeaders(toolSession) : {};
      
      // Verify headers maintain the original session ID
      expect(headers['Helicone-Session-Id']).toBe('job-999');
      expect(headers['Helicone-Session-Name']).toBe('Test Job');
      expect(headers['Helicone-Session-Path']).toBe('/test/tools/grammar-check');
      expect(headers['Helicone-Property-env']).toBe('test');
    });

    it('should handle property additions in headers', () => {
      const session: HeliconeSessionConfig = {
        sessionId: 'test-123',
        sessionName: 'Test',
        sessionPath: '/root'
      };
      
      sessionContext.setSession(session);
      
      // Add tool-specific properties
      const enhanced = sessionContext.withProperties({
        plugin: 'spelling',
        chunk: 'chunk-1'
      });
      
      const headers = enhanced ? createHeliconeHeaders(enhanced) : {};
      
      expect(headers['Helicone-Session-Id']).toBe('test-123');
      expect(headers['Helicone-Property-plugin']).toBe('spelling');
      expect(headers['Helicone-Property-chunk']).toBe('chunk-1');
    });
  });

  describe('Common Anti-patterns', () => {
    it('demonstrates the WRONG way: replacing session context', () => {
      // Parent sets session
      sessionContext.setSession({
        sessionId: 'parent-original',
        sessionName: 'Original Session',
        sessionPath: '/original'
      });
      
      // WRONG: Tool replaces entire session
      sessionContext.setSession({
        sessionId: 'tool-new-session',  // Different ID!
        sessionName: 'Tool Session',
        sessionPath: '/tools/my-tool'
      });
      
      // Parent session is lost
      const current = sessionContext.getSession();
      expect(current?.sessionId).toBe('tool-new-session'); // Wrong!
      expect(current?.sessionId).not.toBe('parent-original'); // Lost parent!
    });

    it('demonstrates the RIGHT way: extending session context', () => {
      // Parent sets session
      sessionContext.setSession({
        sessionId: 'parent-original',
        sessionName: 'Original Session', 
        sessionPath: '/original',
        customProperties: {
          important: 'data'
        }
      });
      
      // RIGHT: Tool extends existing session
      const toolSession = sessionContext.withPath('/tools/my-tool');
      
      // Create headers from extended session
      const headers = toolSession ? createHeliconeHeaders(toolSession) : {};
      
      // Parent session ID is preserved
      expect(headers['Helicone-Session-Id']).toBe('parent-original');
      expect(headers['Helicone-Session-Path']).toBe('/original/tools/my-tool');
      expect(headers['Helicone-Property-important']).toBe('data');
      
      // Original context is still intact
      const current = sessionContext.getSession();
      expect(current?.sessionId).toBe('parent-original');
    });
  });

  describe('Async Context Isolation', () => {
    it('should maintain separate contexts in concurrent operations', async () => {
      const results: string[] = [];
      
      // Simulate two concurrent plugin runs
      const job1 = sessionContext.runWithSession(
        {
          sessionId: 'job-1',
          sessionName: 'Job 1',
          sessionPath: '/job1'
        },
        async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          const session = sessionContext.getSession();
          results.push(session?.sessionId || 'none');
          return session?.sessionId;
        }
      );
      
      const job2 = sessionContext.runWithSession(
        {
          sessionId: 'job-2',
          sessionName: 'Job 2',
          sessionPath: '/job2'
        },
        async () => {
          await new Promise(resolve => setTimeout(resolve, 5));
          const session = sessionContext.getSession();
          results.push(session?.sessionId || 'none');
          return session?.sessionId;
        }
      );
      
      const [result1, result2] = await Promise.all([job1, job2]);
      
      // Each context should maintain its own session
      expect(result1).toBe('job-1');
      expect(result2).toBe('job-2');
      expect(results).toContain('job-1');
      expect(results).toContain('job-2');
    });
  });
});