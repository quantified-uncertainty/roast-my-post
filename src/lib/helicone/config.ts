/**
 * Helicone configuration
 */

export const heliconeSessionsConfig = {
  // Whether Helicone sessions are enabled
  enabled: process.env.HELICONE_SESSIONS_ENABLED === 'true',
  
  // Feature flags for different session types
  features: {
    jobSessions: process.env.HELICONE_JOB_SESSIONS_ENABLED === 'true',
    documentAnalysis: process.env.HELICONE_SESSIONS_ENABLED === 'true',
    comprehensiveAnalysis: process.env.HELICONE_SESSIONS_ENABLED === 'true',
  },
  
  // Default session name templates
  templates: {
    jobSession: (jobId: string) => `Job ${jobId}`,
    documentSession: (docTitle: string) => `Document Analysis: ${docTitle}`,
    comprehensiveSession: (docTitle: string) => `Comprehensive Analysis: ${docTitle}`,
  }
};