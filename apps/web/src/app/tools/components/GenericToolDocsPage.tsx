'use client';

import { ReactNode } from 'react';
import { toolSchemas, getToolReadme } from '@roast/ai';
import { ToolPageLayout } from './ToolPageLayout';
import { ToolDocumentation } from './ToolDocumentation';

export interface GenericToolDocsPageProps {
  toolId: keyof typeof toolSchemas;
  title: string;
  description: string;
  icon: ReactNode;
  warning?: string;
}

/**
 * Generic documentation page for tools
 * No authentication required - publicly accessible
 */
export function GenericToolDocsPage({
  toolId,
  title,
  description,
  icon,
  warning
}: GenericToolDocsPageProps) {
  // Get schemas from centralized registry
  const { inputSchema, outputSchema } = toolSchemas[toolId];
  
  // README content from generated file
  const readmeContent = getToolReadme(toolId as string);
  
  return (
    <ToolPageLayout
      title={title}
      description={description}
      icon={icon}
      warning={warning}
      toolId={toolId as string}
    >
      <ToolDocumentation
        toolId={toolId as string}
        inputSchema={inputSchema}
        outputSchema={outputSchema}
        readmeContent={readmeContent}
      />
    </ToolPageLayout>
  );
}