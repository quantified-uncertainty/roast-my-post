import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
// jest globals are available by default
import { 
  HeliconeSessionManager, 
  setGlobalSessionManager,
  getCurrentHeliconeHeaders,
  getGlobalSessionManager 
} from '../simpleSessionManager';

describe('Session Hierarchy Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setGlobalSessionManager(undefined);
  });

  test('reproduces the issue: tools creating standalone sessions', async () => {
    // This test reproduces what's happening in the logs:
    // Each tool creates its own session ID like "math-agentic-1754315940404-mzjh6bv"
    
    const capturedHeaders: Array<{context: string, headers: Record<string, string>}> = [];
    
    // Simulate what happens when a tool is called without proper session propagation
    const simulateStandaloneToolCall = async (toolName: string) => {
      // This simulates a tool creating its own session (the bug)
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(7);
      const standaloneSessionId = `${toolName}-agentic-${timestamp}-${randomId}`;
      
      // Tool creates its own manager instead of using global
      const toolManager = new HeliconeSessionManager({
        sessionId: standaloneSessionId,
        sessionName: `${toolName} tool execution`
      });
      
      // Temporarily set as global (wrong behavior)
      setGlobalSessionManager(toolManager);
      
      const headers = getCurrentHeliconeHeaders();
      capturedHeaders.push({ context: toolName, headers });
      
      return headers['Helicone-Session-Id'];
    };
    
    // Simulate multiple tool calls
    const mathSessionId = await simulateStandaloneToolCall('math');
    const spellSessionId = await simulateStandaloneToolCall('spell');
    const factSessionId = await simulateStandaloneToolCall('fact');
    
    // This is the problem: each tool has a different session ID
    expect(mathSessionId).not.toBe(spellSessionId);
    expect(spellSessionId).not.toBe(factSessionId);
    expect(mathSessionId).toMatch(/^math-agentic-\d+-\w+$/);
    expect(spellSessionId).toMatch(/^spell-agentic-\d+-\w+$/);
    
    console.log('Captured standalone sessions (the bug):', {
      math: mathSessionId,
      spell: spellSessionId,
      fact: factSessionId
    });
  });

  test('correct behavior: tools inherit from job session', async () => {
    // Set up job session manager globally
    const jobSessionId = 'job-evaluation-123';
    const jobManager = HeliconeSessionManager.forJob(
      jobSessionId,
      'Document Analysis Job',
      {
        JobId: 'job-123',
        DocumentId: 'doc-456',
        AgentId: 'agent-789'
      }
    );
    
    setGlobalSessionManager(jobManager);
    
    const capturedHeaders: Array<{context: string, headers: Record<string, string>}> = [];
    
    // Simulate plugin execution
    await jobManager.trackPlugin('math', async () => {
      capturedHeaders.push({ 
        context: 'math-plugin', 
        headers: { ...getCurrentHeliconeHeaders() } 
      });
      
      // Simulate tool execution within plugin
      await jobManager.trackTool('check-math', async () => {
        capturedHeaders.push({ 
          context: 'check-math-tool', 
          headers: { ...getCurrentHeliconeHeaders() } 
        });
        
        // Simulate tool making API call - headers would be included automatically
        const toolHeaders = getCurrentHeliconeHeaders();
        console.log('Tool headers would be sent:', toolHeaders);
      });
    });
    
    // All contexts should have the same session ID
    const sessionIds = capturedHeaders.map(c => c.headers['Helicone-Session-Id']);
    expect(new Set(sessionIds).size).toBe(1);
    expect(sessionIds[0]).toBe(jobSessionId);
    
    // Verify path hierarchy
    expect(capturedHeaders[0].headers['Helicone-Session-Path']).toBe('/plugins/math');
    expect(capturedHeaders[1].headers['Helicone-Session-Path']).toBe('/plugins/math/tools/check-math');
    
    console.log('Correct session hierarchy:', capturedHeaders);
  });

  test('identifies the fix: tools should use global session manager', async () => {
    // Set up job session
    const jobManager = HeliconeSessionManager.forJob(
      'job-456',
      'Test Job',
      { JobId: 'job-456' }
    );
    setGlobalSessionManager(jobManager);
    
    // The fix: tools should check for global session manager first
    const executeToolWithProperSession = async (toolName: string) => {
      const globalManager = getCurrentHeliconeHeaders();
      
      // If there's a global session, use it
      if (globalManager['Helicone-Session-Id']) {
        console.log(`Tool ${toolName} using global session: ${globalManager['Helicone-Session-Id']}`);
        return globalManager['Helicone-Session-Id'];
      }
      
      // Only create standalone session if no global exists
      const standaloneId = `${toolName}-standalone-${Date.now()}`;
      console.log(`Tool ${toolName} creating standalone session: ${standaloneId}`);
      return standaloneId;
    };
    
    // All tools should use the job session
    const mathSession = await executeToolWithProperSession('math');
    const spellSession = await executeToolWithProperSession('spell');
    
    expect(mathSession).toBe('job-456');
    expect(spellSession).toBe('job-456');
  });

  test('ChunkRouter should maintain session hierarchy', async () => {
    // This tests the specific case from ChunkRouter
    const jobManager = HeliconeSessionManager.forJob(
      'job-789',
      'Chunk Routing Job',
      { JobId: 'job-789' }
    );
    setGlobalSessionManager(jobManager);
    
    // Simulate ChunkRouter calling Claude
    await jobManager.withPath('/chunk-routing', undefined, async () => {
      const headers = getCurrentHeliconeHeaders();
      expect(headers['Helicone-Session-Id']).toBe('job-789');
      expect(headers['Helicone-Session-Path']).toBe('/chunk-routing');
      
      // Simulate ChunkRouter making API call
      const routerHeaders = getCurrentHeliconeHeaders();
      console.log('ChunkRouter headers would be sent:', routerHeaders);
    });
    
    // Headers would have been included automatically in the API call
  });

  test('BUG REPRODUCTION: tools create their own session IDs', async () => {
    // This test reproduces the actual bug found in check-math-with-mathjs/index.ts
    // Line 124: const sessionId = `math-agentic-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Set up job session manager globally
    const jobSessionId = 'job-123';
    const jobManager = HeliconeSessionManager.forJob(
      jobSessionId,
      'Math Check Job',
      { JobId: 'job-123' }
    );
    setGlobalSessionManager(jobManager);
    
    // What tools SHOULD do: check global session first
    const correctToolBehavior = () => {
      const globalManager = getGlobalSessionManager();
      if (globalManager) {
        // Use global session
        return globalManager.getHeaders()['Helicone-Session-Id'];
      }
      // Only create new session if no global exists
      return `tool-standalone-${Date.now()}`;
    };
    
    // What tools ACTUALLY do: always create their own session
    const buggyToolBehavior = () => {
      // This is the bug - ignoring global session manager
      const sessionId = `math-agentic-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      return sessionId;
    };
    
    const correctSessionId = correctToolBehavior();
    const buggySessionId = buggyToolBehavior();
    
    // The bug: different session IDs
    expect(correctSessionId).toBe(jobSessionId);
    expect(buggySessionId).not.toBe(jobSessionId);
    expect(buggySessionId).toMatch(/^math-agentic-\d+-\w+$/);
    
    console.log('Bug reproduction:', {
      jobSessionId,
      correctToolSessionId: correctSessionId,
      buggyToolSessionId: buggySessionId,
      problem: 'Tools create their own sessions instead of using global'
    });
  });

  test('plugin analyze method should maintain session', async () => {
    // Test the specific case from ForecastPlugin
    const jobManager = HeliconeSessionManager.forJob(
      'job-forecast-123',
      'Forecast Analysis',
      { JobId: 'job-forecast-123' }
    );
    setGlobalSessionManager(jobManager);
    
    const headerCaptures: Record<string, string>[] = [];
    
    // Simulate forecast plugin flow
    await jobManager.trackPlugin('forecast', async () => {
      headerCaptures.push({ ...getCurrentHeliconeHeaders() });
      
      // Extract forecasting claims (tool call)
      await jobManager.trackTool('extract-forecasts', async () => {
        headerCaptures.push({ ...getCurrentHeliconeHeaders() });
      });
      
      // Generate forecast (another tool call)
      await jobManager.trackTool('generate-forecast', async () => {
        headerCaptures.push({ ...getCurrentHeliconeHeaders() });
      });
    });
    
    // All should have same session ID
    const allSessionIds = headerCaptures.map(h => h['Helicone-Session-Id']);
    expect(new Set(allSessionIds).size).toBe(1);
    expect(allSessionIds[0]).toBe('job-forecast-123');
    
    // Verify paths
    expect(headerCaptures[0]['Helicone-Session-Path']).toBe('/plugins/forecast');
    expect(headerCaptures[1]['Helicone-Session-Path']).toBe('/plugins/forecast/tools/extract-forecasts');
    expect(headerCaptures[2]['Helicone-Session-Path']).toBe('/plugins/forecast/tools/generate-forecast');
  });
});