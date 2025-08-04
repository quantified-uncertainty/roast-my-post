/**
 * Global session context for Helicone sessions
 * 
 * This provides a way to pass session configuration through to nested
 * components like plugins and tools without modifying all interfaces.
 * 
 * Uses AsyncLocalStorage for proper async context isolation to prevent
 * concurrent job processors from interfering with each other's sessions.
 * 
 * @see https://nodejs.org/api/async_context.html#class-asynclocalstorage
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import type { HeliconeSessionConfig } from './sessions';

class SessionContextManager {
  // Use AsyncLocalStorage for proper async isolation
  private asyncLocalStorage = new AsyncLocalStorage<HeliconeSessionConfig>();
  
  // Fallback for environments without AsyncLocalStorage
  private fallbackSession: HeliconeSessionConfig | undefined;
  private sessionSetCount = 0;
  
  /**
   * Set the current session for LLM calls
   * This is now safe for concurrent usage thanks to AsyncLocalStorage
   */
  setSession(session: HeliconeSessionConfig | undefined) {
    // For backward compatibility, also set the fallback
    this.fallbackSession = session;
    this.sessionSetCount++;
  }
  
  /**
   * Get the current session
   * First checks AsyncLocalStorage, then falls back to the global session
   */
  getSession(): HeliconeSessionConfig | undefined {
    // Try to get from AsyncLocalStorage first
    const asyncSession = this.asyncLocalStorage.getStore();
    if (asyncSession) {
      return asyncSession;
    }
    
    // Fall back to the global session for backward compatibility
    return this.fallbackSession;
  }
  
  /**
   * Run a function with a specific session context
   * This ensures proper isolation for concurrent operations
   */
  async runWithSession<T>(
    session: HeliconeSessionConfig,
    fn: () => T | Promise<T>
  ): Promise<T> {
    return this.asyncLocalStorage.run(session, fn);
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
    this.fallbackSession = undefined;
    // Note: AsyncLocalStorage contexts are automatically cleaned up
    // when the async context ends, so we don't need to clear them manually
  }
}

// Global singleton instance
export const sessionContext = new SessionContextManager();