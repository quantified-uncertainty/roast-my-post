"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Bot } from "lucide-react";
import { GradeBadge } from "@/components/GradeBadge";
import { ExperimentalBadge } from "@/components/ExperimentalBadge";
import { EvaluationSection } from "./EvaluationSection";
import { formatCostFromDollars, formatDuration, formatDate } from "@/application/services/job/formatters";
import { 
  ClipboardDocumentIcon, 
  ArrowDownTrayIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  BookOpenIcon,
  ChartBarIcon
} from "@heroicons/react/24/outline";
import { CheckIcon } from "@heroicons/react/24/solid";

interface EvaluationDetailsSectionProps {
  agentName: string;
  agentId?: string;
  agentDescription?: string;
  grade?: number | null;
  ephemeralBatch?: {
    trackingId: string | null;
    isEphemeral: boolean;
  } | null;
  priceInDollars?: number | string | null;
  durationInSeconds?: number | null;
  createdAt?: string | Date;
  evaluationData?: any; // Full evaluation data for export
  documentId?: string;
  evaluationId?: string;
  isOnEvalPage?: boolean;
}

type ExportFormat = 'json' | 'yaml' | 'markdown';
type ExportDestination = 'clipboard' | 'file';

export function EvaluationDetailsSection({
  agentName,
  agentId,
  agentDescription,
  grade,
  ephemeralBatch,
  priceInDollars,
  durationInSeconds,
  createdAt,
  evaluationData,
  documentId,
  _evaluationId,
  isOnEvalPage = false
}: EvaluationDetailsSectionProps) {
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setExportDropdownOpen(false);
      }
    }

    if (exportDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [exportDropdownOpen]);

  const handleExport = async (format: ExportFormat, destination: ExportDestination) => {
    if (!evaluationData) return;

    // Create export data with only the current/latest version
    const latestVersion = evaluationData.versions?.[0];
    const job = latestVersion?.job;
    const exportData = {
      evaluation: {
        id: evaluationData.id,
        agentId: evaluationData.agentId,
        documentId: evaluationData.documentId,
        version: latestVersion?.version || 1,
        createdAt: latestVersion?.createdAt,
        updatedAt: latestVersion?.updatedAt,
        isStale: evaluationData.isStale,
        summary: latestVersion?.summary,
        analysis: latestVersion?.analysis,
        grade: latestVersion?.grade,
        selfCritique: latestVersion?.selfCritique,
        comments: latestVersion?.comments || [],
        llmThinking: job?.llmThinking
      },
      job: job ? {
        id: job.id,
        status: job.status,
        priceInDollars: job.priceInDollars,
        durationInSeconds: job.durationInSeconds,
        llmModel: job.llmModel,
        inputTokens: job.inputTokens,
        outputTokens: job.outputTokens,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        attempts: job.attempts,
        error: job.error,
        logs: job.logs,
        llmThinking: job.llmThinking
      } : null,
      agent: {
        id: evaluationData.agent?.id,
        name: evaluationData.agent?.versions?.[0]?.name || evaluationData.agentName,
        description: evaluationData.agent?.versions?.[0]?.description || evaluationData.agentDescription
      },
      document: {
        id: evaluationData.documentId
      }
    };

    let content = '';
    let filename = '';
    let mimeType = '';

    // Generate content based on format
    switch (format) {
      case 'json':
        content = JSON.stringify(exportData, null, 2);
        filename = `evaluation-${exportData.evaluation.id || 'export'}.json`;
        mimeType = 'application/json';
        break;
      case 'yaml':
        // Simple YAML serialization (could use a proper YAML library)
        content = jsonToYaml(exportData);
        filename = `evaluation-${exportData.evaluation.id || 'export'}.yaml`;
        mimeType = 'text/yaml';
        break;
      case 'markdown':
        content = evaluationToMarkdown(exportData);
        filename = `evaluation-${exportData.evaluation.id || 'export'}.md`;
        mimeType = 'text/markdown';
        break;
    }

    if (destination === 'clipboard') {
      try {
        await navigator.clipboard.writeText(content);
        setCopied(`${format}-clipboard`);
        setTimeout(() => setCopied(null), 2000);
      } catch (err) {
        console.error('Failed to copy to clipboard:', err);
      }
    } else {
      // Download as file
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    setExportDropdownOpen(false);
  };

  // Truncate description if needed
  const shouldTruncate = agentDescription && agentDescription.length > 150;
  const displayDescription = shouldTruncate && !descriptionExpanded 
    ? agentDescription.substring(0, 150) + '...' 
    : agentDescription;

  return (
    <EvaluationSection id="evaluation-details" title="Evaluation Details">
      <div className="space-y-6">
        {/* Agent Information and Statistics Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Agent Information */}
          <div className="lg:col-span-2">
            <div className="flex items-start gap-4">
              {/* Agent Icon */}
              <div className="flex-shrink-0">
                <Bot className="h-8 w-8 text-gray-600" />
              </div>
              
              {/* Agent Details */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {agentId ? (
                    <Link href={`/agents/${agentId}`}>
                      <h3 className="text-lg font-semibold text-gray-900 hover:text-gray-700 hover:underline cursor-pointer">
                        {agentName}
                      </h3>
                    </Link>
                  ) : (
                    <h3 className="text-lg font-semibold text-gray-900">{agentName}</h3>
                  )}
                  {grade !== undefined && grade !== null && (
                    <GradeBadge grade={grade} variant="dark" size="sm" />
                  )}
                  {ephemeralBatch && ephemeralBatch.trackingId && (
                    <ExperimentalBadge 
                      trackingId={ephemeralBatch.trackingId}
                    />
                  )}
                </div>
                
                {agentDescription && (
                  <div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {displayDescription}
                    </p>
                    {shouldTruncate && (
                      <button
                        onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                        className="text-sm text-blue-600 hover:text-blue-800 mt-1"
                      >
                        {descriptionExpanded ? 'Show less' : 'Show more'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Run Statistics */}
          <div className="lg:border-l lg:border-gray-200 lg:pl-6">
            <h4 className="text-sm font-medium text-gray-700 mb-4">Run Statistics</h4>
            <dl className="space-y-3">
              {durationInSeconds !== undefined && durationInSeconds !== null && (
                <div>
                  <dt className="text-xs text-gray-500 uppercase tracking-wide">Duration</dt>
                  <dd className="text-sm font-medium text-gray-900 mt-1">
                    {formatDuration(durationInSeconds)}
                  </dd>
                </div>
              )}
              {priceInDollars !== undefined && priceInDollars !== null && (
                <div>
                  <dt className="text-xs text-gray-500 uppercase tracking-wide">Cost</dt>
                  <dd className="text-sm font-medium text-gray-900 mt-1">
                    {formatCostFromDollars(priceInDollars)}
                  </dd>
                </div>
              )}
              {createdAt && (
                <div>
                  <dt className="text-xs text-gray-500 uppercase tracking-wide">Created</dt>
                  <dd className="text-sm font-medium text-gray-900 mt-1">
                    {formatDate(createdAt)}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Actions Row - Navigation and Export */}
        <div className="border-t border-gray-200 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Left side - Navigation buttons */}
            <div className="flex items-center gap-3">
              {documentId && agentId && (
                <>
                  {!isOnEvalPage && (
                    <Link 
                      href={`/docs/${documentId}/evals/${agentId}`}
                      className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                    >
                      <ChartBarIcon className="h-4 w-4" />
                      Eval Details
                    </Link>
                  )}
                  <Link 
                    href={`/docs/${documentId}/reader?evals=${agentId}`}
                    className="inline-flex items-center gap-2 rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 transition-colors"
                  >
                    <BookOpenIcon className="h-4 w-4" />
                    Reader
                  </Link>
                </>
              )}
            </div>

            {/* Right side - Export button */}
            {evaluationData && (
              <div className="relative z-40">
                <button
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setButtonRect(rect);
                    setExportDropdownOpen(!exportDropdownOpen);
                  }}
                  aria-expanded={exportDropdownOpen}
                  aria-haspopup="menu"
                  aria-label="Export evaluation data"
                  className="inline-flex items-center gap-2 rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  Export
                  {exportDropdownOpen ? (
                    <ChevronUpIcon className="h-4 w-4" />
                  ) : (
                    <ChevronDownIcon className="h-4 w-4" />
                  )}
                </button>

              {exportDropdownOpen && buttonRect && (
                <div 
                  ref={dropdownRef}
                  role="menu"
                  aria-label="Export options"
                  className="fixed w-56 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-50"
                  style={{
                    top: buttonRect.bottom + 8,
                    left: buttonRect.right - 224, // 224px = w-56 (14rem * 16px)
                  }}
                >
                  <div className="py-1">
                    <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b">
                      To Clipboard
                    </div>
                    {(['json', 'yaml', 'markdown'] as ExportFormat[]).map((format) => (
                      <button
                        key={`${format}-clipboard`}
                        onClick={() => handleExport(format, 'clipboard')}
                        role="menuitem"
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        {copied === `${format}-clipboard` ? (
                          <CheckIcon className="h-4 w-4 mr-2 text-green-600" />
                        ) : (
                          <ClipboardDocumentIcon className="h-4 w-4 mr-2" />
                        )}
                        {format.toUpperCase()}
                        {copied === `${format}-clipboard` && (
                          <span className="ml-auto text-green-600">Copied!</span>
                        )}
                      </button>
                    ))}
                    
                    <div className="px-3 py-2 text-xs font-medium text-gray-500 border-t border-b">
                      Download File
                    </div>
                    {(['json', 'yaml', 'markdown'] as ExportFormat[]).map((format) => (
                      <button
                        key={`${format}-file`}
                        onClick={() => handleExport(format, 'file')}
                        role="menuitem"
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                        {format.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              </div>
            )}
          </div>
        </div>
      </div>
    </EvaluationSection>
  );
}

// Simple JSON to YAML converter (basic implementation)
function jsonToYaml(obj: any, indent = 0): string {
  const spaces = '  '.repeat(indent);
  let result = '';

  if (Array.isArray(obj)) {
    for (const item of obj) {
      result += `${spaces}- `;
      if (typeof item === 'object' && item !== null) {
        result += '\n' + jsonToYaml(item, indent + 1);
      } else {
        result += yamlValue(item) + '\n';
      }
    }
  } else if (typeof obj === 'object' && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
      result += `${spaces}${key}: `;
      if (typeof value === 'object' && value !== null) {
        result += '\n' + jsonToYaml(value, indent + 1);
      } else {
        result += yamlValue(value) + '\n';
      }
    }
  }

  return result;
}

function yamlValue(value: any): string {
  if (typeof value === 'string') {
    // Simple string escaping for YAML
    if (value.includes('\n') || value.includes('"') || value.includes("'")) {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    return value;
  }
  return String(value);
}

// Convert evaluation to Markdown format
function evaluationToMarkdown(data: any): string {
  const evaluation = data.evaluation;
  const agent = data.agent;
  const job = data.job;
  if (!evaluation) return '';

  let md = `# Evaluation Report\n\n`;
  
  if (data.document?.id) {
    md += `**Document ID:** ${data.document.id}\n`;
  }
  if (agent?.name) {
    md += `**Agent:** ${agent.name}\n`;
  }
  if (agent?.description) {
    md += `**Agent Description:** ${agent.description}\n`;
  }
  if (evaluation.grade !== undefined && evaluation.grade !== null) {
    md += `**Grade:** ${evaluation.grade}\n`;
  }
  if (evaluation.version) {
    md += `**Version:** ${evaluation.version}\n`;
  }
  if (evaluation.createdAt) {
    md += `**Created:** ${new Date(evaluation.createdAt).toLocaleString()}\n`;
  }
  
  // Job details section
  if (job) {
    md += `\n## Job Details\n\n`;
    if (job.id) {
      md += `**Job ID:** ${job.id}\n`;
    }
    if (job.status) {
      md += `**Status:** ${job.status}\n`;
    }
    if (job.priceInDollars !== null && job.priceInDollars !== undefined) {
      const price = typeof job.priceInDollars === 'string' ? parseFloat(job.priceInDollars) : job.priceInDollars;
      md += `**Cost:** $${price.toFixed(4)}\n`;
    }
    if (job.durationInSeconds !== null && job.durationInSeconds !== undefined) {
      md += `**Duration:** ${job.durationInSeconds}s\n`;
    }
    if (job.llmModel) {
      md += `**LLM Model:** ${job.llmModel}\n`;
    }
    if (job.inputTokens !== null && job.inputTokens !== undefined) {
      md += `**Input Tokens:** ${job.inputTokens.toLocaleString()}\n`;
    }
    if (job.outputTokens !== null && job.outputTokens !== undefined) {
      md += `**Output Tokens:** ${job.outputTokens.toLocaleString()}\n`;
    }
    if (job.startedAt) {
      md += `**Started:** ${new Date(job.startedAt).toLocaleString()}\n`;
    }
    if (job.completedAt) {
      md += `**Completed:** ${new Date(job.completedAt).toLocaleString()}\n`;
    }
    if (job.attempts !== null && job.attempts !== undefined) {
      md += `**Attempts:** ${job.attempts}\n`;
    }
    if (job.error) {
      md += `**Error:** ${job.error}\n`;
    }
    if (job.logs) {
      md += `**Logs:**\n\`\`\`\n${job.logs}\n\`\`\`\n`;
    }
  }
  
  md += `\n---\n\n`;

  if (evaluation.summary) {
    md += `## Summary\n\n${evaluation.summary}\n\n`;
  }

  if (evaluation.analysis) {
    md += `## Analysis\n\n${evaluation.analysis}\n\n`;
  }

  if (evaluation.selfCritique) {
    md += `## Self-Critique\n\n${evaluation.selfCritique}\n\n`;
  }

  if (evaluation.llmThinking) {
    md += `## LLM Thinking\n\n${evaluation.llmThinking}\n\n`;
  }

  if (evaluation.comments && evaluation.comments.length > 0) {
    md += `## Comments\n\n`;
    evaluation.comments.forEach((comment: any, index: number) => {
      // Use header if available, otherwise use generic title
      const header = comment.header || `Comment ${index + 1}`;
      md += `### ${header}\n\n`;
      
      // Add level and source badges
      if (comment.level || comment.source) {
        if (comment.level) md += `[${comment.level.toUpperCase()}] `;
        if (comment.source) md += `[${comment.source}] `;
        md += `\n\n`;
      }
      
      if (comment.description) {
        md += `${comment.description}\n\n`;
      }
      if (comment.importance) {
        md += `**Importance:** ${comment.importance}\n`;
      }
      if (comment.grade) {
        md += `**Grade:** ${comment.grade}\n`;
      }
      if (comment.metadata) {
        md += `**Metadata:** ${JSON.stringify(comment.metadata, null, 2)}\n`;
      }
      md += `\n`;
    });
  }

  return md;
}