'use client';

import { ReactNode, useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon, CodeBracketIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

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
          Input and output formats for programmatic use
        </p>
      </div>

      <div className="p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="font-mono bg-gray-100 px-2 py-1 rounded">POST</span>
          <span>/api/tools/{toolId}</span>
        </div>
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

function ReadmeSection({ content }: { content: string }) {
  // Simple markdown-to-React converter for basic README content
  // This is basic - for production, consider using a proper markdown library
  const renderMarkdown = (text: string): ReactNode => {
    const lines = text.split('\n');
    const elements: ReactNode[] = [];
    let currentSection: ReactNode[] = [];
    let inCodeBlock = false;
    let codeBlock: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          // End code block
          currentSection.push(
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
        elements.push(...currentSection);
        currentSection = [];
        elements.push(<h2 key={`h1-${i}`} className="text-2xl font-bold mt-6 mb-3">{line.slice(2)}</h2>);
      } else if (line.startsWith('## ')) {
        elements.push(<h3 key={`h2-${i}`} className="text-xl font-semibold mt-5 mb-2">{line.slice(3)}</h3>);
      } else if (line.startsWith('### ')) {
        elements.push(<h4 key={`h3-${i}`} className="text-lg font-medium mt-4 mb-2">{line.slice(4)}</h4>);
      } else if (line.startsWith('- ')) {
        elements.push(<li key={`li-${i}`} className="ml-4 mb-1">• {line.slice(2)}</li>);
      } else if (line.trim() === '') {
        if (currentSection.length > 0) {
          elements.push(<div key={`br-${i}`} className="mb-3" />);
        }
      } else {
        elements.push(<p key={`p-${i}`} className="mb-3 text-gray-700">{line}</p>);
      }
    }

    elements.push(...currentSection);
    return elements;
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b">
        <div className="flex items-center gap-2">
          <DocumentTextIcon className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900">About This Tool</h3>
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
      {readmeContent && <ReadmeSection content={readmeContent} />}
      <SchemaReference toolId={toolId} inputSchema={inputSchema} outputSchema={outputSchema} />
    </div>
  );
}