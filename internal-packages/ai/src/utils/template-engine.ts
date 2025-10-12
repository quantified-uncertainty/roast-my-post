/**
 * Simple template engine for prompt templates
 * Uses Handlebars/Mustache-style {{VARIABLE}} syntax
 */

export type TemplateVariables = Record<string, string | number | undefined | null>;

/**
 * Render a template string by replacing {{VARIABLE}} placeholders with values
 *
 * @param template - Template string with {{VARIABLE}} placeholders
 * @param variables - Object mapping variable names to values
 * @returns Rendered string with variables substituted
 *
 * @example
 * ```ts
 * const template = "Hello {{NAME}}, you are {{AGE}} years old.";
 * const result = renderTemplate(template, { NAME: "Alice", AGE: 25 });
 * // Returns: "Hello Alice, you are 25 years old."
 * ```
 */
export function renderTemplate(template: string, variables: TemplateVariables): string {
  // Replace {{VARIABLE}} with corresponding values
  // Regex matches {{ANYTHING_HERE}} where ANYTHING_HERE is alphanumeric + underscores
  return template.replace(/\{\{([A-Z_][A-Z0-9_]*)\}\}/g, (match, varName: string) => {
    const value = variables[varName];

    // If variable is undefined or null, keep the placeholder
    if (value === undefined || value === null) {
      return match; // Return original {{VAR}} if not provided
    }

    // Convert to string
    return String(value);
  });
}

/**
 * Extract all variable names from a template string
 *
 * @param template - Template string with {{VARIABLE}} placeholders
 * @returns Array of unique variable names found in the template
 *
 * @example
 * ```ts
 * const template = "Hello {{NAME}}, you are {{AGE}} years old. {{NAME}} is great!";
 * const vars = extractVariables(template);
 * // Returns: ["NAME", "AGE"]
 * ```
 */
export function extractVariables(template: string): string[] {
  const regex = /\{\{([A-Z_][A-Z0-9_]*)\}\}/g;
  const matches = template.matchAll(regex);
  const variables = new Set<string>();

  for (const match of matches) {
    variables.add(match[1]);
  }

  return Array.from(variables);
}

/**
 * Validate that all required variables are provided
 *
 * @param template - Template string with {{VARIABLE}} placeholders
 * @param variables - Object mapping variable names to values
 * @returns Object with isValid boolean and missing array of variable names
 *
 * @example
 * ```ts
 * const template = "Hello {{NAME}}, you are {{AGE}} years old.";
 * const result = validateTemplate(template, { NAME: "Alice" });
 * // Returns: { isValid: false, missing: ["AGE"] }
 * ```
 */
export function validateTemplate(
  template: string,
  variables: TemplateVariables
): { isValid: boolean; missing: string[] } {
  const requiredVars = extractVariables(template);
  const missing = requiredVars.filter(
    (varName) => variables[varName] === undefined || variables[varName] === null
  );

  return {
    isValid: missing.length === 0,
    missing,
  };
}
