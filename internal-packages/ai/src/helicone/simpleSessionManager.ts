/**
 * Simplified Helicone Session Manager
 * 
 * A much simpler approach to Helicone session management that:
 * - Eliminates AsyncLocalStorage complexity
 * - Provides automatic header propagation
 * - Maintains hierarchical path tracking
 * - Is easy to test and debug
 * 
 * KNOWN LIMITATION: Parallel execution at the same level (e.g., multiple plugins
 * running concurrently) may have overlapping paths due to shared global state.
 * This is acceptable as the primary goal is session ID tracking for cost attribution.
 */

export interface SimpleSessionConfig {
  sessionId: string;
  sessionName: string;
  userId?: string;
  properties?: Record<string, string>;
}

export class HeliconeSessionManager {
  constructor(
    private config: SimpleSessionConfig,
    private currentPath: string = '/',
    private currentProperties: Record<string, string>[] = []
  ) {
    console.log(`[Helicone] new manager created for session: ${config.sessionId}, path: ${currentPath}`);
    // Validate session ID on construction
    if (!/^[\w-]+$/.test(config.sessionId)) {
      throw new Error(`Invalid session ID: ${config.sessionId}`);
    }
  }
  
  /**
   * Execute a function with an extended session path
   * Creates a new immutable context for thread safety
   */
  async withPath<T>(
    path: string,
    properties: Record<string, string> | undefined,
    fn: () => Promise<T>
  ): Promise<T> {
    console.log(`[Helicone] withPath called for session ${this.config.sessionId}. Extending path with: ${path}`);
    // Validate path format - must start with /, contain only alphanumeric/hyphen/underscore, no double slashes
    if (!/^\/[\w\-]+(\/[\w\-]+)*$/.test(path) && path !== '/') {
      throw new Error(`Invalid path format: ${path}`);
    }
    
    // Create new immutable path
    const newPath = this.currentPath === '/' ? path : this.currentPath + path;
    console.log(`[Helicone] withPath new path for session ${this.config.sessionId}: ${newPath}`);
    
    // Create new immutable properties array
    const newProperties = properties 
      ? [...this.currentProperties, properties]
      : this.currentProperties;
    
    // Create child manager with extended context
    const childManager = new HeliconeSessionManager(
      this.config,
      newPath,
      newProperties
    );
    
    // Save current global manager
    const previousManager = getGlobalSessionManager();
    
    try {
      // Set child as global for this operation
      setGlobalSessionManager(childManager);
      return await fn();
    } finally {
      // Restore previous global manager
      console.log(`[Helicone] withPath restoring previous manager for session ${this.config.sessionId}`);
      setGlobalSessionManager(previousManager);
    }
  }
  
  /**
   * Get current Helicone headers
   * Call this when making API requests
   */
  getHeaders(): Record<string, string> {
    console.log(`[Helicone] getHeaders called for session ${this.config.sessionId}, path: ${this.currentPath}`);
    const headers: Record<string, string> = {
      "Helicone-Session-Id": this.config.sessionId,
      "Helicone-Session-Name": this.sanitizeHeaderValue(this.config.sessionName),
      "Helicone-Session-Path": this.getCurrentPath(),
    };
    
    // Add user ID if provided
    if (this.config.userId) {
      headers["Helicone-User-Id"] = this.config.userId;
    }
    
    // Add base properties
    if (this.config.properties) {
      this.addProperties(headers, this.config.properties);
    }
    
    // Add stacked properties (last one wins for duplicates)
    for (const props of this.currentProperties) {
      this.addProperties(headers, props);
    }
    
    console.log(`[Helicone] getHeaders generated for session ${this.config.sessionId}:`, headers);
    return headers;
  }
  
  /**
   * Get the current full path
   */
  getCurrentPath(): string {
    return this.currentPath;
  }
  
  /**
   * Create a job session manager
   */
  static forJob(
    jobId: string,
    jobName: string,
    properties?: Record<string, string>
  ): HeliconeSessionManager {
    console.log(`[Helicone] forJob creating manager for job: ${jobId}, name: ${jobName}`);
    return new HeliconeSessionManager({
      sessionId: jobId,
      sessionName: jobName,
      properties
    });
  }
  
