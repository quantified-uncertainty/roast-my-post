'use client';

import { ReactNode } from 'react';
import { CodeBracketIcon, DocumentTextIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { EXTERNAL_URLS } from '@/shared/constants/constants';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { SchemaDisplay } from './SchemaDisplay';

interface ToolDocumentationProps {
  readmeContent?: string; // Markdown content from README
  toolId: string;
  inputSchema?: object;
  outputSchema?: object;
}

interface SchemaReferenceProps {
  toolId: string;
  inputSchema?: object;
  outputSchema?: object;
}

interface ReadmeSectionProps {
  content: string;
  toolId: string;
}

function SchemaReference({ toolId, inputSchema, outputSchema }: SchemaReferenceProps) {
  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b">
        <div className="flex items-center gap-2">
          <CodeBracketIcon className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900">API Reference</h3>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Input and output formats for programmatic tool usage
        </p>
      </div>

      {/* Input Schema */}
      {inputSchema && (
        <SchemaDisplay title="Input Schema" schema={inputSchema} defaultOpen={true} />
      )}

      {/* Output Schema */}
      {outputSchema && (
        <SchemaDisplay title="Output Schema" schema={outputSchema} defaultOpen={true} />
      )}
    </div>
  );
}

function ReadmeSection({ content, toolId }: ReadmeSectionProps) {
  const githubUrl = `${EXTERNAL_URLS.GITHUB_TOOLS_PATH}/${toolId}`;

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DocumentTextIcon className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-medium text-gray-900">About This Tool</h3>
          </div>
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            <span>View source</span>
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
          </a>
        </div>
      </div>
      <div className="px-6 py-4 prose prose-gray max-w-none">
        <MarkdownRenderer>{content}</MarkdownRenderer>
      </div>
    </div>
  );
}

export function ToolDocumentation({ readmeContent, toolId, inputSchema, outputSchema }: ToolDocumentationProps) {
  return (
    <div className="space-y-6">
      {readmeContent && <ReadmeSection content={readmeContent} toolId={toolId} />}
      <SchemaReference toolId={toolId} inputSchema={inputSchema} outputSchema={outputSchema} />
    </div>
  );
}