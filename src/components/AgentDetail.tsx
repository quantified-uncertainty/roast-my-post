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
} from "lucide-react";
import * as yaml from 'js-yaml';
import Link from "next/link";

import { Button } from "@/components/Button";
import type { Agent } from "@/types/agentSchema";
import { AGENT_TYPE_INFO } from "@/types/agentTypes";
import type { AgentReview } from "@/types/evaluationSchema";

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

export default function AgentDetail({
  agent,
  isOwner = false,
}: AgentDetailProps) {
  const [activeTab, setActiveTab] = useState<"details" | "documents" | "evals">("details");
  const [review, setReview] = useState<AgentReview | null>(null);
  const [documents, setDocuments] = useState<AgentDocument[]>([]);
  const [evaluations, setEvaluations] = useState<AgentEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [evalsLoading, setEvalsLoading] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [exportType, setExportType] = useState<'JSON' | 'Markdown' | 'YAML'>('JSON');
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

  useEffect(() => {
    if (activeTab === "documents") {
      fetchDocuments();
    } else if (activeTab === "evals") {
      fetchEvaluations();
    }
  }, [activeTab]);

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
    <div className="mx-auto max-w-6xl p-8">
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
                <h3 className="text-lg font-semibold text-gray-900">
                  All Evaluations ({evaluations.length})
                </h3>
                <div className="space-y-4">
                  {evaluations.map((evalItem) => (
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
      </div>
    </div>
  );
}
