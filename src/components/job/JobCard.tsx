import Link from "next/link";
import { JobStatusBadge, JobStatusIcon } from "./JobStatusBadge";
import { formatCost, formatDuration, formatRelativeDate } from "@/lib/job/formatters";
import { JobData } from "@/lib/job/types";
import { getDocumentInfo, getAgentInfo, getBatchInfo, getRetryText } from "@/lib/job/transformers";

interface JobCardProps {
  job: JobData;
  onClick?: () => void;
  isSelected?: boolean;
  showDocument?: boolean;
  showAgent?: boolean;
  showBatch?: boolean;
  compact?: boolean;
}

export function JobCard({ 
  job, 
  onClick, 
  isSelected = false, 
  showDocument = true, 
  showAgent = true, 
  showBatch = false,
  compact = false 
}: JobCardProps) {
  const documentInfo = getDocumentInfo(job);
  const agentInfo = getAgentInfo(job);
  const batchInfo = getBatchInfo(job);
  const retryText = getRetryText(job);

  return (
    <div
      onClick={onClick}
      className={`rounded-lg border border-gray-200 bg-white p-4 shadow-sm ${
        onClick ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''
      } ${isSelected ? 'bg-blue-50 border-blue-500 border-r-4' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-gray-900">
              {showDocument && documentInfo.title}
              {!showDocument && `Job ${job.id.slice(0, 8)}`}
            </h4>
            {retryText && (
              <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                {retryText}
              </span>
            )}
          </div>
          
          <div className="text-sm text-gray-500 space-y-1">
            {showAgent && (
              <div>
                Agent: {agentInfo.name}
                {agentInfo.id && (
                  <Link 
                    href={`/agents/${agentInfo.id}`}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                    onClick={(e) => e.stopPropagation()}
                  >
                    →
                  </Link>
                )}
              </div>
            )}
            
            {showDocument && documentInfo.id && (
              <div>
                <Link 
                  href={`/docs/${documentInfo.id}`}
                  className="text-blue-600 hover:text-blue-800 text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  View Document →
                </Link>
              </div>
            )}
            
            {showBatch && batchInfo && (
              <div className="text-blue-600">
                Batch: {batchInfo.name}
              </div>
            )}
            
            {!compact && (
              <div>
                Created {formatRelativeDate(job.createdAt)}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 ml-4">
          <JobStatusIcon status={job.status} />
          <JobStatusBadge status={job.status} />
        </div>
      </div>
      
      {!compact && (
        <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
          <span>{formatDuration(job.durationInSeconds)}</span>
          <span>{formatCost(job.costInCents)}</span>
        </div>
      )}
    </div>
  );
}