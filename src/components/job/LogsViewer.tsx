"use client";

import { useState } from "react";
import { ChevronDownIcon, ChevronUpIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import { CopyButton } from "@/components/CopyButton";

interface LogsViewerProps {
  logs: string;
  defaultExpanded?: boolean;
  title?: string;
  className?: string;
}

export function LogsViewer({ 
  logs, 
  defaultExpanded = false, 
  title = "Logs",
  className = ""
}: LogsViewerProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (!logs || logs.trim() === '') {
    return null;
  }

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
        >
          <DocumentTextIcon className="h-4 w-4" />
          {title}
          {isExpanded ? (
            <ChevronUpIcon className="h-4 w-4" />
          ) : (
            <ChevronDownIcon className="h-4 w-4" />
          )}
        </button>
        {isExpanded && (
          <CopyButton text={logs} />
        )}
      </div>

      {isExpanded && (
        <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200 max-h-96 overflow-y-auto">
          <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">
            {logs}
          </pre>
        </div>
      )}
    </div>
  );
}