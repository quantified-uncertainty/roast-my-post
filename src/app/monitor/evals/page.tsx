"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon, 
  PlayIcon,
  DocumentTextIcon,
  ChatBubbleLeftIcon,
  LightBulbIcon,
  ListBulletIcon
} from "@heroicons/react/24/outline";
import { GradeBadge } from "@/components/GradeBadge";

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
    summary: string;
    analysis: string;
    grade: number;
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
  const [activeTab, setActiveTab] = useState<"analysis" | "comments" | "summary">("analysis");
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
          Last 20 evaluations • Auto-refresh every 30s
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Evaluation List */}
        <div className="col-span-5 bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Recent Evaluations</h2>
          </div>
          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
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
                      {latestVersion && <GradeBadge grade={latestVersion.grade} />}
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
                    <span>{formatDate(evaluation.createdAt)}</span>
                    <div className="flex space-x-2">
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
        <div className="col-span-7">
          {selectedEvaluation && selectedVersion ? (
            <div className="bg-white shadow rounded-lg">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Evaluation Details</h2>
                    <p className="text-sm text-gray-500">
                      {selectedVersion.agentVersion.name} v{selectedVersion.agentVersion.version}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <GradeBadge grade={selectedVersion.grade} />
                    {selectedJob && (
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(selectedJob.status)}
                        <span className="text-sm text-gray-600">{selectedJob.status}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <dt className="font-medium text-gray-900">Document</dt>
                    <dd className="text-blue-600 hover:text-blue-800">
                      <Link href={`/docs/${selectedEvaluation.document.id}`}>
                        {selectedEvaluation.document.versions[0]?.title || 'Unknown Document'}
                      </Link>
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-900">Agent</dt>
                    <dd className="text-gray-600">{selectedEvaluation.agent.versions[0]?.name || 'Unknown Agent'}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-900">Created</dt>
                    <dd className="text-gray-600">{formatDate(selectedVersion.createdAt)}</dd>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8 px-6">
                  {[
                    { id: "analysis", label: "Analysis", icon: DocumentTextIcon },
                    { id: "summary", label: "Summary", icon: ListBulletIcon },
                    { id: "comments", label: `Comments (${selectedVersion.comments.length})`, icon: ChatBubbleLeftIcon },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as typeof activeTab)}
                      className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === tab.id
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <tab.icon
                        className={`-ml-0.5 mr-2 h-5 w-5 ${
                          activeTab === tab.id
                            ? "text-blue-500"
                            : "text-gray-400 group-hover:text-gray-500"
                        }`}
                      />
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6 max-h-96 overflow-y-auto">
                {activeTab === "analysis" && (
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                      {selectedVersion.analysis}
                    </ReactMarkdown>
                  </div>
                )}

                {activeTab === "summary" && (
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                      {selectedVersion.summary}
                    </ReactMarkdown>
                  </div>
                )}

                {activeTab === "comments" && (
                  <div className="space-y-4">
                    {selectedVersion.comments.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        No comments for this evaluation
                      </div>
                    ) : (
                      selectedVersion.comments.map((comment) => (
                        <div key={comment.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900">{comment.title}</h4>
                            <div className="flex items-center space-x-2">
                              {comment.grade && <GradeBadge grade={comment.grade} />}
                              {comment.importance && (
                                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                  Importance: {comment.importance}/10
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="prose prose-sm text-gray-700">
                            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                              {comment.description}
                            </ReactMarkdown>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
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