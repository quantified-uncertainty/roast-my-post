'use client';

import { useEffect, useState } from 'react';
import { ToolPageTemplate } from './ToolPageTemplate';
import type { ComponentProps } from 'react';

type ToolPageTemplateProps = ComponentProps<typeof ToolPageTemplate>;

interface ToolSchemas {
  inputSchema?: any;
  outputSchema?: any;
}

/**
 * Enhanced ToolPageTemplate that fetches actual JSON schemas from the API
 * This eliminates the need to manually duplicate schema definitions
 */
export function ToolPageWithSchemas<TInput, TOutput>(
  props: Omit<ToolPageTemplateProps, 'inputSchema' | 'outputSchema'> & {
    toolId: string;
    fallbackInputSchema?: any;
    fallbackOutputSchema?: any;
  }
) {
  const [schemas, setSchemas] = useState<ToolSchemas>({
    inputSchema: props.fallbackInputSchema,
    outputSchema: props.fallbackOutputSchema,
  });

  useEffect(() => {
    // Fetch the actual schemas from the API
    fetch(`/api/tools/${props.toolId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.tool) {
          setSchemas({
            inputSchema: data.tool.inputSchema || props.fallbackInputSchema,
            outputSchema: data.tool.outputSchema || props.fallbackOutputSchema,
          });
        }
      })
      .catch(err => {
        console.error('Failed to fetch tool schemas:', err);
        // Keep using fallback schemas
      });
  }, [props.toolId, props.fallbackInputSchema, props.fallbackOutputSchema]);

  return (
    <ToolPageTemplate
      {...props}
      inputSchema={schemas.inputSchema}
      outputSchema={schemas.outputSchema}
    />
  );
}