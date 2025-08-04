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

import type { HeliconeSessionConfig } from './sessions';

// Dynamic import to handle both Node.js and browser environments
let AsyncLocalStorage: typeof import('node:async_hooks').AsyncLocalStorage | undefined;

// Only load AsyncLocalStorage in Node.js environments
if (typeof window === 'undefined') {
  try {
    AsyncLocalStorage = require('node:async_hooks').AsyncLocalStorage;
  } catch {
    // Ignore errors in environments without async_hooks
  }
}

class SessionContextManager {
  // Use AsyncLocalStorage for proper async isolation (Node.js only)
  private asyncLocalStorage: any | undefined;
  
  // Fallback for environments without AsyncLocalStorage
  private fallbackSession: HeliconeSessionConfig | undefined;
  private sessionSetCount = 0;
  
  constructor() {
    // Only initialize AsyncLocalStorage if available
    if (AsyncLocalStorage) {
      this.asyncLocalStorage = new AsyncLocalStorage<HeliconeSessionConfig>();
    }
  }
  
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
    if (this.asyncLocalStorage) {
      const asyncSession = this.asyncLocalStorage.getStore();
      if (asyncSession) {
        return asyncSession;
      }
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
    if (this.asyncLocalStorage) {
      return this.asyncLocalStorage.run(session, fn);
    }
    
    // Fallback: temporarily set the session and run the function
    const previousSession = this.fallbackSession;
    this.fallbackSession = session;
    try {
      return await fn();
    } finally {
      this.fallbackSession = previousSession;
    }
  }
  
  /**
   * Create a scoped session with a modified path
   */
  withPath(pathSuffix: string): HeliconeSessionConfig | undefined {
    const currentSession = this.getSession();
    if (!currentSession) return undefined;
    
    return {
      ...currentSession,
      sessionPath: `${currentSession.sessionPath}${pathSuffix}`
    };
  }
  
  /**
   * Create a scoped session with additional properties
   */
  withProperties(properties: Record<string, string>): HeliconeSessionConfig | undefined {
    const currentSession = this.getSession();
    if (!currentSession) return undefined;
    
    return {
      ...currentSession,
      customProperties: {
        ...currentSession.customProperties,
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