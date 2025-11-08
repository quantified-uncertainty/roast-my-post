/**
 * Guards for LLM operations
 *
 * These guards validate prerequisites before performing expensive LLM operations.
 * They check both system pause status and user quota limits.
 */

export { validateLlmAccess } from './llm-operation-guard';
export { validateServerActionAccess, type ServerActionGuardResult } from './server-action-guard';
