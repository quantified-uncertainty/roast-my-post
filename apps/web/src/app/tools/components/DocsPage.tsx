'use client';

import { toolSchemas, getToolReadme } from '@roast/ai';
import { ToolDocumentation } from './ToolDocumentation';

export interface GenericToolDocsPageProps {
  toolId: keyof typeof toolSchemas;
}

/**
 * Generic documentation page for tools
 * No authentication required - publicly accessible
 * Layout is handled by layout.tsx
 */
export function GenericToolDocsPage({
  toolId,
}: GenericToolDocsPageProps) {
  // Get schemas from centralized registry
  const { inputSchema, outputSchema } = toolSchemas[toolId];
  
  // README content from generated file
  const readmeContent = getToolReadme(toolId as string);
  
  return (
    <ToolDocumentation
      toolId={toolId as string}
      inputSchema={inputSchema}
      outputSchema={outputSchema}
      readmeContent={readmeContent}
    />
  );
}