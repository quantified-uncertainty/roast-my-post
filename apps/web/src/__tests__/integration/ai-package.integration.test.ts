/**
 * Integration test to verify @roast/ai package works correctly
 * when imported and used in the web application.
 */

import { 
  callClaude,
  sessionContext,
  checkSpellingGrammarTool,
  PluginManager,
  MathPlugin,
  type Agent,
  type Document
} from '@roast/ai';

describe('@roast/ai Package Integration in Web App', () => {
  it('should import and use AI package exports', () => {
    // Verify core functions are available
    expect(callClaude).toBeDefined();
    expect(typeof callClaude).toBe('function');
    
    // Verify sessionContext is available
    expect(sessionContext).toBeDefined();
    expect(sessionContext.setSession).toBeDefined();
    
    // Verify tools are available
    expect(checkSpellingGrammarTool).toBeDefined();
    expect(checkSpellingGrammarTool.config.name).toBe('check-spelling-grammar');
    
    // Verify plugin system is available
    expect(PluginManager).toBeDefined();
    expect(MathPlugin).toBeDefined();
  });

  it('should use AI package types', () => {
    // This verifies TypeScript compilation with the types
    const testAgent: Agent = {
      id: 'test-agent',
      name: 'Test Agent',
      version: '1.0',
      description: 'Integration test agent',
      providesGrades: false,
    };

    const testDoc: Document = {
      id: 'test-doc',
      title: 'Test Document',
      url: 'https://example.com/test',
      uploadedAt: new Date().toISOString(),
    };

    expect(testAgent.name).toBe('Test Agent');
    expect(testDoc.title).toBe('Test Document');
  });

  it('should access tool configurations', () => {
    const tools = [
      checkSpellingGrammarTool,
    ];

    tools.forEach(tool => {
      expect(tool.config).toBeDefined();
      expect(tool.config.name).toBeTruthy();
      expect(tool.config).toBeDefined();
      expect(tool.config.name).toBeTruthy();
      expect(tool.config.path).toBeTruthy();
    });
  });

  it('should create plugin instances', () => {
    const pluginManager = new PluginManager();
    const mathPlugin = new MathPlugin();

    expect(() => {
      pluginManager.registerPlugin(mathPlugin);
    }).not.toThrow();

    // Verify the plugin manager has expected methods
    expect(pluginManager.processDocument).toBeDefined();
    expect(pluginManager.analyzeSimple).toBeDefined();
  });

  describe('Session Context Usage', () => {
    it('should set and get tool context', () => {
      const testToolName = 'test-tool';
      const testSessionId = 'test-session-123';

      sessionContext.setSession({ sessionId: testSessionId, sessionPath: '/', sessionName: testToolName });
      sessionContext.setSessionId(testSessionId);

      const session = sessionContext.getSession();
      expect(session?.sessionId).toBe(testSessionId);
      expect(sessionContext.getSessionId()).toBe(testSessionId);

      // Clean up
      sessionContext.clear();
    });
  });
});