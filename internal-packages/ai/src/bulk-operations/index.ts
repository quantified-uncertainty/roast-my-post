/**
 * Bulk operations for claim evaluations
 *
 * Supports YAML-based bulk creation of claims and variations with:
 * - Variable substitution for compression
 * - Templates for common configurations
 * - Variation tracking with index references
 */

export * from './claim-schema';
export * from './yaml-parser';
export * from './orchestrator';
