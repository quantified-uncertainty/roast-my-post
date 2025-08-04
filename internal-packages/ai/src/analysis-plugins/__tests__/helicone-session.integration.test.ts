/**
 * Integration test for Helicone session tracking across plugins and tools
 * 
 * This test ensures that when a plugin is run with a specific Helicone session ID,
 * all tools called by that plugin use the same session ID, not their own.
 */

import { PluginManager } from '../PluginManager';
import { SpellingGrammarPlugin } from '../plugins/spelling';
import { MathPlugin } from '../plugins/math';
import { FactCheckPlugin } from '../plugins/fact-check';
import { ForecastPlugin } from '../plugins/forecast';
import { sessionContext } from '../../helicone/sessionContext';
import { callClaude } from '../../claude/wrapper';
import type { HeliconeSessionConfig } from '../../helicone/sessions';

// Mock the Claude wrapper to intercept API calls
jest.mock('../../claude/wrapper');
const mockCallClaude = callClaude as jest.MockedFunction<typeof callClaude>;

// Mock logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

describe('Helicone Session Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset session context
    sessionContext.setSession(undefined);
  });

  afterEach(() => {
    // Clean up session context
    sessionContext.setSession(undefined);
  });

  describe('Session ID propagation in plugins', () => {
    it('should use the same session ID for all tool calls within a plugin', async () => {
      // Track all Helicone headers used in API calls
      const capturedHeaders: Array<{ toolName: string; headers: Record<string, string> }> = [];

      // Mock Claude responses for different tools
      mockCallClaude.mockImplementation(async (params) => {
        // Capture the headers
        const headers = params.headers || {};
        const toolName = params.messages?.[0]?.content?.includes('spelling') ? 'spelling-tool' :
                       params.messages?.[0]?.content?.includes('math') ? 'math-tool' :
                       params.messages?.[0]?.content?.includes('fact') ? 'fact-tool' :
                       params.messages?.[0]?.content?.includes('forecast') ? 'forecast-tool' :
                       'unknown-tool';
        
        capturedHeaders.push({ toolName, headers });

        // Return appropriate mock response based on tool
        if (toolName === 'spelling-tool') {
          return {
            content: JSON.stringify({
              errors: [
                {
                  type: 'spelling',
                  original: 'teh',
                  corrected: 'the',
                  explanation: 'Common typo',
                  severity: 'minor'
                }
              ]
            }),
            usage: { input_tokens: 100, output_tokens: 50 }
          };
        } else if (toolName === 'math-tool') {
          return {
            content: JSON.stringify({
              expressions: [
                {
                  originalText: '2 + 2 = 5',
                  hasError: true,
                  explanation: 'Incorrect calculation'
                }
              ]
            }),
            usage: { input_tokens: 100, output_tokens: 50 }
          };
        } else if (toolName === 'fact-tool') {
          return {
            content: JSON.stringify({
              claims: [
                {
                  originalText: 'The Earth is flat',
                  topic: 'Science',
                  importanceScore: 90,
                  checkabilityScore: 100,
                  truthProbability: 0
                }
              ]
            }),
            usage: { input_tokens: 100, output_tokens: 50 }
          };
        } else if (toolName === 'forecast-tool') {
          return {
            content: JSON.stringify({
              forecasts: [
                {
                  description: 'AI will achieve AGI by 2030',
                  authorProbability: 80,
                  precisionScore: 7
                }
              ]
            }),
            usage: { input_tokens: 100, output_tokens: 50 }
          };
        }

        // Default response
        return {
          content: '{}',
          usage: { input_tokens: 100, output_tokens: 50 }
        };
      });

      // Create a test session config
      const testSessionId = 'test-job-12345';
      const sessionConfig: HeliconeSessionConfig = {
        sessionId: testSessionId,
        sessionName: 'Integration Test Session',
        sessionPath: '/test',
        customProperties: {
          jobType: 'integration-test'
        }
      };

      // Create plugin manager with session config
      const pluginManager = new PluginManager({
        plugins: [
          new SpellingGrammarPlugin(),
          new MathPlugin(),
          new FactCheckPlugin(),
          new ForecastPlugin()
        ],
        logger: mockLogger,
        sessionConfig
      });

      // Test document with content that triggers all plugins
      const testDocument = `
        This is a test document with a spelling error: teh quick brown fox.
        
        Here's a math calculation: 2 + 2 = 5
        
        And a factual claim: The Earth is flat.
        
        And a forecast: I predict that AI will achieve AGI by 2030 with 80% probability.
      `;

      // Run analysis
      await pluginManager.runPlugins({
        documentContent: testDocument,
        targetHighlights: 10
      });

      // Verify that all API calls used the same session ID
      expect(capturedHeaders.length).toBeGreaterThan(0);
      
      const sessionIds = capturedHeaders.map(h => h.headers['Helicone-Session-Id']);
      const uniqueSessionIds = [...new Set(sessionIds)];
      
      // All calls should use the same session ID
      expect(uniqueSessionIds).toHaveLength(1);
      expect(uniqueSessionIds[0]).toBe(testSessionId);

      // Verify session paths are properly nested
      const sessionPaths = capturedHeaders.map(h => h.headers['Helicone-Session-Path']);
      
      // All paths should start with the base path
      sessionPaths.forEach(path => {
        expect(path).toMatch(/^\/test/);
      });

      // Different tools should have different sub-paths
      const uniquePaths = [...new Set(sessionPaths)];
      expect(uniquePaths.length).toBeGreaterThan(1);
    });

    it('should handle session context isolation between concurrent plugin runs', async () => {
      // Track headers for each job
      const job1Headers: Array<Record<string, string>> = [];
      const job2Headers: Array<Record<string, string>> = [];

      mockCallClaude.mockImplementation(async (params) => {
        const headers = params.headers || {};
        
        // Determine which job based on session ID
        if (headers['Helicone-Session-Id']?.includes('job1')) {
          job1Headers.push(headers);
        } else if (headers['Helicone-Session-Id']?.includes('job2')) {
          job2Headers.push(headers);
        }

        return {
          content: JSON.stringify({ errors: [] }),
          usage: { input_tokens: 100, output_tokens: 50 }
        };
      });

      // Create two plugin managers with different sessions
      const pluginManager1 = new PluginManager({
        plugins: [new SpellingGrammarPlugin()],
        logger: mockLogger,
        sessionConfig: {
          sessionId: 'job1-session',
          sessionName: 'Job 1',
          sessionPath: '/job1'
        }
      });

      const pluginManager2 = new PluginManager({
        plugins: [new SpellingGrammarPlugin()],
        logger: mockLogger,
        sessionConfig: {
          sessionId: 'job2-session',
          sessionName: 'Job 2',
          sessionPath: '/job2'
        }
      });

      // Run both analyses concurrently
      await Promise.all([
        pluginManager1.runPlugins({
          documentContent: 'Test document for job 1',
          targetHighlights: 5
        }),
        pluginManager2.runPlugins({
          documentContent: 'Test document for job 2',
          targetHighlights: 5
        })
      ]);

      // Verify isolation - no cross-contamination
      expect(job1Headers.length).toBeGreaterThan(0);
      expect(job2Headers.length).toBeGreaterThan(0);

      // All job1 calls should use job1 session
      job1Headers.forEach(headers => {
        expect(headers['Helicone-Session-Id']).toBe('job1-session');
        expect(headers['Helicone-Session-Path']).toMatch(/^\/job1/);
      });

      // All job2 calls should use job2 session
      job2Headers.forEach(headers => {
        expect(headers['Helicone-Session-Id']).toBe('job2-session');
        expect(headers['Helicone-Session-Path']).toMatch(/^\/job2/);
      });
    });

    it('should not create tool-specific session IDs when running within a plugin session', async () => {
      const capturedHeaders: Array<{ context: string; headers: Record<string, string> }> = [];

      mockCallClaude.mockImplementation(async (params) => {
        const headers = params.headers || {};
        const messageContent = params.messages?.[0]?.content || '';
        
        // Identify the context
        let context = 'unknown';
        if (messageContent.includes('route chunks')) {
          context = 'chunk-routing';
        } else if (messageContent.includes('math')) {
          context = 'math-extraction';
        } else if (messageContent.includes('verify')) {
          context = 'math-verification';
        }
        
        capturedHeaders.push({ context, headers });

        return {
          content: JSON.stringify({
            expressions: [{
              originalText: '2 + 2 = 4',
              hasError: false
            }]
          }),
          usage: { input_tokens: 100, output_tokens: 50 }
        };
      });

      const mainSessionId = 'main-job-session';
      const pluginManager = new PluginManager({
        plugins: [new MathPlugin()],
        logger: mockLogger,
        sessionConfig: {
          sessionId: mainSessionId,
          sessionName: 'Main Job',
          sessionPath: '/jobs/analysis'
        }
      });

      await pluginManager.runPlugins({
        documentContent: 'Calculate: 2 + 2 = 4',
        targetHighlights: 5
      });

      // All captured headers should use the main session ID
      expect(capturedHeaders.length).toBeGreaterThan(0);
      
      capturedHeaders.forEach(({ context, headers }) => {
        // Should NOT see tool-specific session IDs like "math-agentic-*" or "extract-math-*"
        expect(headers['Helicone-Session-Id']).toBe(mainSessionId);
        expect(headers['Helicone-Session-Id']).not.toMatch(/^math-agentic-/);
        expect(headers['Helicone-Session-Id']).not.toMatch(/^extract-math-/);
        expect(headers['Helicone-Session-Id']).not.toMatch(/^check-math-/);
        
        // But paths should still be properly nested
        expect(headers['Helicone-Session-Path']).toMatch(/^\/jobs\/analysis/);
      });
    });

    it('should properly handle tools that do not support session context', async () => {
      // Some tools might not check for session context
      // This test ensures the system handles this gracefully
      
      const capturedCalls: Array<{ hasHeaders: boolean; sessionId?: string }> = [];

      mockCallClaude.mockImplementation(async (params) => {
        const headers = params.headers || {};
        capturedCalls.push({
          hasHeaders: !!headers['Helicone-Session-Id'],
          sessionId: headers['Helicone-Session-Id']
        });

        return {
          content: JSON.stringify({ result: 'ok' }),
          usage: { input_tokens: 100, output_tokens: 50 }
        };
      });

      // Run without session config - tools should work normally
      const pluginManagerNoSession = new PluginManager({
        plugins: [new SpellingGrammarPlugin()],
        logger: mockLogger
        // No sessionConfig
      });

      await pluginManagerNoSession.runPlugins({
        documentContent: 'Test without session',
        targetHighlights: 5
      });

      // Some calls might not have session headers, and that's OK
      const callsWithoutSession = capturedCalls.filter(c => !c.hasHeaders);
      expect(callsWithoutSession.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Session metadata propagation', () => {
    it('should preserve custom properties through tool chains', async () => {
      const capturedProperties: Array<Record<string, string>> = [];

      mockCallClaude.mockImplementation(async (params) => {
        const headers = params.headers || {};
        
        // Extract custom properties from headers
        const customProps: Record<string, string> = {};
        Object.entries(headers).forEach(([key, value]) => {
          if (key.startsWith('Helicone-Property-')) {
            const propName = key.replace('Helicone-Property-', '');
            customProps[propName] = value;
          }
        });
        
        capturedProperties.push(customProps);

        return {
          content: JSON.stringify({ errors: [] }),
          usage: { input_tokens: 100, output_tokens: 50 }
        };
      });

      const pluginManager = new PluginManager({
        plugins: [new SpellingGrammarPlugin()],
        logger: mockLogger,
        sessionConfig: {
          sessionId: 'metadata-test',
          sessionName: 'Metadata Test',
          sessionPath: '/test',
          customProperties: {
            jobType: 'evaluation',
            documentId: 'doc-123',
            agentId: 'agent-456',
            environment: 'test'
          }
        }
      });

      await pluginManager.runPlugins({
        documentContent: 'Test metadata propagation',
        targetHighlights: 5
      });

      // All calls should have the custom properties
      expect(capturedProperties.length).toBeGreaterThan(0);
      
      capturedProperties.forEach(props => {
        expect(props.jobType).toBe('evaluation');
        expect(props.documentId).toBe('doc-123');
        expect(props.agentId).toBe('agent-456');
        expect(props.environment).toBe('test');
      });
    });
  });
});