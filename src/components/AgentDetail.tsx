"use client";

import {
  useEffect,
  useState,
  useRef,
} from "react";

import {
  Clock,
  Pencil,
  User,
  FileText,
  Download,
  ChevronDown,
  Upload,
  BarChart3,
  FileDown,
  Play,
} from "lucide-react";
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon, 
  PlayIcon 
} from "@heroicons/react/24/outline";
import * as yaml from 'js-yaml';
import Link from "next/link";

import { Button } from "@/components/Button";
import type { Agent } from "@/types/agentSchema";
import { AGENT_TYPE_INFO } from "@/types/agentTypes";
import type { AgentReview } from "@/types/evaluationSchema";
import { JobDetails } from "@/app/docs/[docId]/evaluations/components/JobDetails";

interface AgentDetailProps {
  agent: Agent;
  isOwner?: boolean;
}

interface AgentDocument {
  id: string;
  title: string;
  author: string;
  publishedDate: string;
  evaluationId: string;
  evaluationCreatedAt: string;
  summary?: string;
  analysis?: string;
  grade?: number;
  jobStatus?: string;
  jobCreatedAt?: string;
  jobCompletedAt?: string;
  costInCents?: number;
}

interface AgentEvaluation {
  id: string;
  evaluationId: string;
  documentId: string;
  documentTitle: string;
  documentAuthor: string;
  agentVersion: number;
  agentVersionName?: string;
  summary?: string;
  analysis?: string;
  grade?: number;
  selfCritique?: string;
  createdAt: string;
  jobStatus?: string;
  jobCreatedAt?: string;
  jobCompletedAt?: string;
  costInCents?: number;
}

interface BatchSummary {
  id: string;
  name: string | null;
  targetCount: number;
  createdAt: string;
  progress: number;
  completedCount: number;
  runningCount: number;
  failedCount: number;
  pendingCount: number;
  totalCost: number;
  avgDuration: number;
  avgGrade: number | null;
  isComplete: boolean;
}

