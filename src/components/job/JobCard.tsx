import Link from "next/link";
import { JobStatusBadge, JobStatusIcon } from "./JobStatusBadge";
import { formatCost, formatDuration, formatRelativeDate } from "@/lib/job/formatters";

interface JobCardProps {
  job: {
    id: string;
    status: string;
    createdAt: string | Date;
    durationInSeconds?: number | null;
    costInCents?: number | null;
    attempts?: number;
    originalJobId?: string | null;
    evaluation?: {
      document: {
        id: string;
        versions: Array<{
          title: string;
        }>;
      };
      agent: {
        id: string;
        versions: Array<{
          name: string;
        }>;
      };
    };
    document?: {
      id: string;
      title: string;
    };
    agent?: {
      id: string;
      name: string;
    };
    batch?: {
      id: string;
      name?: string;
    };
  };
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
  const documentTitle = job.evaluation?.document.versions[0]?.title || job.document?.title || 'Unknown Document';
  const agentName = job.evaluation?.agent.versions[0]?.name || job.agent?.name || 'Unknown Agent';
  const documentId = job.evaluation?.document.id || job.document?.id;
  const agentId = job.evaluation?.agent.id || job.agent?.id;

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
              {showDocument && documentTitle}
              {!showDocument && `Job ${job.id.slice(0, 8)}`}
            </h4>
            {job.originalJobId && (
              <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                retry #{(job.attempts || 0) + 1}
              </span>
            )}
          </div>
          
          <div className="text-sm text-gray-500 space-y-1">
            {showAgent && (
              <div>
                Agent: {agentName}
                {agentId && (
                  <Link 
                    href={`/agents/${agentId}`}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                    onClick={(e) => e.stopPropagation()}
                  >
                    →
                  </Link>
                )}
              </div>
            )}
            
            {showDocument && documentId && (
              <div>
                <Link 
                  href={`/docs/${documentId}`}
                  className="text-blue-600 hover:text-blue-800 text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  View Document →
                </Link>
              </div>
            )}
            
            {showBatch && job.batch && (
              <div className="text-blue-600">
                Batch: {job.batch.name || `#${job.batch.id.slice(0, 8)}`}
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