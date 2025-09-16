"use client";

import { useState } from "react";

import { FileDown, Microscope } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { UI_LABELS } from "@/constants/ui-labels";
import { getEvaluationGrade } from "@/shared/utils/type-guards";
import {
  BeakerIcon,
  BookOpenIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import type { JobStatus } from "@roast/db";

import { GradeBadge } from "./GradeBadge";
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
      status: JobStatus;
    } | null;
  }>;
  jobs?: Array<{
    status: JobStatus;
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
  isOwner = false,
}: DocumentEvaluationSidebarProps) {
  const pathname = usePathname();
  const [isEvaluationsOpen, setIsEvaluationsOpen] = useState(true);

  const isDocumentPage = pathname === `/docs/${docId}`;
  const isReaderPage = pathname === `/docs/${docId}/reader`;
  const isExportPage = pathname === `/docs/${docId}/export`;

  return (
    <nav className="w-64 flex-shrink-0 overflow-y-auto border-r border-gray-200 bg-white">
      <div className="p-6">
        {/* Eval Editor Header */}
        <div className="mb-6 ml-2 flex cursor-default select-none items-center gap-2 text-sm font-semibold text-gray-500">
          <Microscope className="h-5 w-5 text-gray-400" />
          {UI_LABELS.EVAL_EDITOR.label.toUpperCase()}
        </div>
        {/* Document Link */}
        <Link
          href={`/docs/${docId}`}
          className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            isDocumentPage
              ? "bg-blue-50 text-gray-900"
              : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          }`}
        >
          <DocumentTextIcon className="h-4 w-4" />
          Overview
        </Link>

        {/* Reader View Link */}
        <Link
          href={`/docs/${docId}/reader`}
          className={`mt-1 flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            isReaderPage
              ? "bg-blue-50 text-gray-900"
              : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          }`}
        >
          <BookOpenIcon className="h-4 w-4" />
          Reader View
        </Link>

        {/* Export Link */}
        <Link
          href={`/docs/${docId}/export`}
          className={`mt-1 flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            isExportPage
              ? "bg-blue-50 text-gray-900"
              : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          }`}
        >
          <FileDown className="h-4 w-4" />
          Export
        </Link>

        {/* Evaluations Section */}
        <div className="mt-6">
          <button
            onClick={() => setIsEvaluationsOpen(!isEvaluationsOpen)}
            className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-100"
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
                  const nameA =
                    a.agent?.name || a.agent?.versions?.[0]?.name || "";
                  const nameB =
                    b.agent?.name || b.agent?.versions?.[0]?.name || "";
                  return nameA.localeCompare(nameB);
                })
                .map((evaluation) => {
                  const agentName =
                    evaluation.agent?.name ||
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
                      className={`flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                        isActive
                          ? "bg-blue-50 text-gray-900"
                          : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                    >
                      <span className="flex-1 truncate">{agentName}</span>
                      <div className="flex items-center gap-2">
                        {isOwner &&
                          latestJobStatus &&
                          latestJobStatus !== "COMPLETED" && (
                            <JobStatusIndicator
                              status={latestJobStatus}
                              size="sm"
                            />
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
