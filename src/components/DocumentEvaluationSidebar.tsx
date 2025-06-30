"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  DocumentTextIcon, 
  BeakerIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  EyeIcon,
  Cog6ToothIcon
} from "@heroicons/react/24/outline";
import { useState } from "react";
import { GradeBadge } from "./GradeBadge";
import { getEvaluationGrade } from "@/lib/type-guards";
import { JobStatusIndicator } from "./JobStatusIndicator";

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
    job?: {
      status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
    } | null;
  }>;
  jobs?: Array<{
    status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  }>;
  grade?: number | null;
}

interface DocumentEvaluationSidebarProps {
  docId: string;
  currentAgentId?: string;
  evaluations: Evaluation[];
  isOwner?: boolean;
}

export function DocumentEvaluationSidebar({ 
  docId, 
  currentAgentId,
  evaluations,
  isOwner = false 
}: DocumentEvaluationSidebarProps) {
  const pathname = usePathname();
  const [isEvaluationsOpen, setIsEvaluationsOpen] = useState(true);
  
  const isDocumentPage = pathname === `/docs/${docId}`;
  const isPreviewPage = pathname === `/docs/${docId}/preview`;
  const isManagePage = pathname === `/docs/${docId}/manage`;
  
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
        
        {/* Preview Link */}
        <Link
          href={`/docs/${docId}/preview`}
          className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors mt-1 ${
            isPreviewPage
              ? 'bg-blue-50 text-gray-900'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <EyeIcon className="h-4 w-4" />
          Preview
        </Link>
        
        {/* Manage Evaluations Link - Only show for owners */}
        {isOwner && (
          <Link
            href={`/docs/${docId}/manage`}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors mt-1 ${
              isManagePage
                ? 'bg-blue-50 text-gray-900'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Cog6ToothIcon className="h-4 w-4" />
            Manage Evals
          </Link>
        )}
        
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
                  const grade = getEvaluationGrade(evaluation);
                  const agentId = evaluation.agentId;
                  const isActive = currentAgentId === agentId;
                  
                  // Get the latest job status - this will be the most recent job
                  // regardless of whether it has a version (completed) or not (pending/running)
                  const latestJobStatus = evaluation.jobs?.[0]?.status;
                  
                  return (
                    <Link
                      key={agentId}
                      href={`/docs/${docId}/evals/${agentId}`}
                      className={`flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-gray-900'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <span className="truncate flex-1">{agentName}</span>
                      <div className="flex items-center gap-2">
                        {isOwner && latestJobStatus && latestJobStatus !== "COMPLETED" && (
                          <JobStatusIndicator status={latestJobStatus} size="sm" />
                        )}
                        <GradeBadge grade={grade} variant="light" size="xs" />
                      </div>
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