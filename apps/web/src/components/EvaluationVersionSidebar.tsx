"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/shared/utils/utils";
import { JobStatusIndicator } from "./JobStatusIndicator";
import type { JobStatus } from "@roast/db";

interface Version {
  id: string;
  version: number;
  createdAt: Date;
  summary?: string | null;
  grade?: number | null;
  job?: {
    status: string;
    error?: string | null;
  } | null;
}

interface EvaluationVersionSidebarProps {
  docId: string;
  agentId: string;
  versions: Version[];
  currentVersion: number;
  isOwner?: boolean;
}

export function EvaluationVersionSidebar({
  docId,
  agentId,
  versions,
  currentVersion,
  isOwner = false,
}: EvaluationVersionSidebarProps) {
  return (
    <div className="w-80 border-r border-gray-200 bg-gray-50 overflow-y-auto">
      <div className="px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900 mb-2">Versions</h2>
        
        <div className="space-y-1">
          {versions.map((version) => {
            const isActive = version.version === currentVersion;
            const isFailed = version.job?.status === 'FAILED';
            const jobStatus = version.job?.status as JobStatus | undefined;
            
            return (
              <Link
                key={version.version}
                href={`/docs/${docId}/evals/${agentId}/versions/${version.version}`}
                className={cn(
                  "block px-2 py-1.5 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-white shadow-sm"
                    : "hover:bg-gray-100",
                  isFailed && "opacity-60"
                )}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "font-medium",
                      isActive ? "text-gray-900" : "text-gray-700"
                    )}>
                      V{version.version}
                    </span>
                    {version.version === versions[0].version && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                        Latest
                      </span>
                    )}
                    {isOwner && jobStatus && jobStatus !== "COMPLETED" && (
                      <JobStatusIndicator status={jobStatus} size="sm" />
                    )}
                  </div>
                  
                  <div className="mt-1 text-xs text-gray-500">
                    {formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })}
                  </div>
                </div>
                
                {isFailed && version.job?.error && (
                  <p className="mt-2 text-xs text-red-600 line-clamp-2">
                    {version.job.error}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
        
        {/* Link back to current version */}
        <div className="mt-3 pt-3 border-t border-gray-200">
          <Link
            href={`/docs/${docId}/evals/${agentId}`}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            ← View current version
          </Link>
        </div>
      </div>
    </div>
  );
}