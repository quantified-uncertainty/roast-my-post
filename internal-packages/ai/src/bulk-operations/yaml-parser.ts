import { parse as parseYaml } from 'yaml';
import {
  type BulkClaimYaml,
  type ExpandedClaim,
  type VariableValue,
  bulkClaimYamlSchema,
  expandedClaimSchema,
} from './claim-schema';

/**
 * Parse and expand a YAML bulk claim request
 *
 * Steps:
 * 1. Parse YAML
 * 2. Validate structure
 * 3. Resolve variables
 * 4. Apply templates
 * 5. Return expanded claims ready for execution
 */

/**
 * Substitute variables in a string value
 * Supports {{VAR_NAME}} syntax
 */
function substituteVariables(
  value: string,
  variables: Record<string, VariableValue>
): string {
  return value.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    if (!(varName in variables)) {
      throw new Error(
        `Variable {{${varName}}} not found. Available variables: ${Object.keys(variables).join(', ')}`
      );
    }
    const varValue = variables[varName];

    // Convert to string
    if (typeof varValue === 'string') return varValue;
    if (typeof varValue === 'number' || typeof varValue === 'boolean') {
      return String(varValue);
    }

    // Arrays and objects need special handling - they should be referenced by field, not inline
    throw new Error(
      `Cannot substitute complex variable {{${varName}}} inline. Use it as a field value instead.`
    );
  });
}

/**
 * Substitute variables in any value (recursive)
 */
function substituteValue<T>(
  value: T,
  variables: Record<string, VariableValue>
): T {
  if (typeof value === 'string') {
    // Check if entire value is a variable reference like "{{VAR}}"
    const fullMatch = value.match(/^\{\{(\w+)\}\}$/);
    if (fullMatch) {
      const varName = fullMatch[1];
      if (!(varName in variables)) {
        throw new Error(
          `Variable {{${varName}}} not found. Available variables: ${Object.keys(variables).join(', ')}`
        );
      }
      // Return the variable value as-is (can be any type)
      return variables[varName] as T;
    }

    // Otherwise do string substitution
    return substituteVariables(value, variables) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => substituteValue(item, variables)) as T;
  }

  if (typeof value === 'object' && value !== null) {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = substituteValue(val, variables);
    }
    return result as T;
  }

  return value;
}

/**
 * Merge template and overrides
 * Arrays and primitives: override replaces template
 * Objects: deep merge
 */
function mergeWithTemplate<T extends Record<string, unknown>>(
  template: T,
  overrides: Partial<T>
): T {
  const result = { ...template };

  for (const key in overrides) {
    const overrideValue = overrides[key];
    const templateValue = template[key];

    // If override is undefined, skip
    if (overrideValue === undefined) continue;

    // If both are plain objects (not arrays), deep merge
    if (
      typeof overrideValue === 'object' &&
      overrideValue !== null &&
      !Array.isArray(overrideValue) &&
      typeof templateValue === 'object' &&
      templateValue !== null &&
      !Array.isArray(templateValue)
    ) {
      result[key] = mergeWithTemplate(
        templateValue as Record<string, unknown>,
        overrideValue as Record<string, unknown>
      ) as T[Extract<keyof T, string>];
    } else {
      // Otherwise override replaces
      result[key] = overrideValue as T[Extract<keyof T, string>];
    }
  }

  return result;
}

/**
 * Parse YAML content and return validated structure
 */
export function parseYamlContent(yamlContent: string): BulkClaimYaml {
  let parsed: unknown;

  try {
    parsed = parseYaml(yamlContent);
  } catch (error) {
    throw new Error(
      `Invalid YAML syntax: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  // Validate structure
  const validation = bulkClaimYamlSchema.safeParse(parsed);
  if (!validation.success) {
    const errors = validation.error.errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join('; ');
    throw new Error(`Invalid YAML structure: ${errors}`);
  }

  return validation.data;
}

/**
 * Expand claims by applying variables and templates
 */
export function expandClaims(bulkRequest: BulkClaimYaml): ExpandedClaim[] {
  const variables = bulkRequest.variables || {};
  const templates = bulkRequest.templates || {};

  return bulkRequest.claims.map((claim, index) => {
    // Step 1: Substitute variables in the claim
    const withVariables = substituteValue(claim, variables);

    // Step 2: Apply template if specified
    let expanded: ExpandedClaim;
    if (withVariables.template) {
      const templateName = withVariables.template;
      const template = templates[templateName];

      if (!template) {
        throw new Error(
          `Template "${templateName}" not found in claim at index ${index}. Available templates: ${Object.keys(templates).join(', ')}`
        );
      }

      // Substitute variables in template first
      const expandedTemplate = substituteValue(template, variables);

      // Merge template with claim overrides
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { template: _, ...claimWithoutTemplate } = withVariables;
      expanded = mergeWithTemplate(expandedTemplate, claimWithoutTemplate) as unknown as ExpandedClaim;

      // Ensure claim field is present (required)
      if (!expanded.claim) {
        throw new Error(
          `Claim at index ${index} is missing required "claim" field after template expansion`
        );
      }
    } else {
      // No template, use claim as-is
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { template: _, ...claimData } = withVariables;
      expanded = claimData as unknown as ExpandedClaim;
    }

    // Step 3: Validate expanded claim
    const validation = expandedClaimSchema.safeParse(expanded);
    if (!validation.success) {
      const errors = validation.error.errors
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join('; ');
      throw new Error(
        `Invalid claim at index ${index} after expansion: ${errors}`
      );
    }

    return validation.data;
  });
}

/**
 * Main entry point: Parse YAML and expand claims
 */
export function parseAndExpandYaml(yamlContent: string): ExpandedClaim[] {
  const bulkRequest = parseYamlContent(yamlContent);
  return expandClaims(bulkRequest);
}
