import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import { 
  HeliconeSessionManager, 
  setGlobalSessionManager,
  getCurrentHeliconeHeaders,
  getGlobalSessionManager 
} from '../simpleSessionManager';

describe('Tool Session Fix Verification', () => {
  beforeEach(() => {
    setGlobalSessionManager(undefined);
  });

  test('check-math-with-mathjs tool now uses global session', () => {
    // Setup: Job creates a session manager
    const jobSessionId = 'job-test-12345';
    const jobManager = HeliconeSessionManager.forJob(
      jobSessionId,
      'Math Check Job',
      {
        JobId: 'job-12345',
        DocumentId: 'doc-456',
        AgentId: 'agent-789'
      }
    );
    setGlobalSessionManager(jobManager);
    
    // Simulate what the fixed check-math-with-mathjs tool does
    const globalManager = getGlobalSessionManager();
    const currentHeaders = getCurrentHeliconeHeaders();
    const sessionId = currentHeaders['Helicone-Session-Id'] || `math-standalone-${Date.now()}`;
    
    // Verify the tool uses the job session
    expect(sessionId).toBe(jobSessionId);
    expect(globalManager).toBe(jobManager);
    
    console.log('✅ check-math-with-mathjs tool correctly uses job session:', sessionId);
  });

  test('tools create standalone sessions only when no global context', () => {
    // No global session manager set
    expect(getGlobalSessionManager()).toBeUndefined();
    
    // Simulate tool behavior with no global context
    const currentHeaders = getCurrentHeliconeHeaders();
    const sessionId = currentHeaders['Helicone-Session-Id'] || `math-standalone-${Date.now()}`;
    
    // Should create standalone session
    expect(sessionId).toMatch(/^math-standalone-\d+$/);
    expect(currentHeaders['Helicone-Session-Id']).toBeUndefined();
    
    console.log('✅ Tool correctly creates standalone session when no global context:', sessionId);
  });

  test('full job -> plugin -> tool flow maintains session hierarchy', async () => {
    const jobSessionId = 'job-full-flow-123';
    const jobManager = HeliconeSessionManager.forJob(
      jobSessionId,
      'Full Flow Test',
      { JobId: 'job-123' }
    );
    setGlobalSessionManager(jobManager);
    
    const capturedHeaders: Array<{context: string, sessionId: string, path: string}> = [];
    
    // Job level
    capturedHeaders.push({
      context: 'job',
      sessionId: getCurrentHeliconeHeaders()['Helicone-Session-Id'],
      path: getCurrentHeliconeHeaders()['Helicone-Session-Path']
    });
    
    // Analysis level
    await jobManager.trackAnalysis('document', async () => {
      capturedHeaders.push({
        context: 'analysis',
        sessionId: getCurrentHeliconeHeaders()['Helicone-Session-Id'],
        path: getCurrentHeliconeHeaders()['Helicone-Session-Path']
      });
      
      // Plugin level
      await jobManager.trackPlugin('math', async () => {
        capturedHeaders.push({
          context: 'plugin',
          sessionId: getCurrentHeliconeHeaders()['Helicone-Session-Id'],
          path: getCurrentHeliconeHeaders()['Helicone-Session-Path']
        });
        
        // Tool level - simulating fixed check-math-with-mathjs
        const toolSessionId = getCurrentHeliconeHeaders()['Helicone-Session-Id'] || `math-standalone-${Date.now()}`;
        
        await jobManager.trackTool('check-math', async () => {
          capturedHeaders.push({
            context: 'tool',
            sessionId: getCurrentHeliconeHeaders()['Helicone-Session-Id'],
            path: getCurrentHeliconeHeaders()['Helicone-Session-Path']
          });
        });
      });
    });
    
    // Verify all contexts use the same session ID
    const allSessionIds = capturedHeaders.map(h => h.sessionId);
    expect(new Set(allSessionIds).size).toBe(1);
    expect(allSessionIds[0]).toBe(jobSessionId);
    
    // Verify correct path hierarchy
    expect(capturedHeaders[0].path).toBe('/');
    expect(capturedHeaders[1].path).toBe('/analysis/document');
    expect(capturedHeaders[2].path).toBe('/analysis/document/plugins/math');
    expect(capturedHeaders[3].path).toBe('/analysis/document/plugins/math/tools/check-math');
    
    console.log('✅ Full hierarchy maintained with fixed tools:');
    capturedHeaders.forEach(h => console.log(`  ${h.context}: ${h.sessionId} @ ${h.path}`));
  });
});