/**
 * Simplified Helicone Session Manager
 * 
 * A much simpler approach to Helicone session management that:
 * - Eliminates AsyncLocalStorage complexity
 * - Provides automatic header propagation
 * - Maintains hierarchical path tracking
 * - Is easy to test and debug
 */

export interface SimpleSessionConfig {
  sessionId: string;
  sessionName: string;
  userId?: string;
  properties?: Record<string, string>;
}

export class HeliconeSessionManager {
  private pathStack: string[] = [];
  private propertyStack: Record<string, string>[] = [];
  
  constructor(private config: SimpleSessionConfig) {
    // Validate session ID on construction
    if (!/^[\w-]+$/.test(config.sessionId)) {
      throw new Error(`Invalid session ID: ${config.sessionId}`);
    }
  }
  
  /**
   * Execute a function with an extended session path
   * Automatically manages the path stack
   */
  async withPath<T>(
    path: string,
    properties: Record<string, string> | undefined,
    fn: () => Promise<T>
  ): Promise<T> {
    // Validate path format
    if (!/^\/[\w\/\-]*$/.test(path)) {
      throw new Error(`Invalid path format: ${path}`);
    }
    
    this.pathStack.push(path);
    if (properties) {
      this.propertyStack.push(properties);
    }
    
    try {
      return await fn();
    } finally {
      this.pathStack.pop();
      if (properties) {
        this.propertyStack.pop();
      }
    }
  }
  
  /**
   * Get current Helicone headers
   * Call this when making API requests
   */
  getHeaders(): Record<string, string> {
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
    for (const props of this.propertyStack) {
      this.addProperties(headers, props);
    }
    
    return headers;
  }
  
  /**
   * Get the current full path
   */
  getCurrentPath(): string {
    return this.pathStack.join('') || '/';
  }
  
  /**
   * Create a job session manager
   */
  static forJob(
    jobId: string,
    jobName: string,
    properties?: Record<string, string>
  ): HeliconeSessionManager {
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
    return this.withPath(`/plugins/${pluginName}`, { plugin: pluginName }, fn);
  }
  
  async trackTool<T>(
    toolName: string,
    fn: () => Promise<T>
  ): Promise<T> {
    return this.withPath(`/tools/${toolName}`, { tool: toolName }, fn);
  }
  
  async trackAnalysis<T>(
    analysisType: string,
    fn: () => Promise<T>
  ): Promise<T> {
    return this.withPath(`/analysis/${analysisType}`, { analysis: analysisType }, fn);
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
  globalSessionManager = manager;
}

export function getGlobalSessionManager(): HeliconeSessionManager | undefined {
  return globalSessionManager;
}

/**
 * Convenience function to get current headers
 * Returns empty object if no session is active
 */
export function getCurrentHeliconeHeaders(): Record<string, string> {
  return globalSessionManager?.getHeaders() || {};
}