'use client';

import { ReactNode, useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon, CodeBracketIcon, DocumentTextIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { EXTERNAL_URLS } from '@/shared/constants/constants';

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
  const [showInputSchema, setShowInputSchema] = useState(false);
  const [showOutputSchema, setShowOutputSchema] = useState(false);

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b">
        <div className="flex items-center gap-2">
          <CodeBracketIcon className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900">JSON Schema Reference</h3>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Input and output formats for internal tool usage
        </p>
      </div>
      
      {/* Input Schema */}
      {inputSchema && (
        <div className="border-t">
          <button
            onClick={() => setShowInputSchema(!showInputSchema)}
            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
          >
            <span className="font-medium text-gray-700">Input Schema</span>
            {showInputSchema ? (
              <ChevronDownIcon className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronRightIcon className="h-5 w-5 text-gray-400" />
            )}
          </button>
          {showInputSchema && (
            <div className="px-6 pb-4">
              <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                {JSON.stringify(inputSchema, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Output Schema */}
      {outputSchema && (
        <div className="border-t">
          <button
            onClick={() => setShowOutputSchema(!showOutputSchema)}
            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
          >
            <span className="font-medium text-gray-700">Output Schema</span>
            {showOutputSchema ? (
              <ChevronDownIcon className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronRightIcon className="h-5 w-5 text-gray-400" />
            )}
          </button>
          {showOutputSchema && (
            <div className="px-6 pb-4">
              <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                {JSON.stringify(outputSchema, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ReadmeSection({ content, toolId }: ReadmeSectionProps) {
  // Simple markdown-to-React converter for basic README content
  // This is basic - for production, consider using a proper markdown library

  const githubUrl = `${EXTERNAL_URLS.GITHUB_TOOLS_PATH}/${toolId}`;

  // Helper to parse inline markdown (bold, italic, code)
  const parseInline = (text: string): ReactNode => {
    const parts: ReactNode[] = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
      // Match **bold**
      const boldMatch = remaining.match(/^\*\*(.+?)\*\*/);
      if (boldMatch) {
        parts.push(<strong key={key++}>{boldMatch[1]}</strong>);
        remaining = remaining.slice(boldMatch[0].length);
        continue;
      }

      // Match `code`
      const codeMatch = remaining.match(/^`(.+?)`/);
      if (codeMatch) {
        parts.push(<code key={key++} className="bg-gray-100 px-1 rounded text-sm">{codeMatch[1]}</code>);
        remaining = remaining.slice(codeMatch[0].length);
        continue;
      }

      // Match *italic*
      const italicMatch = remaining.match(/^\*(.+?)\*/);
      if (italicMatch) {
        parts.push(<em key={key++}>{italicMatch[1]}</em>);
        remaining = remaining.slice(italicMatch[0].length);
        continue;
      }

      // Regular text until next special character
      const textMatch = remaining.match(/^[^*`]+/);
      if (textMatch) {
        parts.push(textMatch[0]);
        remaining = remaining.slice(textMatch[0].length);
        continue;
      }

      // Fallback: single character
      parts.push(remaining[0]);
      remaining = remaining.slice(1);
    }

    return <>{parts}</>;
  };

  const renderMarkdown = (text: string): ReactNode => {
    const lines = text.split('\n');
    const elements: ReactNode[] = [];
    let inCodeBlock = false;
    let codeBlock: string[] = [];
    let inList = false;
    let listItems: ReactNode[] = [];

    const flushList = (index: number) => {
      if (inList && listItems.length > 0) {
        elements.push(<ul key={`ul-${index}`} className="list-disc ml-6 mb-3 space-y-1">{listItems}</ul>);
        listItems = [];
        inList = false;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('```')) {
        flushList(i);
        if (inCodeBlock) {
          // End code block
          elements.push(
            <pre key={`code-${i}`} className="bg-gray-50 p-3 rounded overflow-x-auto text-sm my-3">
              <code>{codeBlock.join('\n')}</code>
            </pre>
          );
          codeBlock = [];
          inCodeBlock = false;
        } else {
          // Start code block
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlock.push(line);
        continue;
      }

      if (line.startsWith('# ')) {
        flushList(i);
        elements.push(<h2 key={`h1-${i}`} className="text-2xl font-bold mt-6 mb-3">{parseInline(line.slice(2))}</h2>);
      } else if (line.startsWith('## ')) {
        flushList(i);
        elements.push(<h3 key={`h2-${i}`} className="text-xl font-semibold mt-5 mb-2">{parseInline(line.slice(3))}</h3>);
      } else if (line.startsWith('### ')) {
        flushList(i);
        elements.push(<h4 key={`h3-${i}`} className="text-lg font-medium mt-4 mb-2">{parseInline(line.slice(4))}</h4>);
      } else if (line.startsWith('- ')) {
        if (!inList) {
          inList = true;
        }
        listItems.push(<li key={`li-${i}`} className="text-gray-700">{parseInline(line.slice(2))}</li>);
      } else if (line.trim() === '') {
        flushList(i);
        if (elements.length > 0) {
          elements.push(<div key={`br-${i}`} className="mb-3" />);
        }
      } else {
        flushList(i);
        elements.push(<p key={`p-${i}`} className="mb-3 text-gray-700">{parseInline(line)}</p>);
      }
    }

    flushList(lines.length);
    return elements;
  };

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
      <div className="px-6 py-4 prose max-w-none">
        {renderMarkdown(content)}
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