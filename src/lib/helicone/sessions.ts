/**
 * Helicone Sessions Integration
 * 
 * Provides utilities for tracking AI workflow sessions with Helicone,
 * enabling hierarchical tracing of job processing and LLM calls.
 */

export interface HeliconeSessionConfig {
  sessionId: string;
  sessionName: string;
  sessionPath: string;
  userId?: string;
  customProperties?: Record<string, string>;
}

/**
 * Creates Helicone headers for session tracking
 * 
 * Validates input to prevent header injection and malformed data
 */
export function createHeliconeHeaders(config: HeliconeSessionConfig): Record<string, string> {
  // Validate session ID format (alphanumeric, hyphens, underscores only)
  if (!/^[\w-]+$/.test(config.sessionId)) {
    throw new Error(`Invalid session ID format: "${config.sessionId}". Must contain only alphanumeric characters, hyphens, and underscores.`);
  }
  
  // Sanitize session name to ASCII only (replace Unicode quotes and other non-ASCII characters)
  const sanitizedSessionName = config.sessionName
    .replace(/[\u2018\u2019]/g, "'") // Replace smart single quotes
    .replace(/[\u201C\u201D]/g, '"') // Replace smart double quotes
    .replace(/[\u2013\u2014]/g, '-') // Replace en/em dashes
    .replace(/[^\x00-\x7F]/g, ''); // Remove any remaining non-ASCII characters
  
  // Validate session name (no newlines, reasonable length)
  if (sanitizedSessionName.includes('\n') || sanitizedSessionName.includes('\r')) {
    throw new Error('Session name cannot contain newline characters');
  }
  if (sanitizedSessionName.length > 200) {
    throw new Error(`Session name too long (${sanitizedSessionName.length} chars). Maximum 200 characters allowed.`);
  }
  
  // Validate session path format
  if (!/^\/[\w\/\-]*$/.test(config.sessionPath)) {
    throw new Error(`Invalid session path format: "${config.sessionPath}". Must start with "/" and contain only alphanumeric characters, hyphens, underscores, and forward slashes.`);
  }
  
  const headers: Record<string, string> = {
    "Helicone-Session-Id": config.sessionId,
    "Helicone-Session-Name": sanitizedSessionName,
    "Helicone-Session-Path": config.sessionPath,
  };
  
  // Add user ID if provided
  if (config.userId) {
    // Validate user ID format
    if (!/^[\w@.-]+$/.test(config.userId)) {
      throw new Error(`Invalid user ID format: "${config.userId}". Must contain only alphanumeric characters, hyphens, underscores, dots, and @ symbols.`);
    }
    headers["Helicone-User-Id"] = config.userId;
  }
  
  // Add custom properties for detailed tracking
  if (config.customProperties) {
    Object.entries(config.customProperties).forEach(([key, value]) => {
      // Validate property key (alphanumeric, hyphens, underscores only)
      if (!/^[\w-]+$/.test(key)) {
        throw new Error(`Invalid property key format: "${key}". Must contain only alphanumeric characters, hyphens, and underscores.`);
      }
      
      // Validate property value (string, no newlines, reasonable length)
      if (typeof value !== 'string') {
        throw new Error(`Property value for "${key}" must be a string, got ${typeof value}`);
      }
      if (value.includes('\n') || value.includes('\r')) {
        throw new Error(`Property value for "${key}" cannot contain newline characters`);
      }
      if (value.length > 500) {
        throw new Error(`Property value for "${key}" too long (${value.length} chars). Maximum 500 characters allowed.`);
      }
      
      // Sanitize value to ASCII only
      const sanitizedValue = value
        .replace(/[\u2018\u2019]/g, "'") // Replace smart single quotes
        .replace(/[\u201C\u201D]/g, '"') // Replace smart double quotes
        .replace(/[\u2013\u2014]/g, '-') // Replace en/em dashes
        .replace(/[^\x00-\x7F]/g, ''); // Remove any remaining non-ASCII characters
      
      headers[`Helicone-Property-${key}`] = sanitizedValue;
    });
  }
  
  return headers;
}

/**
 * Creates a session configuration for a job
 */
export function createJobSessionConfig(
  jobId: string,
  originalJobId: string | null,
  agentName: string,
  documentTitle: string,
  path: string = "/job",
  additionalProps?: Record<string, string>,
  userId?: string
): HeliconeSessionConfig {
  // Use originalJobId for retries to group them under the same session
  let sessionId = originalJobId || jobId;
  
  
  // Truncate document title for readability
  const truncatedTitle = documentTitle.length > 50 
    ? documentTitle.slice(0, 50) + "..." 
    : documentTitle;
  
  return {
    sessionId,
    sessionName: `${agentName} evaluating ${truncatedTitle}`,
    sessionPath: path,
    userId,
    customProperties: {
      JobId: jobId,
      JobAttempt: originalJobId ? "retry" : "initial",
      AgentName: agentName,
      DocumentTitle: documentTitle,
      ...additionalProps
    }
  };
}

/**
 * Configuration for Helicone sessions
 * All features are enabled by default
 */
export const heliconeSessionsConfig = {
  enabled: true,
  
  // Feature flags - all enabled
  features: {
    jobSessions: true,
    detailedPaths: true,
    customMetadata: true,
  }
};

/**
 * Session path constants
 */
export const SESSION_PATHS = {
  JOB_START: "/job/start",
  JOB_ANALYSIS: "/job/analysis",
  JOB_COMPLETE: "/job/complete",
  JOB_FAILED: "/job/failed",
  ANALYSIS_COMPREHENSIVE: "/job/analysis/comprehensive",
  ANALYSIS_HIGHLIGHTS: "/job/analysis/highlights", 
  ANALYSIS_SELF_CRITIQUE: "/job/analysis/self-critique",
  // Specific analysis types
  ANALYSIS_LINK_VERIFICATION: "/job/analysis/link-verification",
  ANALYSIS_SPELLING_GRAMMAR: "/job/analysis/spelling-grammar",
  ANALYSIS_MULTI_EPISTEMIC: "/job/analysis/multi-epistemic",
  ANALYSIS_PLUGINS: "/job/analysis",
} as const;