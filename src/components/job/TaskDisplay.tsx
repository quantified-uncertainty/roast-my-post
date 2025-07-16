"use client";

import React from "react";
import { formatTaskPrice, formatDuration } from "@/lib/job/formatters";

interface Task {
  id: string;
  name: string;
  modelName: string;
  priceInDollars: number;
  timeInSeconds: number | null;
  log: string | null;
  llmInteractions?: any;
  createdAt: Date;
}

interface TaskDisplayProps {
  tasks: Task[];
  showExpandedDetails?: boolean;
  compact?: boolean;
}

export function TaskDisplay({ tasks, showExpandedDetails = true, compact = false }: TaskDisplayProps) {
  const [expandedTasks, setExpandedTasks] = React.useState<Set<string>>(new Set());
  const [jsonViewMode, setJsonViewMode] = React.useState<'pretty' | 'compact'>('pretty');

  if (!tasks || tasks.length === 0) {
    return (
      <div className="text-center text-gray-500">
        No tasks available
      </div>
    );
  }

  const totalCost = tasks.reduce((sum, task) => sum + task.priceInDollars, 0);
  const totalTime = tasks.reduce((sum, task) => sum + (task.timeInSeconds || 0), 0);

  const toggleTask = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const getModelBadgeClass = (modelName: string) => {
    if (modelName.includes('gpt-4')) return 'bg-green-100 text-green-800';
    if (modelName.includes('gpt-3.5')) return 'bg-blue-100 text-blue-800';
    if (modelName.includes('claude')) return 'bg-purple-100 text-purple-800';
    if (modelName.includes('gemini')) return 'bg-orange-100 text-orange-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-4">
      {tasks.map((task, index) => {
        let logData: any = {};
        let summary = "No log data";
        
        try {
          logData = task.log ? JSON.parse(task.log) : {};
          summary = logData.summary || summary;
        } catch (e) {
          summary = task.log || summary;
        }

        const isExpanded = expandedTasks.has(task.id);
        const truncatedSummary = summary.length > 200 ? summary.substring(0, 200) + "..." : summary;

        return (
          <div key={task.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div 
              className={`flex items-center justify-between ${showExpandedDetails ? 'cursor-pointer hover:bg-gray-100 -m-4 p-4 rounded-t-lg transition-colors' : ''}`}
              onClick={showExpandedDetails ? () => toggleTask(task.id) : undefined}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-xs font-medium text-white">
                  {index + 1}
                </span>
                <h4 className="font-medium text-gray-900">{task.name}</h4>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className={`rounded px-2 py-1 text-xs font-medium ${getModelBadgeClass(task.modelName)}`}>
                  {task.modelName}
                </span>
                <span>{formatTaskPrice(task.priceInDollars)}</span>
                {task.timeInSeconds && (
                  <span className="text-gray-600">
                    {formatDuration(task.timeInSeconds)}
                  </span>
                )}
                {showExpandedDetails && (
                  <svg 
                    className="w-5 h-5 transition-transform" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    {isExpanded ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    )}
                  </svg>
                )}
              </div>
            </div>

            {!compact && (
              <div className="mt-3 text-sm text-gray-700">
                <strong>Summary:</strong> {truncatedSummary}
              </div>
            )}

            {showExpandedDetails && isExpanded && (
              <div className="mt-4 space-y-3 border-t pt-4">
                {/* Full summary if truncated */}
                {summary.length > 200 && (
                  <div className="rounded border border-gray-200 bg-white p-3 text-sm text-gray-700">
                    <strong>Full Summary:</strong>
                    <div className="mt-1">{summary}</div>
                  </div>
                )}

                {/* LLM Interactions */}
                {(() => {
                  const interactions = task.llmInteractions || logData.llmInteractions;
                  
                  if (interactions && Array.isArray(interactions) && interactions.length > 0) {
                    return (
                      <div className="rounded-lg border border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                          </svg>
                          LLM Interactions
                        </h4>
                        {interactions.map((interaction: any, idx: number) => (
                          <details key={idx} className="mb-3 group" open>
                            <summary className="cursor-pointer text-sm font-medium text-indigo-900 hover:text-indigo-700 flex items-center gap-2">
                              <span className="text-lg transition-transform inline-block group-open:rotate-90">▸</span>
                              Interaction {idx + 1}
                              {interaction.usage && (
                                <span className="ml-auto text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                                  {interaction.usage.input_tokens.toLocaleString()} → {interaction.usage.output_tokens.toLocaleString()} tokens
                                </span>
                              )}
                            </summary>
                            <div className="mt-3 space-y-3 pl-6">
                              {interaction.messages?.map((msg: any, msgIdx: number) => {
                                let isJson = false;
                                let parsedContent = null;
                                if (typeof msg.content === 'string') {
                                  const trimmed = msg.content.trim();
                                  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                                    try {
                                      parsedContent = JSON.parse(msg.content);
                                      isJson = true;
                                    } catch (e) {
                                      // Not valid JSON
                                    }
                                  }
                                }

                                return (
                                  <div key={msgIdx} className={`rounded-lg border ${
                                    msg.role === 'system' 
                                      ? 'border-gray-300 bg-gray-50' 
                                      : 'border-blue-300 bg-blue-50'
                                  } overflow-hidden`}>
                                    <div className={`px-3 py-2 font-medium text-sm flex items-center gap-2 ${
                                      msg.role === 'system' 
                                        ? 'bg-gray-200 text-gray-700' 
                                        : 'bg-blue-200 text-blue-700'
                                    }`}>
                                      {msg.role === 'system' ? (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                      ) : (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                      )}
                                      {msg.role.charAt(0).toUpperCase() + msg.role.slice(1)}
                                    </div>
                                    <div className="p-3">
                                      {isJson && parsedContent ? (
                                        <div className="space-y-2">
                                          <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-500">JSON Response</span>
                                            <div className="flex items-center gap-2">
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setJsonViewMode(jsonViewMode === 'pretty' ? 'compact' : 'pretty');
                                                }}
                                                className="text-xs text-blue-600 hover:text-blue-800"
                                              >
                                                {jsonViewMode === 'pretty' ? 'Compact View' : 'Pretty View'}
                                              </button>
                                            </div>
                                          </div>
                                          
                                          <div className="relative group">
                                            {jsonViewMode === 'pretty' ? (
                                              <div className="bg-gray-900 text-gray-100 rounded-lg overflow-hidden">
                                                <div className="sticky top-0 bg-gray-800 px-4 py-2 flex items-center justify-between border-b border-gray-700">
                                                  <span className="text-xs text-gray-400">JSON</span>
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      navigator.clipboard.writeText(JSON.stringify(parsedContent, null, 2));
                                                      const btn = e.currentTarget;
                                                      btn.textContent = 'Copied!';
                                                      btn.classList.add('text-green-400');
                                                      setTimeout(() => {
                                                        btn.textContent = 'Copy';
                                                        btn.classList.remove('text-green-400');
                                                      }, 2000);
                                                    }}
                                                    className="text-xs text-gray-400 hover:text-white transition-colors"
                                                  >
                                                    Copy
                                                  </button>
                                                </div>
                                                <div className="p-4 overflow-x-auto max-h-96">
                                                  <pre className="font-mono text-xs leading-relaxed">
                                                    <code>{JSON.stringify(parsedContent, null, 2)}</code>
                                                  </pre>
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="bg-gray-100 rounded-lg p-3 overflow-x-auto max-h-96">
                                                <code className="text-xs text-gray-700 break-all">
                                                  {JSON.stringify(parsedContent)}
                                                </code>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ) : (
                                        <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">{
                                          typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content, null, 2)
                                        }</pre>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </details>
                        ))}
                      </div>
                    );
                  }
                  
                  if (!interactions && (logData.input || logData.output)) {
                    return (
                      <>
                        {logData.input && (
                          <div className="rounded border border-green-200 bg-green-50 p-3">
                            <h4 className="font-medium text-gray-900 mb-2">Input Prompt:</h4>
                            {typeof logData.input === 'object' ? (
                              <pre className="overflow-x-auto rounded bg-white p-3 text-xs text-gray-800 border border-gray-200">
                                {JSON.stringify(logData.input, null, 2)}
                              </pre>
                            ) : (
                              <pre className="whitespace-pre-wrap text-sm text-gray-700">{logData.input}</pre>
                            )}
                          </div>
                        )}
                        {logData.output && (
                          <div className="rounded border border-blue-200 bg-blue-50 p-3">
                            <h4 className="font-medium text-gray-900 mb-2">Output Response:</h4>
                            {typeof logData.output === 'object' ? (
                              <pre className="overflow-x-auto rounded bg-white p-3 text-xs text-gray-800 border border-gray-200">
                                {JSON.stringify(logData.output, null, 2)}
                              </pre>
                            ) : (
                              <pre className="whitespace-pre-wrap text-sm text-gray-700">{logData.output}</pre>
                            )}
                          </div>
                        )}
                      </>
                    );
                  }
                  
                  return null;
                })()}

                {/* Other log data fields */}
                {Object.entries(logData).map(([key, value]) => {
                  if (['summary', 'input', 'output', 'llmInteractions'].includes(key)) return null;
                  
                  return (
                    <div key={key} className="text-sm border-b border-gray-100 pb-2">
                      <strong className="text-gray-700">{key}:</strong>
                      <div className="mt-1">
                        {typeof value === 'object' && value !== null ? (
                          <pre className="overflow-x-auto rounded bg-gray-50 p-2 text-xs text-gray-600">
                            {JSON.stringify(value, null, 2)}
                          </pre>
                        ) : (
                          <span className="text-gray-600"> {String(value)}</span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Raw log */}
                {task.log && (
                  <details className="rounded border bg-white">
                    <summary className="cursor-pointer px-3 py-2 text-sm font-medium hover:bg-gray-50">
                      View Raw Log
                    </summary>
                    <pre className="overflow-x-auto border-t p-3 text-xs text-gray-700">
                      {task.log}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Total Summary */}
      <div className="mt-4 rounded-lg bg-blue-50 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-blue-900">Total Cost:</span>
          <span className="text-blue-700">{formatTaskPrice(totalCost)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-sm">
          <span className="font-medium text-blue-900">Total Time:</span>
          <span className="text-blue-700">
            {formatDuration(totalTime)}
          </span>
        </div>
      </div>
    </div>
  );
}