/**
 * Focused test demonstrating the session ID override issue
 * 
 * Problem: When plugins call tools, the tools create their own session IDs
 * instead of using the parent session ID from the plugin context.
 */

import { sessionContext } from '../../helicone/sessionContext';
import { checkMathWithMathJsTool } from '../../tools/check-math-with-mathjs';
import { extractMathExpressionsTool } from '../../tools/extract-math-expressions';
import { callClaude } from '../../claude/wrapper';

// Mock the Claude wrapper
jest.mock('../../claude/wrapper');
const mockCallClaude = callClaude as jest.MockedFunction<typeof callClaude>;

// Mock logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

describe('Session ID Override Issue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionContext.setSession(undefined);
  });

  it('demonstrates the problem: tools create their own session IDs', async () => {
    const capturedSessionIds: string[] = [];

    mockCallClaude.mockImplementation(async (params) => {
      const sessionId = params.heliconeHeaders?.['Helicone-Session-Id'];
      if (sessionId) {
        capturedSessionIds.push(sessionId);
      }

      // Mock response for math extraction
      if (params.messages?.[0]?.content?.includes('extract')) {
        return {
          response: {
            id: 'test-id',
            type: 'message' as const,
            role: 'assistant' as const,
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                expressions: [{
                  originalText: '2 + 2 = 4',
                  hasError: false,
                  explanation: 'Simple addition'
                }]
              })
            }],
            model: 'claude-3',
            stop_reason: 'end_turn' as const,
            stop_sequence: null,
            usage: { input_tokens: 100, output_tokens: 50 }
          },
          interaction: {
            id: 'test-interaction',
            prompt: '',
            response: '',
            tokensUsed: { prompt: 100, completion: 50, total: 150 },
            model: 'claude-3',
            toolsUsed: []
          }
        };
      }

      // Mock response for math checking
      return {
        response: {
          id: 'test-id-2',
          type: 'message' as const,
          role: 'assistant' as const,
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              verification: {
                status: 'verified_true',
                explanation: 'Correct calculation'
              }
            })
          }],
          model: 'claude-3',
          stop_reason: 'end_turn' as const,
          stop_sequence: null,
          usage: { input_tokens: 100, output_tokens: 50 }
        },
        interaction: {
          id: 'test-interaction-2',
          prompt: '',
          response: '',
          tokensUsed: { prompt: 100, completion: 50, total: 150 },
          model: 'claude-3',
          toolsUsed: []
        }
      };
    });

    // Set up a plugin session
    const pluginSessionId = 'plugin-session-123';
    sessionContext.setSession({
      sessionId: pluginSessionId,
      sessionName: 'Plugin Analysis',
      sessionPath: '/plugins/math'
    });

    // Simulate what happens in the Math plugin
    
    // 1. Extract math expressions (this is what the plugin does)
    await extractMathExpressionsTool.execute(
      { text: 'Calculate: 2 + 2 = 4' },
      { logger: mockLogger }
    );

    // 2. Check math (this is what the plugin does)
    await checkMathWithMathJsTool.execute(
      { 
        statement: '2 + 2 = 4',
        context: 'Simple addition test'
      },
      { logger: mockLogger }
    );

    // THE PROBLEM: Each tool creates its own session ID
    console.log('Captured session IDs:', capturedSessionIds);
    
    // We expect all calls to use the plugin session ID
    const expectedSessionId = pluginSessionId;
    const allUsePluginSession = capturedSessionIds.every(id => id === expectedSessionId);
    
    // This test will FAIL, demonstrating the issue
    expect(allUsePluginSession).toBe(false); // Currently fails!
    
    // What actually happens:
    // - Some IDs might be 'plugin-session-123' (if context is preserved)
    // - Some IDs might be 'extract-math-expressions-[timestamp]'
    // - Some IDs might be 'math-agentic-[timestamp]-[random]'
    
    // Log the actual session IDs to show the problem
    const uniqueSessionIds = [...new Set(capturedSessionIds)];
    console.log('Unique session IDs found:', uniqueSessionIds);
    
    // This shows that tools are creating their own sessions
    expect(uniqueSessionIds.length).toBeGreaterThan(1);
  });

  it('shows the desired behavior: all tools use parent session', async () => {
    const capturedHeaders: Array<{
      tool: string;
      sessionId?: string;
      sessionPath?: string;
    }> = [];

    mockCallClaude.mockImplementation(async (params) => {
      const headers = params.heliconeHeaders || {};
      const tool = params.messages?.[0]?.content?.includes('extract') ? 'extract' : 'check';
      
      capturedHeaders.push({
        tool,
        sessionId: headers['Helicone-Session-Id'],
        sessionPath: headers['Helicone-Session-Path']
      });

      return {
        response: {
          id: 'test-id',
          type: 'message' as const,
          role: 'assistant' as const,
          content: [{
            type: 'text' as const,
            text: JSON.stringify({ result: 'ok' })
          }],
          model: 'claude-3',
          stop_reason: 'end_turn' as const,
          stop_sequence: null,
          usage: { input_tokens: 100, output_tokens: 50 }
        },
        interaction: {
          id: 'test-interaction',
          prompt: '',
          response: '',
          tokensUsed: { prompt: 100, completion: 50, total: 150 },
          model: 'claude-3',
          toolsUsed: []
        }
      };
    });

    // This is what SHOULD happen
    const parentSessionId = 'parent-job-12345';
    const parentSessionConfig = {
      sessionId: parentSessionId,
      sessionName: 'Document Analysis Job',
      sessionPath: '/jobs/analysis',
      customProperties: {
        documentId: 'doc-789',
        agentId: 'agent-123'
      }
    };

    // Run in session context (what PluginManager does)
    await sessionContext.runWithSession(parentSessionConfig, async () => {
      // Tools should inherit the session
      await extractMathExpressionsTool.execute(
        { text: 'Math: 2 + 2 = 4' },
        { logger: mockLogger }
      );

      await checkMathWithMathJsTool.execute(
        { statement: '2 + 2 = 4' },
        { logger: mockLogger }
      );
    });

    // DESIRED BEHAVIOR:
    // 1. All tools use the parent session ID
    expect(capturedHeaders).toHaveLength(2);
    capturedHeaders.forEach(({ tool, sessionId, sessionPath }) => {
      expect(sessionId).toBe(parentSessionId);
      
      // 2. Tools extend the session path, not replace it
      expect(sessionPath).toMatch(/^\/jobs\/analysis/);
      
      // 3. Different tools have different sub-paths
      if (tool === 'extract') {
        expect(sessionPath).toContain('extract-math-expressions');
      } else {
        expect(sessionPath).toContain('check-math');
      }
    });
  });

  it('shows how to fix tools to respect parent session', async () => {
    // Example of how tools SHOULD check for existing session
    
    // WRONG: Tool creates its own session
    function wrongToolImplementation() {
      const toolSessionId = `tool-session-${Date.now()}`;
      return {
        sessionId: toolSessionId,
        sessionName: 'Tool Session'
      };
    }

    // RIGHT: Tool checks for existing session first
    function correctToolImplementation() {
      const existingSession = sessionContext.getSession();
      
      if (existingSession) {
        // Use parent session, just extend the path
        return sessionContext.withPath('/tools/my-tool');
      } else {
        // Only create new session if none exists
        return {
          sessionId: `tool-session-${Date.now()}`,
          sessionName: 'Tool Session',
          sessionPath: '/tools/my-tool'
        };
      }
    }

    // Test the implementations
    const wrongResult = wrongToolImplementation();
    expect(wrongResult.sessionId).toMatch(/^tool-session-/);

    // Set up parent session
    sessionContext.setSession({
      sessionId: 'parent-123',
      sessionName: 'Parent',
      sessionPath: '/parent'
    });

    const correctResult = correctToolImplementation();
    expect(correctResult?.sessionId).toBe('parent-123');
    expect(correctResult?.sessionPath).toBe('/parent/tools/my-tool');
  });
});