  /**
   * Helper methods for common patterns
   */
  async trackPlugin<T>(
    pluginName: string,
    fn: () => Promise<T>
  ): Promise<T> {
    console.log(`[Helicone] trackPlugin called for ${pluginName}`);
    // Use global manager if it exists and is different from 'this'
    // This allows nested calls to build on the current path
    const globalManager = getGlobalSessionManager();
    const managerToUse = (globalManager && globalManager !== this) ? globalManager : this;
    console.log(`[Helicone] trackPlugin using ${globalManager && globalManager !== this ? 'global' : 'local'} manager for session ${managerToUse.config.sessionId}`);
    return managerToUse.withPath(`/plugins/${pluginName}`, { plugin: pluginName }, fn);
  }
  
  async trackTool<T>(
    toolName: string,
    fn: () => Promise<T>
  ): Promise<T> {
    console.log(`[Helicone] trackTool called for ${toolName}`);
    // Use global manager if it exists and is different from 'this'
    // This allows nested calls to build on the current path
    const globalManager = getGlobalSessionManager();
    const managerToUse = (globalManager && globalManager !== this) ? globalManager : this;
    console.log(`[Helicone] trackTool using ${globalManager && globalManager !== this ? 'global' : 'local'} manager for session ${managerToUse.config.sessionId}`);
    return managerToUse.withPath(`/tools/${toolName}`, { tool: toolName }, fn);
  }
  
  async trackAnalysis<T>(
    analysisType: string,
    fn: () => Promise<T>
  ): Promise<T> {
    console.log(`[Helicone] trackAnalysis called for ${analysisType}`);
    // Use global manager if it exists and is different from 'this'
    // This allows nested calls to build on the current path
    const globalManager = getGlobalSessionManager();
    const managerToUse = (globalManager && globalManager !== this) ? globalManager : this;
    console.log(`[Helicone] trackAnalysis using ${globalManager && globalManager !== this ? 'global' : 'local'} manager for session ${managerToUse.config.sessionId}`);
    return managerToUse.withPath(`/analysis/${analysisType}`, { analysis: analysisType }, fn);
  }
  
  /**
   * Private helper methods
   */
  private addProperties(headers: Record<string, string>, properties: Record<string, string>) {
    for (const [key, value] of Object.entries(properties)) {
      // Validate property key
      if (!/^[\w-]+$/.test(key)) {
        console.warn(`Skipping invalid property key: ${key}`);
        continue;
      }
      
      headers[`Helicone-Property-${key}`] = this.sanitizeHeaderValue(value);
    }
  }
  
  private sanitizeHeaderValue(value: string): string {
    // Truncate if too long
    if (value.length > 200) {
      value = value.substring(0, 197) + '...';
    }
    
    // Replace problematic characters
    return value
      .replace(/[\u2018\u2019]/g, "'") // Smart quotes
      .replace(/[\u201C\u201D]/g, '"') // Smart double quotes
      .replace(/[\u2013\u2014]/g, '-') // Em/en dashes
      .replace(/[\r\n]/g, ' ') // Newlines
      .replace(/[^\x00-\x7F]/g, ''); // Non-ASCII
  }
}

/**
 * Global session manager instance
 * Set this at the start of job processing
 */
let globalSessionManager: HeliconeSessionManager | undefined;

export function setGlobalSessionManager(manager: HeliconeSessionManager | undefined) {
  if (manager) {
    console.log(`[Helicone] setGlobalSessionManager: SET to session ${manager.config.sessionId}`);
  } else {
    const oldSessionId = globalSessionManager?.config.sessionId;
    console.log(`[Helicone] setGlobalSessionManager: CLEARED (was session ${oldSessionId || 'none'})`);
  }
  globalSessionManager = manager;
}

export function getGlobalSessionManager(): HeliconeSessionManager | undefined {
  console.log(`[Helicone] getGlobalSessionManager called. Current session: ${globalSessionManager?.config.sessionId || 'none'}`);
  return globalSessionManager;
}

/**
 * Convenience function to get current headers
 * Returns empty object if no session is active
 */
export function getCurrentHeliconeHeaders(): Record<string, string> {
  console.log(`[Helicone] getCurrentHeliconeHeaders called for session: ${globalSessionManager?.config.sessionId || 'none'}`);
  return globalSessionManager?.getHeaders() || {};
}
