/**
 * Shared utilities for generating plugin README documentation
 */

import { type Tool } from '../../tools/base/Tool';

/**
 * Generates a "Tools Used" section for plugin READMEs
 * Links to the actual tool pages with descriptions from tool config
 */
export function generateToolsUsedSection(tools: Tool<any, any>[]): string {
  if (tools.length === 0) return '';

  return `## Tools Used

${tools.map(tool =>
  `- **[${tool.config.name}](${tool.config.path})** - ${tool.config.description}`
).join('\n')}

`;
}
