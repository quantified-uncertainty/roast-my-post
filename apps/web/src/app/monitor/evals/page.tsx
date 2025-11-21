"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon, 
  PlayIcon
} from "@heroicons/react/24/outline";
import { GradeBadge } from "@/components/GradeBadge";
import { EvaluationContent } from "@/components/evaluation";
import type { CommentVariant } from "@roast/ai";
interface Evaluation {
  id: string;
  createdAt: string;
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
  versions: Array<{
    id: string;
    version: number | null;
    summary: string;
    analysis: string;
    grade: number;
    selfCritique: string | null;
    createdAt: string;
    agentVersion: {
      name: string;
      version: string;
    };
    comments: Array<{
      id: string;
      title: string;
      description: string;
      importance: number | null;
      grade: number | null;
      header: string | null;
      variant: string | null;
      source: string | null;
      metadata: Record<string, any> | null;
    }>;
    job?: {
      id: string;
      tasks: Array<{
        id: string;
        name: string;
        modelName: string;
        priceInDollars: number;
        timeInSeconds: number | null;
        log: string | null;
        createdAt: Date;
        llmInteractions: Record<string, unknown>;
      }>;
      priceInDollars: number | string;
      llmThinking: string | null;
    };
  }>;
  jobs: Array<{
    id: string;
    status: string;
    createdAt: string;
    completedAt?: string;
    error?: string;
    priceInDollars?: number | string;
    durationInSeconds?: number;
  }>;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "COMPLETED":
      return <CheckCircleIcon className="h-4 w-4 text-green-600" />;
    case "FAILED":
      return <XCircleIcon className="h-4 w-4 text-red-600" />;
    case "RUNNING":
      return <PlayIcon className="h-4 w-4 text-blue-600 animate-pulse" />;
    case "PENDING":
      return <ClockIcon className="h-4 w-4 text-yellow-600" />;
    default:
      return <ClockIcon className="h-4 w-4 text-gray-600" />;
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatCost = (priceInDollars?: number | string) => {
  if (!priceInDollars) return "—";
  const price = typeof priceInDollars === 'string' ? parseFloat(priceInDollars) : priceInDollars;
  return `$${price.toFixed(3)}`;
};

export default function EvaluationsMonitorPage() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvaluations = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/monitor/evaluations");
        if (!response.ok) {
          throw new Error("Failed to fetch evaluations");
        }
        const data = await response.json();
        setEvaluations(data.evaluations);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchEvaluations();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading evaluations...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">Error: {error}</div>
      </div>
    );
  }

  const selectedVersion = selectedEvaluation?.versions?.[0];
  const selectedJob = selectedEvaluation?.jobs?.[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Evaluations Monitor</h1>
        <div className="text-sm text-gray-500">
          Last 20 completed evaluations • Auto-refresh every 30s
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Evaluation List */}
        <div className="col-span-4 bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Recent Completed Evaluations</h2>
          </div>
          <div className="divide-y divide-gray-200 max-h-[calc(100vh-300px)] overflow-y-auto">
            {evaluations.map((evaluation) => {
              const latestVersion = evaluation.versions[0];
              const latestJob = evaluation.jobs[0];
              
              return (
                <div
                  key={evaluation.id}
                  onClick={() => setSelectedEvaluation(evaluation)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedEvaluation?.id === evaluation.id ? "bg-blue-50 border-r-4 border-blue-500" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-sm text-gray-900">
                        {evaluation.id.slice(0, 8)}...
                      </span>
                      {latestVersion && latestVersion.grade !== null ? (
                        <GradeBadge grade={latestVersion.grade} />
                      ) : (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          No Grade
                        </span>
                      )}
                    </div>
                    {latestJob && (
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(latestJob.status)}
                        <span className="text-xs text-gray-500">{latestJob.status}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-1">
                    <div className="font-medium line-clamp-1">{evaluation.document.versions[0]?.title || 'Unknown Document'}</div>
                    <div className="text-xs text-gray-500">Agent: {evaluation.agent.versions[0]?.name || 'Unknown Agent'}</div>
                  </div>
                  
                  {latestVersion && (
                    <div className="text-xs text-gray-500 mb-2 line-clamp-2">
                      {latestVersion.summary}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{latestVersion ? formatDate(latestVersion.createdAt) : formatDate(evaluation.createdAt)}</span>
                    <div className="flex space-x-2">
                      {latestVersion && latestVersion.version && (
                        <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                          v{latestVersion.version}
                        </span>
                      )}
                      {latestVersion && (
                        <span>{latestVersion.comments.length} comments</span>
                      )}
                      {latestJob?.priceInDollars && (
                        <span>{formatCost(latestJob.priceInDollars)}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Evaluation Details */}
        <div className="col-span-8">
          {selectedEvaluation && selectedVersion ? (
            <div className="bg-white shadow rounded-lg p-6">
              {/* Header with context */}
              <div className="mb-6 border-b pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {selectedEvaluation.document.versions[0]?.title || 'Unknown Document'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {selectedVersion.agentVersion.name} v{selectedVersion.agentVersion.version} • {formatDate(selectedVersion.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {selectedJob && getStatusIcon(selectedJob.status)}
                    <span className="text-sm text-gray-600">{selectedJob?.status}</span>
                    <Link
                      href={`/docs/${selectedEvaluation.document.id}/evals/${selectedEvaluation.agent.id}`}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      View Full Details →
                    </Link>
                  </div>
                </div>
              </div>
              
              {/* Use new EvaluationContent component */}
              <EvaluationContent
                summary={selectedVersion.summary}
                analysis={selectedVersion.analysis}
                thinking={selectedVersion.job?.llmThinking ?? undefined}
                selfCritique={selectedVersion.selfCritique ?? undefined}
                comments={selectedVersion.comments.map((comment, _index) => ({
                  id: comment.id,
                  description: comment.description,
                  importance: comment.importance ?? null,
                  grade: comment.grade ?? null,
                  evaluationVersionId: selectedVersion.id,
                  highlightId: comment.id,
                  header: comment.header ?? null,
                  variant: comment.variant as CommentVariant | null,
                  source: comment.source ?? null,
                  metadata: comment.metadata ?? null,
                  highlight: {
                    id: comment.id,
                    startOffset: 0,
                    endOffset: 0,
                    quotedText: comment.title,
                    prefix: null,
                    error: null,
                    isValid: true
                  }
                }))}
                agentName={selectedEvaluation.agent.versions[0]?.name || 'Unknown Agent'}
                agentDescription={undefined}
                grade={selectedVersion.grade}
                ephemeralBatch={null}
costInCents={selectedVersion.job?.priceInDollars ? parseFloat(String(selectedVersion.job.priceInDollars)) * 100 : undefined}
                durationInSeconds={null}
                createdAt={selectedVersion.createdAt}
                isStale={false}
                showNavigation={false}
                compact={true}
                maxWidth="full"
              />
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg p-6 text-center">
              <div className="text-gray-500">Select an evaluation to view details</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}