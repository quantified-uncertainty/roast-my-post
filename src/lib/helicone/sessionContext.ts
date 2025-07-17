/**
 * Global session context for Helicone sessions
 * 
 * This provides a way to pass session configuration through to nested
 * components like plugins and tools without modifying all interfaces.
 * 
 * IMPORTANT: Thread Safety Limitation
 * -----------------------------------
 * This implementation uses a global singleton pattern which is NOT thread-safe
 * in concurrent environments. Multiple jobs running simultaneously could 
 * interfere with each other's session state.
 * 
 * Current Mitigation:
 * - Jobs are processed sequentially in the current implementation
 * - The PluginManager sets and clears the session context for each plugin run
 * 
 * Future Improvements:
 * - Consider using AsyncLocalStorage for true async context isolation
 * - Or refactor to pass session config through all function parameters
 * - Or use a job-scoped context manager instead of global singleton
 * 
 * @see https://nodejs.org/api/async_context.html#class-asynclocalstorage
 */

import type { HeliconeSessionConfig } from './sessions';

class SessionContextManager {
  private currentSession: HeliconeSessionConfig | undefined;
  private sessionSetCount = 0;
  
  /**
   * Set the current session for LLM calls
   * Includes basic detection of potential concurrent usage
   */
  setSession(session: HeliconeSessionConfig | undefined) {
    // Detect potential concurrent usage
    if (this.currentSession && session && this.currentSession.sessionId !== session.sessionId) {
      console.warn(
        `⚠️ Potential concurrent session usage detected. ` +
        `Previous session ${this.currentSession.sessionId} being replaced by ${session.sessionId}. ` +
        `Consider using AsyncLocalStorage for proper async context isolation.`
      );
    }
    
    this.currentSession = session;
    this.sessionSetCount++;
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