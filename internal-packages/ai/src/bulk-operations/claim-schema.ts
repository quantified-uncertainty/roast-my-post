import { z } from "zod";

/**
 * Schema for YAML bulk claim operations
 *
 * Supports:
 * - Variables: Define reusable values
 * - Templates: Define claim templates with variable substitution
 * - Claims: Array of claim evaluations to create
 */

// Variable values can be strings, numbers, booleans, arrays, or objects
export const variableValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
  z.record(z.unknown()),
]);

// Template definition for claims
// Note: Fields can be strings (for variable references like "{{VAR}}") or their actual types
export const claimTemplateSchema = z.object({
  claim: z.string().optional(),
  context: z.string().optional(),
  models: z.union([z.array(z.string()), z.string()]).optional(), // String for variable reference
  runs: z.union([z.number().int().min(1).max(5), z.string()]).optional(),
  temperature: z.union([z.number().min(0).max(1), z.string()]).optional(),
  explanationLength: z.union([z.number().int().min(3).max(200), z.string()]).optional(),
  promptTemplate: z.string().max(50000).optional(),
  submitterNotes: z.string().optional(),
  tags: z.union([z.array(z.string()), z.string()]).optional(), // String for variable reference
  variationOf: z.union([z.number(), z.string()]).optional(), // Index or ID
});

// Claim definition in YAML (before expansion)
// Fields can be strings for variable references or their actual types
export const yamlClaimSchema = z.object({
  claim: z.string().min(1),
  template: z.string().optional(), // Reference to template name
  context: z.string().optional(),
  models: z.union([z.array(z.string()), z.string()]).optional(), // String for variable reference
  runs: z.union([z.number().int().min(1).max(5), z.string()]).optional(),
  temperature: z.union([z.number().min(0).max(1), z.string()]).optional(),
  explanationLength: z.union([z.number().int().min(3).max(200), z.string()]).optional(),
  promptTemplate: z.string().max(50000).optional(),
  submitterNotes: z.string().optional(),
  tags: z.union([z.array(z.string()), z.string()]).optional(), // String for variable reference
  variationOf: z.union([z.number(), z.string()]).optional(), // Index or ID
});

// Full YAML bulk request structure
export const bulkClaimYamlSchema = z.object({
  variables: z.record(variableValueSchema).optional(),
  templates: z.record(claimTemplateSchema).optional(),
  claims: z.array(yamlClaimSchema).min(1),
});

// Expanded claim (after variable substitution and template application)
export const expandedClaimSchema = z.object({
  claim: z.string().min(1),
  context: z.string().optional(),
  models: z.array(z.string()).optional(),
  runs: z.number().int().min(1).max(5).optional(),
  temperature: z.number().min(0).max(1).optional(),
  explanationLength: z.number().int().min(3).max(200).optional(),
  promptTemplate: z.string().max(50000).optional(),
  submitterNotes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  variationOf: z.union([z.number(), z.string()]).optional(),
});

// Result of a single claim evaluation in bulk operation
export const claimEvaluationResultSchema = z.object({
  index: z.number().describe("Original index in the claims array"),
  success: z.boolean(),
  id: z.string().optional().describe("Created claim evaluation ID (if successful)"),
  error: z.string().optional().describe("Error message (if failed)"),
  claim: z.string().describe("The claim that was evaluated"),
});

// Full bulk operation result
export const bulkClaimResultSchema = z.object({
  total: z.number(),
  successful: z.number(),
  failed: z.number(),
  results: z.array(claimEvaluationResultSchema),
});

// TypeScript types
export type VariableValue = z.infer<typeof variableValueSchema>;
export type ClaimTemplate = z.infer<typeof claimTemplateSchema>;
export type YamlClaim = z.infer<typeof yamlClaimSchema>;
export type BulkClaimYaml = z.infer<typeof bulkClaimYamlSchema>;
export type ExpandedClaim = z.infer<typeof expandedClaimSchema>;
export type ClaimEvaluationResult = z.infer<typeof claimEvaluationResultSchema>;
export type BulkClaimResult = z.infer<typeof bulkClaimResultSchema>;
