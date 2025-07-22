import Link from "next/link";
import { GradeBadge } from "@/components/GradeBadge";
import { EvaluationDetails, type EvaluationTab } from "@/components/EvaluationDetails";
import { ExportEvaluationButton } from "@/components/ExportEvaluationButton";

interface EvaluationDetailsPanelProps {
  evaluation: {
    id: string;
    evaluationId?: string;
    documentId: string;
    documentTitle: string;
    agentId: string;
    agentName: string;
    agentVersion?: string;
    evaluationVersion?: number | null;
    grade?: number | null;
    jobStatus?: string;
    createdAt: string | Date;
    summary?: string | null;
    analysis?: string | null;
    selfCritique?: string | null;
    comments?: Array<{
      id: string;
      title: string;
      description: string;
      importance?: number | null;
      grade?: number | null;
    }>;
    job?: {
      llmThinking?: string | null;
      costInCents?: number | null;
      tasks?: Array<{
        id: string;
        name: string;
        modelName: string;
        priceInDollars: number;
        timeInSeconds?: number | null;
        log?: string | null;
        createdAt: Date;
        llmInteractions?: any;
      }>;
    } | null;
    testBatchId?: string | null;
    testBatchName?: string | null;
  };
  activeTab: EvaluationTab;
  setActiveTab: (tab: EvaluationTab) => void;
  statusIcon?: React.ReactNode;
  showAllEvaluationsLink?: boolean;
}

const formatDate = (dateString: string | Date) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export function EvaluationDetailsPanel({
  evaluation,
  activeTab,
  setActiveTab,
  statusIcon,
  showAllEvaluationsLink = true,
}: EvaluationDetailsPanelProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900">Evaluation Details</h2>
            {evaluation.evaluationVersion && (
              <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded text-sm font-medium">
                Eval v{evaluation.evaluationVersion}
              </span>
            )}
            {evaluation.testBatchId && (
              <span className="bg-blue-100 text-blue-800 px-2.5 py-1 rounded text-sm font-medium">
                Batch: {evaluation.testBatchName || evaluation.testBatchId.slice(0, 8)}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-3">
            {evaluation.grade !== null && evaluation.grade !== undefined ? (
              <GradeBadge grade={evaluation.grade} />
            ) : (
              <span className="text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded">
                No Grade Assigned
              </span>
            )}
            {statusIcon && (
              <div className="flex items-center space-x-1">
                {statusIcon}
                <span className="text-sm text-gray-600">{evaluation.jobStatus}</span>
              </div>
            )}
          </div>
        </div>
        {evaluation.agentVersion && (
          <p className="text-sm text-gray-500 mb-2">{evaluation.agentVersion}</p>
        )}

        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="font-medium text-gray-900">Document</dt>
            <dd className="space-y-1">
              <div className="text-blue-600 hover:text-blue-800">
                <Link href={`/docs/${evaluation.documentId}/reader`}>
                  {evaluation.documentTitle}
                </Link>
              </div>
              {showAllEvaluationsLink && (
                <div className="text-xs text-blue-600 hover:text-blue-800">
                  <Link href={`/docs/${evaluation.documentId}/evaluations`}>
                    View All Evaluations →
                  </Link>
                </div>
              )}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-900">Agent</dt>
            <dd className="text-blue-600 hover:text-blue-800">
              <Link href={`/agents/${evaluation.agentId}`}>
                {evaluation.agentName}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-900">Created</dt>
            <dd className="text-gray-600">{formatDate(evaluation.createdAt)}</dd>
          </div>
        </div>
        
        {evaluation.evaluationId && (
          <div className="mt-4 flex gap-2">
            <Link
              href={`/docs/${evaluation.documentId}/evaluations?evaluationId=${evaluation.evaluationId}`}
              className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              View Full Details →
            </Link>
            <ExportEvaluationButton evaluationData={{ evaluation }} />
          </div>
        )}
      </div>

      {/* Tabs and Content */}
      <div className="bg-white shadow rounded-lg">
        <EvaluationDetails
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          summary={evaluation.summary}
          analysis={evaluation.analysis}
          selfCritique={evaluation.selfCritique}
          comments={evaluation.comments}
          job={evaluation.job}
          createdAt={evaluation.createdAt}
        />
      </div>
    </div>
  );
}