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
 */
export function createHeliconeHeaders(config: HeliconeSessionConfig): Record<string, string> {
  const headers: Record<string, string> = {
    "Helicone-Session-Id": config.sessionId,
    "Helicone-Session-Name": config.sessionName,
    "Helicone-Session-Path": config.sessionPath,
  };
  
  // Add user ID if provided
  if (config.userId) {
    headers["Helicone-User-Id"] = config.userId;
  }
  
  // Add custom properties for detailed tracking
  if (config.customProperties) {
    Object.entries(config.customProperties).forEach(([key, value]) => {
      headers[`Helicone-Property-${key}`] = value;
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
  const sessionId = originalJobId || jobId;
  
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
 * Environment configuration for Helicone sessions
 */
export const heliconeSessionsConfig = {
  enabled: process.env.HELICONE_SESSIONS_ENABLED === "true",
  
  // Feature flags for gradual rollout
  features: {
    jobSessions: process.env.HELICONE_JOB_SESSIONS_ENABLED !== "false", // enabled by default
    detailedPaths: process.env.HELICONE_DETAILED_PATHS_ENABLED === "true",
    customMetadata: process.env.HELICONE_CUSTOM_METADATA_ENABLED !== "false", // enabled by default
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
} as const;