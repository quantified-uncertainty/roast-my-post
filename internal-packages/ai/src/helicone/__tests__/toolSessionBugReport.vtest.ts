import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
// jest globals are available by default
import { 
  HeliconeSessionManager, 
  setGlobalSessionManager,
  getCurrentHeliconeHeaders,
  getGlobalSessionManager 
} from '../simpleSessionManager';

describe('Tool Session Bug Report and Fix', () => {
  beforeEach(() => {
    setGlobalSessionManager(undefined);
  });

  test('PROBLEM: Tools create standalone sessions ignoring job context', () => {
    // Setup: Job creates a session manager
    const jobSessionId = 'job-evaluation-12345';
    const jobManager = HeliconeSessionManager.forJob(
      jobSessionId,
      'Document Analysis Job',
      {
        JobId: 'job-12345',
        DocumentId: 'doc-456',
        AgentId: 'agent-789'
      }
    );
    setGlobalSessionManager(jobManager);
    
    console.log('\n=== PROBLEM DEMONSTRATION ===');
    console.log('Job Session ID:', jobSessionId);
    console.log('Global headers available:', getCurrentHeliconeHeaders());
    
    // CURRENT BUGGY BEHAVIOR in tools (e.g., check-math-with-mathjs/index.ts:124)
    const buggyToolImplementation = () => {
      // Tools are creating their own session IDs
      const sessionId = `math-agentic-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      console.log('\nTool creates its own session ID:', sessionId);
      console.log('This IGNORES the job session!');
      return sessionId;
    };
    
    const toolSessionId = buggyToolImplementation();
    
    // The problem: different session IDs
    expect(toolSessionId).not.toBe(jobSessionId);
    console.log('\nPROBLEM: Tool session', toolSessionId, '!== Job session', jobSessionId);
  });

  test('SOLUTION: Tools should use global session manager', async () => {
    // Setup: Same job context
    const jobSessionId = 'job-evaluation-12345';
    const jobManager = HeliconeSessionManager.forJob(
      jobSessionId,
      'Document Analysis Job',
      { JobId: 'job-12345' }
    );
    setGlobalSessionManager(jobManager);
    
    console.log('\n=== SOLUTION DEMONSTRATION ===');
    
    // CORRECT IMPLEMENTATION
    const correctToolImplementation = async (toolName: string) => {
      // Check for global session manager first
      const globalManager = getGlobalSessionManager();
      
      if (globalManager) {
        console.log(`\nTool '${toolName}' found global session manager`);
        
        // Use the global manager's tracking methods
        await globalManager.trackTool(toolName, async () => {
          const headers = getCurrentHeliconeHeaders();
          console.log(`Tool '${toolName}' headers:`, {
            sessionId: headers['Helicone-Session-Id'],
            path: headers['Helicone-Session-Path'],
            tool: headers['Helicone-Property-tool']
          });
        });
        
        return getCurrentHeliconeHeaders()['Helicone-Session-Id'];
      } else {
        // Only create standalone session if no global context
        const standaloneId = `${toolName}-standalone-${Date.now()}`;
        console.log(`\nNo global session, tool '${toolName}' creates standalone:`, standaloneId);
        return standaloneId;
      }
    };
    
    // All tools use the same session
    const mathToolSession = await correctToolImplementation('check-math');
    const spellToolSession = await correctToolImplementation('check-spelling'); 
    
    expect(mathToolSession).toBe(jobSessionId);
    expect(spellToolSession).toBe(jobSessionId);
    console.log('\nSOLUTION: All tools use job session:', jobSessionId);
  });

  test('IMPLEMENTATION GUIDE: How to fix tools', () => {
    console.log('\n=== IMPLEMENTATION GUIDE ===\n');
    
    console.log('BEFORE (buggy):');
    console.log(`
    // In check-math-with-mathjs/index.ts:124
    const sessionId = \`math-agentic-\${Date.now()}-\${Math.random().toString(36).substring(2, 9)}\`;
    `);
    
    console.log('\nAFTER (fixed):');
    console.log(`
    // Option 1: Use global session directly
    const globalManager = getGlobalSessionManager();
    if (globalManager) {
      // Session tracking is handled globally
      // No need to create sessionId
      await globalManager.trackTool('check-math', async () => {
        // Tool logic here
      });
    }
    
    // Option 2: Get session ID if needed for logging
    const sessionId = getCurrentHeliconeHeaders()['Helicone-Session-Id'] || 
                     \`math-standalone-\${Date.now()}\`;
    `);
    
    console.log('\nFILES TO UPDATE:');
    const toolsToFix = [
      'check-math-with-mathjs/index.ts:124',
      'check-math-hybrid/index.ts (similar pattern)',
      'spell-checker/index.ts (if creating sessions)',
      'fact-checker/index.ts (if creating sessions)',
      'forecaster/index.ts (if creating sessions)'
    ];
    
    toolsToFix.forEach(file => console.log(`  - ${file}`));
    
    console.log('\nKEY CHANGES:');
    console.log('1. Remove standalone session ID generation');
    console.log('2. Use getGlobalSessionManager() to check for job context');
    console.log('3. Use globalManager.trackTool() for proper hierarchy');
    console.log('4. Headers are automatically included in API calls');
  });

  test('VERIFICATION: Correct session hierarchy', async () => {
    const jobManager = HeliconeSessionManager.forJob(
      'job-999',
      'Test Job',
      { JobId: 'job-999' }
    );
    setGlobalSessionManager(jobManager);
    
    const capturedPaths: string[] = [];
    
    // Simulate the correct flow
    await jobManager.trackAnalysis('document', async () => {
      capturedPaths.push(getCurrentHeliconeHeaders()['Helicone-Session-Path']);
      
      await jobManager.trackPlugin('math', async () => {
        capturedPaths.push(getCurrentHeliconeHeaders()['Helicone-Session-Path']);
        
        await jobManager.trackTool('check-math', async () => {
          capturedPaths.push(getCurrentHeliconeHeaders()['Helicone-Session-Path']);
        });
      });
    });
    
    console.log('\n=== CORRECT HIERARCHY ===');
    console.log('Session paths:', capturedPaths);
    
    expect(capturedPaths).toEqual([
      '/analysis/document',
      '/analysis/document/plugins/math',
      '/analysis/document/plugins/math/tools/check-math'
    ]);
  });
});