"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  DocumentTextIcon, 
  BeakerIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon 
} from "@heroicons/react/24/outline";
import { useState } from "react";

interface Evaluation {
  id?: string;
  agentId: string;
  agent?: {
    name?: string;
    versions?: Array<{
      name: string;
    }>;
  };
  versions?: Array<{
    grade?: number | null;
  }>;
  grade?: number | null;
}

interface DocumentEvaluationSidebarProps {
  docId: string;
  currentEvaluationId?: string;
  evaluations: Evaluation[];
}

export function DocumentEvaluationSidebar({ 
  docId, 
  currentEvaluationId,
  evaluations 
}: DocumentEvaluationSidebarProps) {
  const pathname = usePathname();
  const [isEvaluationsOpen, setIsEvaluationsOpen] = useState(true);
  
  const isDocumentPage = pathname === `/docs/${docId}`;
  
  return (
    <nav className="w-64 flex-shrink-0 bg-white border-r border-gray-200 h-full overflow-y-auto">
      <div className="p-6">
        {/* Document Link */}
        <Link
          href={`/docs/${docId}`}
          className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            isDocumentPage
              ? 'bg-blue-50 text-gray-900'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <DocumentTextIcon className="h-4 w-4" />
          Document
        </Link>
        
        {/* Evaluations Section */}
        <div className="mt-6">
          <button
            onClick={() => setIsEvaluationsOpen(!isEvaluationsOpen)}
            className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          >
            <span className="flex items-center gap-2">
              <BeakerIcon className="h-4 w-4" />
              Evaluations
            </span>
            {isEvaluationsOpen ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <ChevronRightIcon className="h-4 w-4" />
            )}
          </button>
          
          {isEvaluationsOpen && (
            <div className="mt-2 space-y-1">
              {evaluations
                .sort((a, b) => {
                  // Sort by agent name for consistent ordering
                  const nameA = a.agent?.name || a.agent?.versions?.[0]?.name || "";
                  const nameB = b.agent?.name || b.agent?.versions?.[0]?.name || "";
                  return nameA.localeCompare(nameB);
                })
                .map((evaluation) => {
                  const agentName = evaluation.agent?.name || 
                                  evaluation.agent?.versions?.[0]?.name || 
                                  "Unknown Agent";
                  const grade = evaluation.grade ?? evaluation.versions?.[0]?.grade;
                  const evaluationId = evaluation.id || evaluation.agentId;
                  const isActive = currentEvaluationId === evaluationId;
                  
                  return (
                    <Link
                      key={evaluationId}
                      href={`/docs/${docId}/evals/${evaluationId}`}
                      className={`flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-gray-900'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <span className="truncate">{agentName}</span>
                      {grade !== undefined && grade !== null && (
                        <span className={`text-xs font-medium ${
                          grade >= 80 ? 'text-green-600' : 
                          grade >= 60 ? 'text-yellow-600' : 
                          'text-red-600'
                        }`}>
                          {Math.round(grade)}%
                        </span>
                      )}
                    </Link>
                  );
                })}
              
              {evaluations.length === 0 && (
                <p className="px-3 py-2 text-sm text-gray-500">
                  No evaluations yet
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}