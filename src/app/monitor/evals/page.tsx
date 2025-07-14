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
import { EvaluationDetailsPanel } from "@/components/EvaluationDetailsPanel";
import type { EvaluationTab } from "@/components/EvaluationDetails";

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
        llmInteractions: any;
      }>;
      costInCents: number;
      llmThinking: string | null;
    };
  }>;
  jobs: Array<{
    id: string;
    status: string;
    createdAt: string;
    completedAt?: string;
    error?: string;
    costInCents?: number;
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

const formatCost = (costInCents?: number) => {
  if (!costInCents) return "—";
  return `$${(costInCents / 100).toFixed(3)}`;
};

export default function EvaluationsMonitorPage() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);
  const [activeTab, setActiveTab] = useState<EvaluationTab>("analysis");
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
                      {latestJob?.costInCents && (
                        <span>{formatCost(latestJob.costInCents)}</span>
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
            <EvaluationDetailsPanel
              evaluation={{
                id: selectedEvaluation.id,
                documentId: selectedEvaluation.document.id,
                documentTitle: selectedEvaluation.document.versions[0]?.title || 'Unknown Document',
                agentId: selectedEvaluation.agent.id,
                agentName: selectedEvaluation.agent.versions[0]?.name || 'Unknown Agent',
                agentVersion: `${selectedVersion.agentVersion.name} v${selectedVersion.agentVersion.version}`,
                grade: selectedVersion.grade,
                jobStatus: selectedJob?.status,
                createdAt: selectedVersion.createdAt,
                summary: selectedVersion.summary,
                analysis: selectedVersion.analysis,
                selfCritique: selectedVersion.selfCritique,
                comments: selectedVersion.comments,
                job: selectedVersion.job,
              }}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              statusIcon={selectedJob && getStatusIcon(selectedJob.status)}
            />
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