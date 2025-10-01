/**
 * Shared utilities for generating tool README content
 */

import type { Tool } from '../base/Tool';
import type { z } from 'zod';

/**
 * Generate header section (name and description) from tool config
 */
export function generateToolHeader(tool: Tool<any, any>): string {
  return `# ${tool.config.name}

${tool.config.description}`;
}

/**
 * Generate a "Tools Used" section for tools that depend on other tools
 * @param tools Array of tool instances this tool depends on
 * @returns Markdown section with tool links, or empty string if no tools
 */
export function generateToolsUsedSection(tools: Tool<any, any>[]): string {
  if (tools.length === 0) return '';

  return `## Tools Used

${tools.map(tool =>
  `- **[${tool.config.name}](${tool.config.path})** - ${tool.config.description}`
).join('\n')}

`;
}

/**
 * Generate schema documentation section from Zod schemas
 * Shows input/output schemas in a clean format
 */
export function generateSchemaSection(
  inputSchema?: z.ZodType<any>,
  outputSchema?: z.ZodType<any>
): string {
  if (!inputSchema && !outputSchema) return '';

  let section = '## Schema\n\n';

  if (inputSchema) {
    section += '### Input\n\n```typescript\n';
    section += formatZodSchema(inputSchema);
    section += '\n```\n\n';
  }

  if (outputSchema) {
    section += '### Output\n\n```typescript\n';
    section += formatZodSchema(outputSchema);
    section += '\n```\n\n';
  }

  return section;
}

/**
 * Simple Zod schema formatter for documentation
 * Extracts type information from Zod schemas
 */
function formatZodSchema(schema: z.ZodType<any>): string {
  // This is a simplified formatter - could be enhanced to parse Zod schemas more deeply
  // For now, tools can provide their own schema documentation in their generators
  return '// Type information extracted from Zod schema\n// See source code for full schema details';
}
