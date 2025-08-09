'use client';

import { useState } from 'react';
import { CodeBracketIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface ApiDocumentationProps {
  inputSchema?: any;
  outputSchema?: any;
  lastInput?: any;
  lastOutput?: any;
  endpoint?: string;
  description?: string;
  title?: string;
  method?: string;
}

export function ApiDocumentation({
  inputSchema,
  outputSchema,
  lastInput,
  lastOutput,
  endpoint,
  description,
  title = "API Documentation",
  method = "POST"
}: ApiDocumentationProps) {
  const [showInputSchema, setShowInputSchema] = useState(false);
  const [showOutputSchema, setShowOutputSchema] = useState(false);
  const [showExample, setShowExample] = useState(false);

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b">
        <div className="flex items-center gap-2">
          <CodeBracketIcon className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        </div>
        {description && (
          <p className="mt-2 text-sm text-gray-600">{description}</p>
        )}
        {endpoint && (
          <div className="mt-2">
            <code className="text-xs bg-gray-100 px-2 py-1 rounded">{method} {endpoint}</code>
          </div>
        )}
      </div>
      
      {/* Input Schema */}
      {inputSchema && (
        <div className="border-b">
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
              {lastInput && (
                <div className="mt-4">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Last Input:</h5>
                  <pre className="text-xs bg-blue-50 p-3 rounded overflow-x-auto">
                    {JSON.stringify(lastInput, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Output Schema */}
      {outputSchema && (
        <div className="border-b">
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
              {lastOutput && (
                <div className="mt-4">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Last Output:</h5>
                  <pre className="text-xs bg-green-50 p-3 rounded overflow-x-auto">
                    {JSON.stringify(lastOutput, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Example Usage */}
      <div>
        <button
          onClick={() => setShowExample(!showExample)}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
        >
          <span className="font-medium text-gray-700">Example Usage</span>
          {showExample ? (
            <ChevronDownIcon className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronRightIcon className="h-5 w-5 text-gray-400" />
          )}
        </button>
        {showExample && (
          <div className="px-6 pb-4">
            <div className="space-y-4">
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-2">JavaScript/TypeScript:</h5>
                <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
{`const response = await fetch('${endpoint || '/api/tools/[tool-name]'}', {
  method: '${method}',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: JSON.stringify(${lastInput ? JSON.stringify(lastInput, null, 2) : '{ /* your input */ }'})
});

const result = await response.json();`}</pre>
              </div>
              
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-2">cURL:</h5>
                <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
{`curl -X ${method} ${endpoint || 'https://your-domain.com/api/tools/[tool-name]'} \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '${lastInput ? JSON.stringify(lastInput) : '{"statement": "2 + 2 = 4"}'}'`}</pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}