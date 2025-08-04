/**
 * Simplified test to demonstrate session context behavior
 */

import { sessionContext } from '../../helicone/sessionContext';

describe('Session Context Basic Behavior', () => {
  beforeEach(() => {
    sessionContext.setSession(undefined);
  });

  afterEach(() => {
    sessionContext.setSession(undefined);
  });

  it('shows that setSession replaces the entire context', () => {
    // Parent sets a session
    sessionContext.setSession({
      sessionId: 'parent-123',
      sessionName: 'Parent Session',
      sessionPath: '/parent'
    });

    expect(sessionContext.getSession()?.sessionId).toBe('parent-123');

    // Tool calls setSession with its own config (WRONG)
    sessionContext.setSession({
      sessionId: 'tool-456',
      sessionName: 'Tool Session',
      sessionPath: '/tool'
    });

    // Parent session is completely replaced
    expect(sessionContext.getSession()?.sessionId).toBe('tool-456');
    expect(sessionContext.getSession()?.sessionId).not.toBe('parent-123');
  });

  it('shows how withPath should work', () => {
    // Parent sets a session
    sessionContext.setSession({
      sessionId: 'parent-789',
      sessionName: 'Parent Session',
      sessionPath: '/parent',
      customProperties: {
        jobId: 'job-123'
      }
    });

    // Tool extends the path (RIGHT)
    const extended = sessionContext.withPath('/tools/my-tool');

    // Extended session should preserve parent ID
    expect(extended?.sessionId).toBe('parent-789');
    expect(extended?.sessionName).toBe('Parent Session');
    expect(extended?.sessionPath).toBe('/parent/tools/my-tool');
    expect(extended?.customProperties?.jobId).toBe('job-123');
  });

  it('shows how withProperties should work', () => {
    sessionContext.setSession({
      sessionId: 'parent-999',
      sessionName: 'Parent Session',
      sessionPath: '/parent',
      customProperties: {
        documentId: 'doc-456'
      }
    });

    // Tool adds properties
    const enhanced = sessionContext.withProperties({
      tool: 'spell-checker',
      operation: 'analyze'
    });

    // Should preserve original properties and add new ones
    expect(enhanced?.sessionId).toBe('parent-999');
    expect(enhanced?.customProperties?.documentId).toBe('doc-456');
    expect(enhanced?.customProperties?.tool).toBe('spell-checker');
    expect(enhanced?.customProperties?.operation).toBe('analyze');
  });
});