export default function AgentDetail({
  agent,
  isOwner = false,
}: AgentDetailProps) {
  const [activeTab, setActiveTab] = useState<"details" | "documents" | "evals" | "jobs" | "test" | "batches" | "export">("details");
  const [review, setReview] = useState<AgentReview | null>(null);
  const [documents, setDocuments] = useState<AgentDocument[]>([]);
  const [evaluations, setEvaluations] = useState<AgentEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [evalsLoading, setEvalsLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [exportType, setExportType] = useState<'JSON' | 'Markdown' | 'YAML'>('JSON');
  const [testLoading, setTestLoading] = useState(false);
  const [testSuccess, setTestSuccess] = useState<string | null>(null);
  const [batches, setBatches] = useState<BatchSummary[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchReview() {
      try {
        const response = await fetch(`/api/agents/${agent.id}/review`);
        const data = await response.json();
        if (data.review) {
          setReview({
            ...data.review,
            createdAt: new Date(data.review.createdAt),
          });
        }
      } catch (error) {
        console.error("Error fetching agent review:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchReview();
  }, [agent.id]);

  const fetchDocuments = async () => {
    if (documents.length > 0) return; // Already loaded
    
    setDocumentsLoading(true);
    try {
      const response = await fetch(`/api/agents/${agent.id}/documents`);
      const data = await response.json();
      if (data.documents) {
        setDocuments(data.documents);
      }
    } catch (error) {
      console.error("Error fetching agent documents:", error);
    } finally {
      setDocumentsLoading(false);
    }
  };

  const fetchEvaluations = async () => {
    if (evaluations.length > 0) return; // Already loaded
    
    setEvalsLoading(true);
    try {
      const response = await fetch(`/api/agents/${agent.id}/evaluations`);
      const data = await response.json();
      if (data.evaluations) {
        setEvaluations(data.evaluations);
      }
    } catch (error) {
      console.error("Error fetching agent evaluations:", error);
    } finally {
      setEvalsLoading(false);
    }
  };

  const fetchBatches = async () => {
    if (batches.length > 0) return; // Already loaded
    
    setBatchesLoading(true);
    try {
      const response = await fetch(`/api/agents/${agent.id}/batches`);
      const data = await response.json();
      if (data.batches) {
        setBatches(data.batches);
      }
    } catch (error) {
      console.error("Error fetching batches:", error);
    } finally {
      setBatchesLoading(false);
    }
  };

  const fetchJobs = async (batchId?: string) => {
    setJobsLoading(true);
    try {
      const url = batchId 
        ? `/api/agents/${agent.id}/jobs?batchId=${batchId}`
        : `/api/agents/${agent.id}/jobs`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.jobs) {
        setJobs(data.jobs);
      }
    } catch (error) {
      console.error("Error fetching jobs:", error);
    } finally {
      setJobsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "documents") {
      fetchDocuments();
    } else if (activeTab === "evals") {
      fetchEvaluations();
    } else if (activeTab === "jobs") {
      fetchJobs(selectedBatchFilter || undefined);
    } else if (activeTab === "batches") {
      fetchBatches();
    }
  }, [activeTab, selectedBatchFilter]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setExportDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    
    const statusMap = {
      COMPLETED: "bg-green-100 text-green-800",
      RUNNING: "bg-yellow-100 text-yellow-800", 
      PENDING: "bg-blue-100 text-blue-800",
      FAILED: "bg-red-100 text-red-800",
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusMap[status as keyof typeof statusMap] || "bg-gray-100 text-gray-800"}`}>
        {status}
      </span>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case "FAILED":
        return <XCircleIcon className="h-5 w-5 text-red-600" />;
      case "RUNNING":
        return <PlayIcon className="h-5 w-5 text-blue-600 animate-pulse" />;
      case "PENDING":
        return <ClockIcon className="h-5 w-5 text-yellow-600" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  const formatDuration = (durationInSeconds?: number | null) => {
    if (!durationInSeconds) return "—";
    const minutes = Math.floor(durationInSeconds / 60);
    const seconds = durationInSeconds % 60;
    return `${minutes}m ${seconds}s`;
  };

  const formatCost = (costInCents?: number | null) => {
    if (!costInCents) return "—";
    return `$${(costInCents / 100).toFixed(3)}`;
  };

  const exportAgentAsJson = async () => {
    const agentData = {
      id: agent.id,
      name: agent.name,
      purpose: agent.purpose,
      version: agent.version,
      description: agent.description,
      genericInstructions: agent.genericInstructions,
      summaryInstructions: agent.summaryInstructions,
      analysisInstructions: agent.analysisInstructions,
      commentInstructions: agent.commentInstructions,
      gradeInstructions: agent.gradeInstructions,
      selfCritiqueInstructions: agent.selfCritiqueInstructions,
      extendedCapabilityId: agent.extendedCapabilityId,
      owner: agent.owner,
      exportedAt: new Date().toISOString(),
    };

    const jsonString = JSON.stringify(agentData, null, 2);
    
    try {
      await navigator.clipboard.writeText(jsonString);
      setExportType('JSON');
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
    
    setExportDropdownOpen(false);
  };

  const exportAgentAsMarkdown = async () => {
    const exportDate = new Date().toISOString();
    const agentTypeInfo = AGENT_TYPE_INFO[agent.purpose];
    
    let markdown = `---
id: ${agent.id}
name: "${agent.name}"
type: ${agent.purpose}
version: ${agent.version}
owner: ${agent.owner?.name || 'Unknown'}
created: ${exportDate}
extended_capability: ${agent.extendedCapabilityId || 'none'}
---

# ${agent.name}

**Type:** ${agentTypeInfo.individualTitle}  
**Version:** ${agent.version}  
**Owner:** ${agent.owner?.name || 'Unknown'}`;

    if (agent.extendedCapabilityId) {
      markdown += `  
**Extended Capability:** ${agent.extendedCapabilityId}`;
    }

    markdown += `

## Description

${agent.description}`;

    if (agent.genericInstructions) {
      markdown += `

## Primary Instructions

${agent.genericInstructions}`;
    }

    if (agent.summaryInstructions) {
      markdown += `

## Summary Instructions

${agent.summaryInstructions}`;
    }

    if (agent.commentInstructions) {
      markdown += `

## Comment Instructions

${agent.commentInstructions}`;
    }

    if (agent.gradeInstructions) {
      markdown += `

## Grade Instructions

${agent.gradeInstructions}`;
    }

    if (agent.analysisInstructions) {
      markdown += `

## Analysis Instructions

${agent.analysisInstructions}`;
    }

    if (agent.selfCritiqueInstructions) {
      markdown += `

## Self-Critique Instructions

${agent.selfCritiqueInstructions}`;
    }

    markdown += `

---
*Exported from RoastMyPost on ${new Date(exportDate).toLocaleString()}*`;
    
    try {
      await navigator.clipboard.writeText(markdown);
      setExportType('Markdown');
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
    
    setExportDropdownOpen(false);
  };

  const exportAgentAsYaml = async () => {
    const agentData = {
      id: agent.id,
      name: agent.name,
      purpose: agent.purpose,
      version: agent.version,
      description: agent.description,
      genericInstructions: agent.genericInstructions,
      summaryInstructions: agent.summaryInstructions,
      analysisInstructions: agent.analysisInstructions,
      commentInstructions: agent.commentInstructions,
      gradeInstructions: agent.gradeInstructions,
      selfCritiqueInstructions: agent.selfCritiqueInstructions,
      extendedCapabilityId: agent.extendedCapabilityId,
      owner: {
        id: agent.owner?.id,
        name: agent.owner?.name,
      },
      exportedAt: new Date().toISOString(),
    };

    // Remove null/undefined values to clean up the YAML
    const cleanData = Object.fromEntries(
      Object.entries(agentData).filter(([_, value]) => value !== null && value !== undefined)
    );

    try {
      const yamlString = yaml.dump(cleanData, {
        indent: 2,
        lineWidth: 80,
        noRefs: true,
      });
      
      await navigator.clipboard.writeText(yamlString);
      setExportType('YAML');
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
    
    setExportDropdownOpen(false);
  };


  return (
    <div className={activeTab === "jobs" ? "w-full px-4 sm:px-6 lg:px-8 py-8" : "mx-auto max-w-6xl p-8"}>
      {/* Success Notification */}
      {copySuccess && (
        <div className="fixed top-4 right-4 rounded-md bg-green-50 p-4 shadow-lg z-50">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">
                Agent {exportType} copied to clipboard!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold transition-colors group-hover:text-blue-600">
            {agent.name}
          </h2>
          <p className="text-sm text-gray-500">
            {AGENT_TYPE_INFO[agent.purpose].individualTitle} v{agent.version}
            {agent.owner && (
              <>
                {" • "}
                <Link
                  href={`/users/${agent.owner.id}`}
                  className="text-blue-500 hover:text-blue-700"
                >
                  {agent.owner.name || "View Owner"}
                </Link>
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Export Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <Button
              variant="secondary"
              onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export
              <ChevronDown className="h-4 w-4" />
            </Button>
            
            {exportDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 z-10">
                <button
                  onClick={exportAgentAsJson}
                  className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                >
                  JSON
                </button>
                <button
                  onClick={exportAgentAsMarkdown}
                  className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                >
                  Markdown
                </button>
                <button
                  onClick={exportAgentAsYaml}
                  className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                >
                  YAML
                </button>
              </div>
            )}
          </div>

          <Link href={`/agents/${agent.id}/versions`}>
            <Button variant="secondary" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Version History
            </Button>
          </Link>
          {isOwner && (
            <>
              <Link href={`/agents/${agent.id}/import-yaml`}>
                <Button variant="secondary" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Import
                </Button>
              </Link>
              <Link href={`/agents/${agent.id}/edit`}>
                <Button variant="secondary" className="flex items-center gap-2">
                  <Pencil className="h-4 w-4" />
                  Edit Agent
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("details")}
            className={`inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === "details"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            <User className="mr-2 h-5 w-5" />
            Details
          </button>
          <button
            onClick={() => setActiveTab("documents")}
            className={`inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === "documents"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            <FileText className="mr-2 h-5 w-5" />
            Documents
          </button>
          <button
            onClick={() => setActiveTab("evals")}
            className={`inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === "evals"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            <BarChart3 className="mr-2 h-5 w-5" />
            Evals
          </button>
          <button
            onClick={() => {
              setActiveTab("jobs");
              setSelectedBatchFilter(null); // Clear any batch filter when switching to jobs tab
            }}
            className={`inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === "jobs"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            <Clock className="mr-2 h-5 w-5" />
            Jobs
          </button>
          {isOwner && (
            <>
              <button
                onClick={() => setActiveTab("test")}
                className={`inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium ${
                  activeTab === "test"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                <Play className="mr-2 h-5 w-5" />
                Test
              </button>
              <button
                onClick={() => setActiveTab("batches")}
                className={`inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium ${
                  activeTab === "batches"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                <BarChart3 className="mr-2 h-5 w-5" />
                Batch Tests
              </button>
            </>
          )}
          <button
            onClick={() => setActiveTab("export")}
            className={`inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === "export"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            <FileDown className="mr-2 h-5 w-5" />
            Export
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-8">
        {activeTab === "details" && (
          <div className="space-y-8">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-semibold">Description</h2>
              <div className="whitespace-pre-wrap">{agent.description}</div>
            </div>

            {agent.extendedCapabilityId && (
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-xl font-semibold">Extended Capability</h2>
                <div className="text-gray-700">{agent.extendedCapabilityId}</div>
              </div>
            )}

            {agent.genericInstructions && (
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-xl font-semibold">Primary Instructions</h2>
                <div className="whitespace-pre-wrap">{agent.genericInstructions}</div>
              </div>
            )}

            {agent.summaryInstructions && (
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-xl font-semibold">Summary Instructions</h2>
                <div className="whitespace-pre-wrap">{agent.summaryInstructions}</div>
              </div>
            )}

            {agent.analysisInstructions && (
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-xl font-semibold">Analysis Instructions</h2>
                <div className="whitespace-pre-wrap">{agent.analysisInstructions}</div>
              </div>
            )}

            {agent.commentInstructions && (
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-xl font-semibold">Comment Instructions</h2>
                <div className="whitespace-pre-wrap">{agent.commentInstructions}</div>
              </div>
            )}

            {agent.gradeInstructions && (
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-xl font-semibold">Grade Instructions</h2>
                <div className="whitespace-pre-wrap">{agent.gradeInstructions}</div>
              </div>
            )}

            {agent.selfCritiqueInstructions && (
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-xl font-semibold">Self-Critique Instructions</h2>
                <div className="whitespace-pre-wrap">{agent.selfCritiqueInstructions}</div>
              </div>
            )}
          </div>
        )}

        {activeTab === "documents" && (
          <div className="space-y-6">
            {documentsLoading ? (
              <div className="text-center py-8">
                <div className="text-gray-500">Loading documents...</div>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-500">No documents have been evaluated by this agent yet.</div>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Recent Evaluations ({documents.length})
                </h3>
                <div className="space-y-4">
                  {documents.map((doc) => (
                    <div
                      key={doc.evaluationId}
                      className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="text-lg font-medium text-gray-900">
                                <Link 
                                  href={`/docs/${doc.id}/evaluations`}
                                  className="hover:text-blue-600 transition-colors"
                                >
                                  {doc.title}
                                </Link>
                              </h4>
                              <p className="text-sm text-gray-500">
                                By {doc.author} • Published {formatDate(doc.publishedDate)}
                              </p>
                              <p className="text-sm text-gray-500">
                                Evaluated {formatDate(doc.evaluationCreatedAt)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {doc.grade !== undefined && agent.gradeInstructions && (
                                <div className="text-right">
                                  <div className="text-lg font-semibold text-gray-900">
                                    {doc.grade}/100
                                  </div>
                                  <div className="text-xs text-gray-500">Grade</div>
                                </div>
                              )}
                              {getStatusBadge(doc.jobStatus)}
                            </div>
                          </div>
                          
                          {doc.summary && (
                            <div className="mt-3">
                              <p className="text-sm text-gray-700 line-clamp-3">
                                {doc.summary}
                              </p>
                            </div>
                          )}
                          
                          <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                            {doc.costInCents && (
                              <span>Cost: ${(doc.costInCents / 100).toFixed(2)}</span>
                            )}
                            {doc.jobCompletedAt && (
                              <span>Completed: {formatDate(doc.jobCompletedAt)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "evals" && (
          <div className="space-y-6">
            {evalsLoading ? (
              <div className="text-center py-8">
                <div className="text-gray-500">Loading evaluations...</div>
              </div>
            ) : evaluations.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-500">No evaluations have been performed by this agent yet.</div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedVersion
                      ? `Evaluations - Version ${selectedVersion}`
                      : "All Evaluations"}
                    {" "}
                    ({selectedVersion
                      ? evaluations.filter(e => e.agentVersion === selectedVersion).length
                      : evaluations.length
                    })
                  </h3>
                  <div className="flex items-center gap-2">
                    <label htmlFor="version-filter" className="text-sm font-medium text-gray-700">
                      Filter by version:
                    </label>
                    <select
                      id="version-filter"
                      value={selectedVersion || ""}
                      onChange={(e) => setSelectedVersion(e.target.value ? Number(e.target.value) : null)}
                      className="rounded-md border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">All versions</option>
                      {Array.from({ length: Number(agent.version) }, (_, i) => i + 1)
                        .reverse()
                        .map((version) => (
                          <option key={version} value={version}>
                            v{version}
                            {version === Number(agent.version) && " (current)"}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-4">
                  {evaluations
                    .filter(evalItem => selectedVersion === null || evalItem.agentVersion === selectedVersion)
                    .map((evalItem) => (
                    <div
                      key={evalItem.id}
                      className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <Link
                              href={`/docs/${evalItem.documentId}`}
                              className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                            >
                              {evalItem.documentTitle}
                            </Link>
                            <p className="text-sm text-gray-600 mt-1">
                              by {evalItem.documentAuthor}
                            </p>
                            <div className="flex items-center gap-4 mt-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                evalItem.agentVersion === Number(agent.version)
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}>
                                v{evalItem.agentVersion}
                                {evalItem.agentVersionName && ` - ${evalItem.agentVersionName}`}
                              </span>
                              <p className="text-sm text-gray-500">
                                {formatDate(evalItem.createdAt)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {evalItem.grade !== undefined && agent.gradeInstructions && (
                              <div className="text-right">
                                <div className="text-lg font-semibold text-gray-900">
                                  {evalItem.grade}/100
                                </div>
                                <div className="text-xs text-gray-500">Grade</div>
                              </div>
                            )}
                            {getStatusBadge(evalItem.jobStatus)}
                          </div>
                        </div>
                        
                        {evalItem.summary && (
                          <div className="mt-3">
                            <p className="text-sm text-gray-700 line-clamp-3">
                              {evalItem.summary}
                            </p>
                          </div>
                        )}

                        {evalItem.selfCritique && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-md">
                            <p className="text-xs font-medium text-gray-600 mb-1">Self-Critique:</p>
                            <p className="text-sm text-gray-700 line-clamp-2">
                              {evalItem.selfCritique}
                            </p>
                          </div>
                        )}
                        
                        <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                          {evalItem.costInCents && (
                            <span>Cost: ${(evalItem.costInCents / 100).toFixed(2)}</span>
                          )}
                          {evalItem.jobCompletedAt && (
                            <span>Duration: {
                              Math.round((new Date(evalItem.jobCompletedAt).getTime() - 
                                          new Date(evalItem.jobCreatedAt || evalItem.createdAt).getTime()) / 1000)
                            }s</span>
                          )}
                          <Link
                            href={`/docs/${evalItem.documentId}/evaluations?evaluationId=${evalItem.evaluationId}`}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            View Details →
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "jobs" && (
          <div className="w-full space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Agent Jobs {selectedBatchFilter ? `(Batch: ${batches.find(b => b.id === selectedBatchFilter)?.name || selectedBatchFilter.slice(0, 8)})` : ''}
              </h3>
              <div className="flex items-center gap-4">
                {selectedBatchFilter && (
                  <button
                    onClick={() => setSelectedBatchFilter(null)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Clear batch filter
                  </button>
                )}
                <div className="text-sm text-gray-500">
                  {jobs.length} jobs shown
                </div>
              </div>
            </div>
            
            {jobsLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-lg text-gray-600">Loading jobs...</div>
              </div>
            ) : jobs.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-lg text-gray-600">
                  {selectedBatchFilter ? 'No jobs found for this batch.' : 'No jobs found for this agent.'}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-12 gap-6">
                {/* Job List */}
                <div className="col-span-4 bg-white shadow rounded-lg">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-medium text-gray-900">Recent Jobs</h2>
                  </div>
                  <div className="divide-y divide-gray-200 max-h-[calc(100vh-300px)] overflow-y-auto">
                    {jobs.map((job) => (
                      <div
                        key={job.id}
                        onClick={() => setSelectedJob(job)}
                        className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                          selectedJob?.id === job.id ? "bg-blue-50 border-r-4 border-blue-500" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(job.status)}
                            <span className="font-mono text-sm text-gray-900">
                              {job.id.slice(0, 8)}...
                            </span>
                          </div>
                          {getStatusBadge(job.status)}
                        </div>
                        
                        <div className="text-sm text-gray-600 mb-1">
                          <div className="font-medium">{job.document.title}</div>
                          <div className="text-xs">Agent: {job.agent.name}</div>
                          {job.batch && (
                            <div className="text-xs text-blue-600">
                              Batch: {job.batch.name || `#${job.batch.id.slice(0, 8)}`}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{formatDate(job.createdAt)}</span>
                          <div className="flex space-x-3">
                            <span>{formatDuration(job.durationInSeconds)}</span>
                            <span>{formatCost(job.costInCents)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Job Details */}
                <div className="col-span-8">
                  {selectedJob ? (
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="bg-white shadow rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-xl font-bold text-gray-900">Job Details</h2>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(selectedJob.status)}
                            {getStatusBadge(selectedJob.status)}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <dt className="font-medium text-gray-900">Job ID</dt>
                            <dd className="font-mono text-gray-600">{selectedJob.id}</dd>
                          </div>
                          <div>
                            <dt className="font-medium text-gray-900">Document</dt>
                            <dd className="space-y-1">
                              <div className="text-blue-600 hover:text-blue-800">
                                <Link href={`/docs/${selectedJob.document.id}`}>
                                  {selectedJob.document.title}
                                </Link>
                              </div>
                              <div className="text-xs text-blue-600 hover:text-blue-800">
                                <Link href={`/docs/${selectedJob.document.id}/evaluations`}>
                                  View Evaluations →
                                </Link>
                              </div>
                            </dd>
                          </div>
                          <div>
                            <dt className="font-medium text-gray-900">Agent</dt>
                            <dd className="text-blue-600 hover:text-blue-800">
                              <Link href={`/agents/${selectedJob.agent.id}`}>
                                {selectedJob.agent.name}
                              </Link>
                            </dd>
                          </div>
                          {selectedJob.batch && (
                            <div>
                              <dt className="font-medium text-gray-900">Batch</dt>
                              <dd>
                                <button
                                  onClick={() => {
                                    setSelectedBatchFilter(selectedJob.batch.id);
                                    fetchJobs(selectedJob.batch.id);
                                  }}
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  {selectedJob.batch.name || `Batch #${selectedJob.batch.id.slice(0, 8)}`}
                                </button>
                              </dd>
                            </div>
                          )}
                          <div>
                            <dt className="font-medium text-gray-900">Created</dt>
                            <dd className="text-gray-600">{formatDate(selectedJob.createdAt)}</dd>
                          </div>
                          {selectedJob.completedAt && (
                            <div>
                              <dt className="font-medium text-gray-900">Completed</dt>
                              <dd className="text-gray-600">{formatDate(selectedJob.completedAt)}</dd>
                            </div>
                          )}
                          {selectedJob.durationInSeconds && (
                            <div>
                              <dt className="font-medium text-gray-900">Duration</dt>
                              <dd className="text-gray-600">{formatDuration(selectedJob.durationInSeconds)}</dd>
                            </div>
                          )}
                          {selectedJob.costInCents && (
                            <div>
                              <dt className="font-medium text-gray-900">Cost</dt>
                              <dd className="text-gray-600">{formatCost(selectedJob.costInCents)}</dd>
                            </div>
                          )}
                        </div>
                        
                        {selectedJob.error && (
                          <div className="mt-4 p-4 bg-red-50 rounded-lg">
                            <h3 className="text-sm font-medium text-red-800 mb-2">Error</h3>
                            <p className="text-sm text-red-700 whitespace-pre-wrap">{selectedJob.error}</p>
                          </div>
                        )}
                      </div>

                      {/* Job Details Component */}
                      <JobDetails job={selectedJob} />
                    </div>
                  ) : (
                    <div className="bg-white shadow rounded-lg p-6">
                      <div className="text-center text-gray-500">
                        Select a job from the list to view details
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "test" && isOwner && (
          <div className="space-y-6">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Test Agent Performance
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Run evaluation tests to benchmark your agent's performance. This will create new evaluations 
                on documents that have been previously evaluated by this agent.
              </p>
              
              {testSuccess && (
                <div className="mb-6 rounded-md bg-green-50 p-4">
                  <div className="flex">
                    <div className="ml-3">
                      <p className="text-sm text-green-800">{testSuccess}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setTestLoading(true);
                  setTestSuccess(null);
                  
                  try {
                    const formData = new FormData(e.currentTarget);
                    const targetCount = parseInt(formData.get('targetCount') as string, 10);
                    const name = formData.get('name') as string;
                    
                    const response = await fetch(`/api/agents/${agent.id}/eval-batch`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        name: name || undefined,
                        targetCount,
                      }),
                    });
                    
                    if (!response.ok) {
                      const error = await response.json();
                      throw new Error(error.error || 'Failed to create test batch');
                    }
                    
                    const result = await response.json();
                    setTestSuccess(`${result.message} Switch to the Jobs tab to monitor progress.`);
                    
                    // Reset form
                    (e.target as HTMLFormElement).reset();
                    
                    // Refresh batches list if we're on that tab
                    if (activeTab === "batches") {
                      setBatches([]);
                      fetchBatches();
                    }
                    
                  } catch (error) {
                    console.error('Test creation failed:', error);
                    setTestSuccess(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                  } finally {
                    setTestLoading(false);
                  }
                }}
                className="space-y-6"
              >
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Test Name (Optional)
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    placeholder="e.g., Agent v2.1 benchmark"
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Optional name to identify this test run
                  </p>
                </div>

                <div>
                  <label htmlFor="targetCount" className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Evaluations
                  </label>
                  <select
                    id="targetCount"
                    name="targetCount"
                    required
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select number of tests...</option>
                    <option value="5">5 evaluations (Quick test)</option>
                    <option value="10">10 evaluations (Standard test)</option>
                    <option value="20">20 evaluations (Comprehensive test)</option>
                    <option value="50">50 evaluations (Extensive benchmark)</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Documents will be randomly selected from those previously evaluated by this agent
                  </p>
                </div>
                
                <div className="rounded-md bg-blue-50 p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">What happens next:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Jobs will be queued for parallel processing</li>
                    <li>• You can monitor progress in the system monitor</li>
                    <li>• Results will appear in the evaluations list</li>
                    <li>• Costs will be tracked and reported</li>
                  </ul>
                </div>
                
                <div className="flex justify-end gap-3">
                  <Button type="submit" disabled={testLoading} className="flex items-center gap-2">
                    <Play className="h-4 w-4" />
                    {testLoading ? 'Creating Tests...' : 'Start Test Run'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === "batches" && isOwner && (
          <div className="space-y-6">
            {batchesLoading ? (
              <div className="text-center py-8">
                <div className="text-gray-500">Loading batch tests...</div>
              </div>
            ) : batches.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-500">No test batches created yet.</div>
                <p className="text-sm text-gray-400 mt-2">Use the Test tab to create your first batch test.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Recent Test Batches ({batches.length})
                </h3>
                <div className="grid gap-4">
                  {batches.map((batch) => (
                    <div
                      key={batch.id}
                      className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="text-lg font-medium text-gray-900">
                                {batch.name || `Test Batch #${batch.id.slice(0, 8)}`}
                              </h4>
                              <p className="text-sm text-gray-500">
                                Created {formatDate(batch.createdAt)} • Target: {batch.targetCount} evaluations
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {batch.isComplete ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Complete
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {batch.progress}% Complete
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                            <div className="text-center">
                              <div className="text-lg font-semibold text-green-600">{batch.completedCount}</div>
                              <div className="text-xs text-gray-500">Completed</div>
                            </div>
                            {batch.runningCount > 0 && (
                              <div className="text-center">
                                <div className="text-lg font-semibold text-blue-600">{batch.runningCount}</div>
                                <div className="text-xs text-gray-500">Running</div>
                              </div>
                            )}
                            {batch.failedCount > 0 && (
                              <div className="text-center">
                                <div className="text-lg font-semibold text-red-600">{batch.failedCount}</div>
                                <div className="text-xs text-gray-500">Failed</div>
                              </div>
                            )}
                            {batch.pendingCount > 0 && (
                              <div className="text-center">
                                <div className="text-lg font-semibold text-yellow-600">{batch.pendingCount}</div>
                                <div className="text-xs text-gray-500">Pending</div>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              {batch.totalCost > 0 && (
                                <span>Cost: ${(batch.totalCost / 100).toFixed(3)}</span>
                              )}
                              {batch.avgDuration > 0 && (
                                <span>Avg Duration: {Math.floor(batch.avgDuration / 60)}m {batch.avgDuration % 60}s</span>
                              )}
                              {batch.avgGrade !== null && (
                                <span>Avg Grade: {batch.avgGrade.toFixed(1)}</span>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                setActiveTab("jobs");
                                setSelectedBatchFilter(batch.id);
                              }}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                            >
                              View Jobs →
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "export" && (
          <div className="space-y-6">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Export Evaluation Data
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Configure your export parameters to download evaluation data in YAML format.
                This includes full document content, evaluation results, comments, and job details.
              </p>
              
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const params = new URLSearchParams();
                  
                  const version = formData.get('version');
                  if (version && version !== 'all') {
                    params.append('version', version.toString());
                  }
                  
                  const startDate = formData.get('startDate');
                  if (startDate) {
                    params.append('startDateTime', new Date(startDate.toString()).toISOString());
                  }
                  
                  const limit = formData.get('limit');
                  if (limit) {
                    params.append('limit', limit.toString());
                  }
                  
                  const showLlmInteractions = formData.get('showLlmInteractions');
                  if (showLlmInteractions) {
                    params.append('showLlmInteractions', 'true');
                  }
                  
                  // Open in new tab
                  window.open(`/api/agents/${agent.id}/export-data?${params}`, '_blank');
                }}
                className="space-y-4"
              >
                <div>
                  <label htmlFor="export-version" className="block text-sm font-medium text-gray-700 mb-1">
                    Agent Version
                  </label>
                  <select
                    id="export-version"
                    name="version"
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="all">All versions</option>
                    {Array.from({ length: Number(agent.version) }, (_, i) => i + 1)
                      .reverse()
                      .map((version) => (
                        <option key={version} value={version}>
                          v{version}
                          {version === Number(agent.version) && " (current)"}
                        </option>
                      ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="export-start-date" className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date (optional)
                  </label>
                  <input
                    type="date"
                    id="export-start-date"
                    name="startDate"
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">Only include evaluations after this date</p>
                </div>
                
                <div>
                  <label htmlFor="export-limit" className="block text-sm font-medium text-gray-700 mb-1">
                    Maximum Results
                  </label>
                  <input
                    type="number"
                    id="export-limit"
                    name="limit"
                    defaultValue="100"
                    min="1"
                    max="1000"
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">Maximum number of evaluations to export (1-1000)</p>
                </div>
                
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="export-llm-interactions"
                      name="showLlmInteractions"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Include LLM interactions
                    </span>
                  </label>
                  <p className="mt-1 text-xs text-gray-500 ml-6">
                    Include full prompt/response data for first 10% of evaluations (minimum 1)
                  </p>
                </div>
                
                <div className="mt-6 flex justify-end gap-3">
                  <Button type="submit" className="flex items-center gap-2">
                    <FileDown className="h-4 w-4" />
                    Export as YAML
                  </Button>
                </div>
              </form>
              
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Export Format</h4>
                <p className="text-sm text-gray-600">
                  The export will include:
                </p>
                <ul className="mt-2 text-sm text-gray-600 list-disc list-inside space-y-1">
                  <li>Full document content and metadata</li>
                  <li>Complete evaluation analysis and summaries</li>
                  <li>All comments with highlight positions</li>
                  <li>Job execution details and costs</li>
                  <li>Complete LLM interactions (prompts and responses)</li>
                  <li>Agent configuration and instructions</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
