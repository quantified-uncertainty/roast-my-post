/**
 * Global session context for Helicone sessions
 * 
 * This provides a way to pass session configuration through to nested
 * components like plugins and tools without modifying all interfaces.
 */

import type { HeliconeSessionConfig } from './sessions';

class SessionContextManager {
  private currentSession: HeliconeSessionConfig | undefined;
  
  /**
   * Set the current session for LLM calls
   */
  setSession(session: HeliconeSessionConfig | undefined) {
    this.currentSession = session;
  }
  
  /**
   * Get the current session
   */
  getSession(): HeliconeSessionConfig | undefined {
    return this.currentSession;
  }
  
  /**
   * Create a scoped session with a modified path
   */
  withPath(pathSuffix: string): HeliconeSessionConfig | undefined {
    if (!this.currentSession) return undefined;
    
    return {
      ...this.currentSession,
      sessionPath: `${this.currentSession.sessionPath}${pathSuffix}`
    };
  }
  
  /**
   * Create a scoped session with additional properties
   */
  withProperties(properties: Record<string, string>): HeliconeSessionConfig | undefined {
    if (!this.currentSession) return undefined;
    
    return {
      ...this.currentSession,
      customProperties: {
        ...this.currentSession.customProperties,
        ...properties
      }
    };
  }
  
  /**
   * Clear the current session
   */
  clear() {
    this.currentSession = undefined;
  }
}

// Global singleton instance
export const sessionContext = new SessionContextManager();