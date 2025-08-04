/**
 * Documentation test showing how to fix the session override issue
 * 
 * The core problem: Tools are calling sessionContext.setSession() which
 * REPLACES the entire session instead of extending it.
 */

import { sessionContext } from '../../helicone/sessionContext';
import type { HeliconeSessionConfig } from '../../helicone/sessions';

describe('Session Override Fix Documentation', () => {
  beforeEach(() => {
    sessionContext.setSession(undefined);
  });

  it('shows the PROBLEM: setSession replaces the entire context', () => {
    // Plugin sets up its session
    const pluginSession: HeliconeSessionConfig = {
      sessionId: 'plugin-job-123',
      sessionName: 'Plugin Analysis Job',
      sessionPath: '/plugins/math',
      customProperties: {
        documentId: 'doc-456',
        agentId: 'agent-789'
      }
    };
    
    sessionContext.setSession(pluginSession);
    
    // Verify plugin session is set
    expect(sessionContext.getSession()).toEqual(pluginSession);
    
    // PROBLEM: Tool calls setSession with its own config
    const toolSession: HeliconeSessionConfig = {
      sessionId: 'tool-session-999',  // Different ID!
      sessionName: 'Tool Session',
      sessionPath: '/tools/my-tool'
      // Note: customProperties are lost!
    };
    
    sessionContext.setSession(toolSession);
    
    // The plugin session is GONE!
    const currentSession = sessionContext.getSession();
    expect(currentSession?.sessionId).toBe('tool-session-999'); // Wrong!
    expect(currentSession?.customProperties).toBeUndefined(); // Lost metadata!
  });

  it('shows the CORRECT approach: use withPath and withProperties', () => {
    // Plugin sets up its session
    const pluginSession: HeliconeSessionConfig = {
      sessionId: 'plugin-job-123',
      sessionName: 'Plugin Analysis Job',
      sessionPath: '/plugins/math',
      customProperties: {
        documentId: 'doc-456',
        agentId: 'agent-789'
      }
    };
    
    sessionContext.setSession(pluginSession);
    
    // CORRECT: Tool extends the existing session
    const existingSession = sessionContext.getSession();
    
    if (existingSession) {
      // Extend the path
      const toolSession = sessionContext.withPath('/tools/check-math');
      
      // Add tool-specific properties if needed
      const enhancedSession = sessionContext.withProperties({
        tool: 'check-math',
        operation: 'verify'
      });
      
      // Session ID is preserved!
      expect(toolSession?.sessionId).toBe('plugin-job-123');
      expect(toolSession?.sessionPath).toBe('/plugins/math/tools/check-math');
      
      // Original properties are preserved!
      expect(enhancedSession?.customProperties?.documentId).toBe('doc-456');
      expect(enhancedSession?.customProperties?.tool).toBe('check-math');
    }
  });

  it('shows the PATTERN tools should follow', () => {
    // This is the pattern ALL tools should use:
    
    function correctToolPattern(toolName: string): HeliconeSessionConfig | undefined {
      // 1. Check for existing session
      const existingSession = sessionContext.getSession();
      
      if (existingSession) {
        // 2. EXTEND the existing session, don't replace it
        const extendedSession = sessionContext.withPath(`/tools/${toolName}`);
        
        // 3. Add tool-specific properties if needed
        if (extendedSession) {
          return sessionContext.withProperties({
            tool: toolName,
            timestamp: new Date().toISOString()
          });
        }
        
        return extendedSession;
      } else {
        // 4. Only create new session if none exists
        return {
          sessionId: `${toolName}-${Date.now()}`,
          sessionName: `${toolName} standalone execution`,
          sessionPath: `/tools/${toolName}`
        };
      }
    }

    // Test with plugin session
    sessionContext.setSession({
      sessionId: 'main-job-999',
      sessionName: 'Main Job',
      sessionPath: '/jobs'
    });

    const toolSession = correctToolPattern('spell-checker');
    
    // Verify correct behavior
    expect(toolSession?.sessionId).toBe('main-job-999'); // Preserved!
    expect(toolSession?.sessionPath).toBe('/jobs/tools/spell-checker'); // Extended!
    expect(toolSession?.customProperties?.tool).toBe('spell-checker'); // Added!
  });

  it('documents the specific fix for check-math-with-mathjs tool', () => {
    // The problematic code in the tool:
    const problemCode = `
      if (existingSession) {
        sessionId = existingSession.sessionId;
        context.logger.info(\`Using existing session: \${sessionId}\`);
      } else {
        sessionId = \`math-agentic-\${Date.now()}-\${Math.random().toString(36).substring(2, 9)}\`;
        const newSession = {
          sessionId,
          sessionName: \`Math Agentic Tool\`,
          sessionPath: '/tools/check-math-with-mathjs'
        };
        
        // PROBLEM: This replaces the entire session!
        sessionContext.setSession(newSession);
      }
    `;

    // The fixed code should be:
    const fixedCode = `
      // Get or extend existing session
      let sessionConfig: HeliconeSessionConfig | undefined;
      
      const existingSession = sessionContext.getSession();
      if (existingSession) {
        // EXTEND the existing session path
        sessionConfig = sessionContext.withPath('/tools/check-math-with-mathjs');
        
        // Add tool-specific properties
        if (sessionConfig) {
          sessionConfig = sessionContext.withProperties({
            tool: 'check-math-with-mathjs',
            operation: 'verify-calculation'
          });
        }
        
        context.logger.info(\`Using existing session: \${sessionConfig?.sessionId}\`);
      } else {
        // Only create new session if running standalone
        sessionConfig = {
          sessionId: \`math-agentic-\${Date.now()}-\${Math.random().toString(36).substring(2, 9)}\`,
          sessionName: 'Math Agentic Tool (Standalone)',
          sessionPath: '/tools/check-math-with-mathjs'
        };
        
        // DON'T call setSession here - just use the config for headers
        context.logger.info(\`Created standalone session: \${sessionConfig.sessionId}\`);
      }
      
      // Use the session config for Helicone headers
      const heliconeHeaders = sessionConfig ? createHeliconeHeaders(sessionConfig) : undefined;
    `;

    // This fix ensures:
    // 1. Parent session ID is preserved
    // 2. Session path is properly nested
    // 3. Custom properties are maintained
    // 4. No global session state is modified
    
    expect(fixedCode).toContain('withPath');
    expect(fixedCode).toContain('withProperties');
    expect(fixedCode).not.toContain('setSession(newSession)');
  });
});