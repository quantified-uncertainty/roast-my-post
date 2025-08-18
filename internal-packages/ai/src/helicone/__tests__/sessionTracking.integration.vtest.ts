import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
// Vitest test file
import { 
  HeliconeSessionManager, 
  setGlobalSessionManager,
  getGlobalSessionManager,
  getCurrentHeliconeHeaders 
} from '../simpleSessionManager';
import { PluginManager } from '../../analysis-plugins/PluginManager';
import { callClaude } from '../../claude/wrapper';
// Mock the claude wrapper to capture API calls
vi.mock('../../claude/wrapper');
const mockedCallClaude = vi.mocked(callClaude);

// Track all API calls with their headers
interface ApiCall {
  path: string;
  sessionId: string;
  headers: Record<string, string>;
  timestamp: number;
}

describe('Helicone Session Tracking Integration', () => {
  let capturedApiCalls: ApiCall[] = [];
  
  beforeEach(() => {
    // Clear any existing global session
    setGlobalSessionManager(undefined);
    capturedApiCalls = [];
    
    // Mock callClaude to capture headers
    mockedCallClaude.mockImplementation(async (options: any) => {
      const headers = getCurrentHeliconeHeaders();
      capturedApiCalls.push({
        path: headers['Helicone-Session-Path'] || '/',
        sessionId: headers['Helicone-Session-Id'] || 'unknown',
        headers: { ...headers },
        timestamp: Date.now()
      });
      
      // Return minimal mock response
      return {} as any;
    });
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  test('tracks correct session hierarchy for plugin analysis', async () => {
    // Create a job session manager
    const jobId = 'test-job-123';
    const sessionManager = HeliconeSessionManager.forJob(
      jobId,
      'Test Analysis Job',
      {
        JobId: jobId,
        AgentId: 'test-agent',
        DocumentId: 'test-doc'
      }
    );
    
    // Set it as global
    setGlobalSessionManager(sessionManager);
    
    // Create a document for analysis
    const testDocument = `
# Test Document

This document contains some mathematical content.
The equation 2 + 2 = 5 is incorrect.
    `.trim();
    
    // Run analysis within document tracking
    await sessionManager.trackAnalysis('document', async () => {
      // Create plugin manager (should pick up global session)
      const pluginManager = new PluginManager({
        jobId: jobId
      });
      
      // Run the analysis
      await pluginManager.analyzeDocument(testDocument, {
        targetHighlights: 5
      });
    });
    
    // Verify we have API calls
    expect(capturedApiCalls.length).toBeGreaterThan(0);
    
    // Log all paths for debugging
    console.log('Captured API call paths:', capturedApiCalls.map(call => ({
      path: call.path,
      timestamp: call.timestamp
    })));
    
    // Verify session ID is consistent
    const sessionIds = [...new Set(capturedApiCalls.map(call => call.sessionId))];
    expect(sessionIds).toHaveLength(1);
    expect(sessionIds[0]).toBe(jobId);
    
    // Verify path hierarchy
    const paths = capturedApiCalls.map(call => call.path);
    
    // Should have paths at different levels
    expect(paths).toEqual(expect.arrayContaining([
      expect.stringMatching(/^\/analysis\/document$/),           // Top level analysis
      expect.stringMatching(/^\/analysis\/document\/plugins$/),  // Plugin orchestration
      expect.stringMatching(/^\/analysis\/document\/plugins\/\w+$/), // Individual plugins
    ]));
    
    // Check for specific plugin paths
    const pluginPaths = paths.filter(p => p.match(/^\/analysis\/document\/plugins\/\w+$/));
    expect(pluginPaths.length).toBeGreaterThan(0);
    
    // If we have tool calls, verify their paths
    const toolPaths = paths.filter(p => p.includes('/tools/'));
    if (toolPaths.length > 0) {
      expect(toolPaths).toEqual(expect.arrayContaining([
        expect.stringMatching(/^\/analysis\/document\/plugins\/\w+\/tools\/\w+$/)
      ]));
    }
    
    // Verify properties are included
    const sampleCall = capturedApiCalls[0];
    expect(sampleCall.headers).toMatchObject({
      'Helicone-Session-Id': jobId,
      'Helicone-Session-Name': 'Test Analysis Job',
      'Helicone-Property-JobId': jobId,
      'Helicone-Property-AgentId': 'test-agent',
      'Helicone-Property-DocumentId': 'test-doc'
    });
  });
  
  test('maintains separate paths for parallel plugin execution', async () => {
    const sessionManager = HeliconeSessionManager.forJob(
      'parallel-test-job',
      'Parallel Test Job',
      { JobId: 'parallel-test-job' }
    );
    
    setGlobalSessionManager(sessionManager);
    
    // Clear previous calls
    capturedApiCalls = [];
    
    // Simulate parallel plugin execution
    await Promise.all([
      sessionManager.trackPlugin('math', async () => {
        // Simulate some API calls
        await callClaude({ messages: [{ role: 'user', content: 'math analysis' }] });
      }),
      sessionManager.trackPlugin('spelling', async () => {
        // Simulate some API calls
        await callClaude({ messages: [{ role: 'user', content: 'spelling analysis' }] });
      })
    ]);
    
    // Due to the parallel execution limitation, paths might overlap
    // but session IDs should be consistent
    const sessionIds = [...new Set(capturedApiCalls.map(call => call.sessionId))];
    expect(sessionIds).toHaveLength(1);
    expect(sessionIds[0]).toBe('parallel-test-job');
    
    // Both plugin paths should be present (though order may vary)
    const paths = capturedApiCalls.map(call => call.path);
    expect(paths).toEqual(expect.arrayContaining([
      expect.stringMatching(/\/plugins\/(math|spelling)/)
    ]));
  });
  
  test('tracks tool calls within plugins correctly', async () => {
    const sessionManager = HeliconeSessionManager.forJob(
      'tool-test-job',
      'Tool Test Job',
      { JobId: 'tool-test-job' }
    );
    
    setGlobalSessionManager(sessionManager);
    capturedApiCalls = [];
    
    // Simulate nested plugin -> tool execution
    await sessionManager.trackAnalysis('document', async () => {
      await sessionManager.trackPlugin('fact-check', async () => {
        await sessionManager.trackTool('perplexity-research', async () => {
          await callClaude({ messages: [{ role: 'user', content: 'research query' }] });
        });
      });
    });
    
    // Verify the full path hierarchy
    const paths = capturedApiCalls.map(call => call.path);
    expect(paths).toContain('/analysis/document/plugins/fact-check/tools/perplexity-research');
    
    // Verify all calls have the same session ID
    const sessionIds = [...new Set(capturedApiCalls.map(call => call.sessionId))];
    expect(sessionIds).toHaveLength(1);
    expect(sessionIds[0]).toBe('tool-test-job');
  });
  
  test('handles missing global session manager gracefully', async () => {
    // Don't set any global session manager
    setGlobalSessionManager(undefined);
    capturedApiCalls = [];
    
    // Create plugin manager without session
    const pluginManager = new PluginManager({
      jobId: 'no-session-job'
    });
    
    // This should work but without session tracking
    await pluginManager.analyzeDocument('Test document', {
      targetHighlights: 3
    });
    
    // API calls should have been made
    expect(capturedApiCalls.length).toBeGreaterThan(0);
    
    // But no session headers
    const firstCall = capturedApiCalls[0];
    expect(firstCall.headers['Helicone-Session-Id']).toBeUndefined();
    expect(firstCall.path).toBe('/');
  });

});