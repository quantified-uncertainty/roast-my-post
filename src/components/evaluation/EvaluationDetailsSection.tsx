"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { GradeBadge } from "@/components/GradeBadge";
import { ExperimentalBadge } from "@/components/ExperimentalBadge";
import { EvaluationSection } from "./EvaluationSection";
import { formatCost, formatDuration, formatDate } from "@/lib/job/formatters";
import { 
  ClipboardDocumentIcon, 
  ArrowDownTrayIcon,
  ChevronDownIcon,
  ChevronUpIcon
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
  costInCents?: number | null;
  durationInSeconds?: number | null;
  createdAt?: string | Date;
  evaluationData?: any; // Full evaluation data for export
  documentId?: string;
  evaluationId?: string;
}

type ExportFormat = 'json' | 'yaml' | 'markdown';
type ExportDestination = 'clipboard' | 'file';

export function EvaluationDetailsSection({
  agentName,
  agentId,
  agentDescription,
  grade,
  ephemeralBatch,
  costInCents,
  durationInSeconds,
  createdAt,
  evaluationData,
  documentId,
  evaluationId
}: EvaluationDetailsSectionProps) {
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);
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

    let content = '';
    let filename = '';
    let mimeType = '';

    // Generate content based on format
    switch (format) {
      case 'json':
        content = JSON.stringify(evaluationData, null, 2);
        filename = `evaluation-${evaluationData.evaluation?.id || 'export'}.json`;
        mimeType = 'application/json';
        break;
      case 'yaml':
        // Simple YAML serialization (could use a proper YAML library)
        content = jsonToYaml(evaluationData);
        filename = `evaluation-${evaluationData.evaluation?.id || 'export'}.yaml`;
        mimeType = 'text/yaml';
        break;
      case 'markdown':
        content = evaluationToMarkdown(evaluationData);
        filename = `evaluation-${evaluationData.evaluation?.id || 'export'}.md`;
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

  return (
    <EvaluationSection id="evaluation-details" title="Evaluation Details">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent Information */}
        <div className="lg:col-span-2">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {agentId ? (
                  <Link href={`/agents/${agentId}`}>
                    <h3 className="text-lg font-semibold text-gray-900 hover:text-gray-700 hover:underline cursor-pointer">{agentName}</h3>
                  </Link>
                ) : (
                  <h3 className="text-lg font-semibold text-gray-900">{agentName}</h3>
                )}
                {ephemeralBatch && ephemeralBatch.trackingId && (
                  <ExperimentalBadge 
                    trackingId={ephemeralBatch.trackingId}
                    className="ml-2"
                  />
                )}
              </div>
              {agentDescription && (
                <p className="text-sm text-gray-600 mb-2">{agentDescription}</p>
              )}
            </div>
            {grade !== undefined && grade !== null && (
              <div className="ml-6 text-right">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Grade</p>
                <div className="mt-1">
                  <GradeBadge grade={grade} variant="dark" size="md" className="text-2xl px-4 py-1" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Run Statistics */}
        <div className="border-l lg:border-l-gray-200 lg:pl-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Run Statistics</h4>
          <div className="space-y-3">
            {durationInSeconds !== undefined && durationInSeconds !== null && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Duration</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatDuration(durationInSeconds)}
                </p>
              </div>
            )}
            {costInCents !== undefined && costInCents !== null && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Cost</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatCost(costInCents)}
                </p>
              </div>
            )}
            {createdAt && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Created</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(createdAt)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation and Export Actions */}
      <div className="mt-6 pt-4 border-t border-gray-200 space-y-4">
        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-700">Navigation</h4>
          <div className="flex gap-2">
            {documentId && agentId && (
              <Link 
                href={`/docs/${documentId}/evals/${agentId}`}
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Eval Page
              </Link>
            )}
            {documentId && agentId && (
              <Link 
                href={`/docs/${documentId}/reader?evals=${agentId}`}
                className="inline-flex items-center gap-2 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                Reader
              </Link>
            )}
          </div>
        </div>

        {/* Export Actions */}
        {evaluationData && (
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">Export Evaluation</h4>
            <div className="relative z-40">
              <button
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setButtonRect(rect);
                  setExportDropdownOpen(!exportDropdownOpen);
                }}
                className="inline-flex items-center gap-2 rounded-md bg-gray-600 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700"
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
          </div>
        )}
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
  if (!evaluation) return '';

  let md = `# Evaluation Report\n\n`;
  
  if (evaluation.documentTitle) {
    md += `**Document:** ${evaluation.documentTitle}\n`;
  }
  if (evaluation.agentName) {
    md += `**Agent:** ${evaluation.agentName}\n`;
  }
  if (evaluation.grade !== undefined && evaluation.grade !== null) {
    md += `**Grade:** ${evaluation.grade}\n`;
  }
  if (evaluation.createdAt) {
    md += `**Created:** ${new Date(evaluation.createdAt).toLocaleString()}\n`;
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

  if (evaluation.job?.llmThinking) {
    md += `## LLM Thinking\n\n${evaluation.job.llmThinking}\n\n`;
  }

  if (evaluation.comments && evaluation.comments.length > 0) {
    md += `## Comments\n\n`;
    evaluation.comments.forEach((comment: any, index: number) => {
      md += `### Comment ${index + 1}\n\n`;
      if (comment.description) {
        md += `${comment.description}\n\n`;
      }
      if (comment.importance) {
        md += `**Importance:** ${comment.importance}\n`;
      }
      if (comment.grade) {
        md += `**Grade:** ${comment.grade}\n`;
      }
      md += `\n`;
    });
  }

  return md;
}