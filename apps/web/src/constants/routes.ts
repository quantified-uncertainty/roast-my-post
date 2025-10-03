/**
 * Application route constants
 * Centralized location for all route paths to ensure consistency
 */

export const ROUTES = {
  // Auth routes
  AUTH: {
    SIGNIN: '/api/auth/signin',
    SIGNOUT: '/api/auth/signout',
    SIGNUP: '/signup',
  },

  // Agent routes
  AGENTS: {
    LIST: '/evaluators',
    NEW: '/evaluators/new',
    DETAIL: (agentId: string) => `/evaluators/${agentId}`,
    DETAILS: (agentId: string) => `/evaluators/${agentId}/details`,
    EVALS: (agentId: string) => `/evaluators/${agentId}/evals`,
    JOBS: (agentId: string) => `/evaluators/${agentId}/jobs`,
    TEST: (agentId: string) => `/evaluators/${agentId}/test`,
    BATCHES: (agentId: string) => `/evaluators/${agentId}/batches`,
    EXPORT: (agentId: string) => `/evaluators/${agentId}/export`,
    VERSIONS: (agentId: string) => `/evaluators/${agentId}/versions`,
    EDIT: (agentId: string) => `/evaluators/${agentId}/edit`,
    IMPORT_YAML: (agentId: string) => `/evaluators/${agentId}/import-yaml`,
  },

  // Document routes
  DOCS: {
    LIST: '/docs',
    NEW: '/docs/new',
    DETAIL: (docId: string) => `/docs/${docId}`,
    READER: (docId: string) => `/docs/${docId}/reader`,
    EDIT: (docId: string) => `/docs/${docId}/edit`,
    EVAL: (docId: string, agentId: string) => `/docs/${docId}/evals/${agentId}`,
    EVAL_VERSIONS: (docId: string, agentId: string) => `/docs/${docId}/evals/${agentId}/versions`,
  },

  // Tool routes
  TOOLS: {
    LIST: '/tools',
    DETAIL: (toolId: string) => `/tools/${toolId}`,
    DOCS: (toolId: string) => `/tools/${toolId}/docs`,
    TRY: (toolId: string) => `/tools/${toolId}/try`,
  },

  // User routes
  USERS: {
    PROFILE: (userId: string) => `/users/${userId}`,
    DOCUMENTS: (userId: string) => `/users/${userId}/documents`,
    AGENTS: (userId: string) => `/users/${userId}/evaluators`,
  },

  // Settings routes
  SETTINGS: {
    BASE: '/settings',
    ACCOUNT: '/settings/account',
    API_KEYS: '/settings/api-keys',
  },

  // Monitor routes
  MONITOR: {
    DASHBOARD: '/monitor',
    QUEUE: '/monitor/queue',
    AGENTS: '/monitor/evaluators',
    JOBS: '/monitor/jobs',
    DOCUMENTS: '/monitor/documents',
  },

  // API routes
  API: {
    AGENTS: {
      LIST: '/api/evaluators',
      DETAIL: (agentId: string) => `/api/evaluators/${agentId}`,
      JOBS: (agentId: string) => `/api/evaluators/${agentId}/jobs`,
      BATCHES: (agentId: string) => `/api/evaluators/${agentId}/batches`,
      EVALUATIONS: (agentId: string) => `/api/evaluators/${agentId}/evaluations`,
    },
    DOCS: {
      LIST: '/api/docs',
      DETAIL: (docId: string) => `/api/docs/${docId}`,
    },
  },

  // Other routes
  HOME: '/',
  ABOUT: '/about',
  PRIVACY: '/privacy-policy',
  TERMS: '/terms-of-service',
} as const;

// Type-safe route builder
export type Routes = typeof ROUTES;