'use client';

import { useState } from 'react';
import { ChatBubbleLeftRightIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface AgentInteractionProps {
  llmInteraction?: {
    model?: string;
    prompt?: string;
    response?: string;
    tokensUsed?: {
      prompt?: number;
      completion?: number;
      total?: number;
    };
    timestamp?: Date | string;
    duration?: number;
  };
  toolCalls?: Array<{
    tool: string;
    input: any;
    output: any;
  }>;
}

export function AgentInteraction({ llmInteraction, toolCalls }: AgentInteractionProps) {
  const [showMessages, setShowMessages] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showToolCalls, setShowToolCalls] = useState(false);

  if (!llmInteraction && !toolCalls) return null;

  return (
    <div className="bg-white shadow rounded-lg">
      <button
        onClick={() => setShowMessages(!showMessages)}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ChatBubbleLeftRightIcon className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900">Agent Interaction</h3>
          {llmInteraction && (
            <span className="text-sm text-gray-500">
              ({llmInteraction.tokensUsed?.total || 0} tokens
              {llmInteraction.duration && `, ${llmInteraction.duration}ms`})
            </span>
          )}
        </div>
        {showMessages ? (
          <ChevronDownIcon className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronRightIcon className="h-5 w-5 text-gray-400" />
        )}
      </button>
      
      {showMessages && (
        <div className="border-t">
          {/* Prompt Section */}
          {llmInteraction?.prompt && (
            <div className="border-b">
              <button
                onClick={() => setShowPrompt(!showPrompt)}
                className="w-full px-6 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-medium text-gray-700">System Prompt & User Input</span>
                {showPrompt ? (
                  <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                )}
              </button>
              {showPrompt && (
                <div className="px-6 pb-4">
                  <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto whitespace-pre-wrap">
                    {llmInteraction.prompt}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Response Section */}
          {llmInteraction?.response && (
            <div className="px-6 py-4 space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Agent Response:</h4>
                <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto whitespace-pre-wrap">
                  {llmInteraction.response}
                </pre>
              </div>
            </div>
          )}

          {/* Tool Calls Section */}
          {toolCalls && toolCalls.length > 0 && (
            <div className="border-t">
              <button
                onClick={() => setShowToolCalls(!showToolCalls)}
                className="w-full px-6 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-medium text-gray-700">
                  Tool Calls ({toolCalls.length})
                </span>
                {showToolCalls ? (
                  <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                )}
              </button>
              {showToolCalls && (
                <div className="px-6 pb-4 space-y-3">
                  {toolCalls.map((call, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded">
                      <div className="text-xs font-medium text-gray-700 mb-1">
                        {index + 1}. {call.tool}
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div>
                          <div className="text-xs text-gray-600 mb-1">Input:</div>
                          <pre className="text-xs bg-white p-2 rounded overflow-x-auto">
                            {JSON.stringify(call.input, null, 2)}
                          </pre>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 mb-1">Output:</div>
                          <pre className="text-xs bg-white p-2 rounded overflow-x-auto">
                            {JSON.stringify(call.output, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Metadata */}
          {llmInteraction && (
            <div className="px-6 py-3 bg-gray-50 text-xs text-gray-600 space-y-1">
              {llmInteraction.model && (
                <div>Model: {llmInteraction.model}</div>
              )}
              {llmInteraction.tokensUsed && (
                <div>
                  Tokens: {llmInteraction.tokensUsed.prompt || 0} prompt, 
                  {llmInteraction.tokensUsed.completion || 0} completion
                </div>
              )}
              {llmInteraction.timestamp && (
                <div>
                  Timestamp: {new Date(llmInteraction.timestamp).toLocaleString()}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}