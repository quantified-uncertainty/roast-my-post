"use client";

import { useEffect, useState } from "react";

import yaml from "js-yaml";
import { RefreshCw } from "lucide-react";
import type { CommentVariant } from "@roast/ai";

import CodeBlock from "@/components/CodeBlock";
import { Button } from "@/components/ui/button";

interface Comment {
  header?: string | null;
  description: string;
  importance?: number | null;
  grade?: number | null;
  variant?: CommentVariant | null;
  source?: string | null;
  metadata?: any;
  highlight?: {
    quotedText: string;
    startOffset: number;
    endOffset: number;
  };
}

interface Evaluation {
  agentId: string;
  agentName: string;
  summary?: string | null;
  analysis?: string | null;
  grade?: number | null;
  selfCritique?: string | null;
  comments?: Comment[];
}

interface Document {
  id: string;
  title: string;
  content: string;
  author?: string | null;
  platforms?: string[] | null;
  url?: string | null;
  importUrl?: string | null;
  publishedDate: Date;
}

interface ExportClientProps {
  document: Document;
  evaluations: Evaluation[];
}

export function ExportClient({ document, evaluations }: ExportClientProps) {
  // State for selected evaluations - start with all selected
  const [selectedEvaluations, setSelectedEvaluations] = useState<Set<string>>(
    new Set(evaluations.map((e) => e.agentId))
  );

  // State for include options
  const [includeContent, setIncludeContent] = useState(true);
  const [commentsMode, setCommentsMode] = useState<'none' | 'basic' | 'expanded'>('basic');
  const [includeAnalysis, setIncludeAnalysis] = useState(true);
  const [includeGrades, setIncludeGrades] = useState(true);
  const [exportFormat, setExportFormat] = useState<'yaml' | 'json'>('yaml');

  // State for export content
  const [exportContent, setExportContent] = useState<string>("");
  const [currentFormat, setCurrentFormat] = useState<'yaml' | 'json'>('yaml'); // Format of currently displayed content
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isGenerating, setIsGenerating] = useState(false);

  // Estimate token count (rough approximation: ~4 chars per token)
  const estimateTokenCount = (text: string): number => {
    return Math.round(text.length / 4);
  };

  // Generate export based on current selections
  const generateExport = () => {
    setIsGenerating(true);

    // Small delay to show loading state
    setTimeout(() => {
      const exportData: any = {
        document: {
          id: document.id,
          title: document.title,
          publishedDate: document.publishedDate,
        },
      };

      // Add optional fields only if they exist
      if (document.author) exportData.document.author = document.author;
      if (document.platforms && document.platforms.length > 0) {
        exportData.document.platforms = document.platforms;
      }
      if (document.url) exportData.document.url = document.url;
      if (document.importUrl)
        exportData.document.importUrl = document.importUrl;

      // Add content if selected
      if (includeContent) {
        exportData.document.content = document.content;
      }

      // Add selected evaluations
      const selectedEvals = evaluations.filter((e) =>
        selectedEvaluations.has(e.agentId)
      );

      if (selectedEvals.length > 0) {
        exportData.evaluations = selectedEvals.map((evaluation) => {
          const evalData: any = {
            agent: evaluation.agentName,
          };

          // Add summary if it exists
          if (evaluation.summary) {
            evalData.summary = evaluation.summary;
          }
          
          // Add analysis if selected and exists
          if (includeAnalysis && evaluation.analysis) {
            evalData.analysis = evaluation.analysis;
          }

          // Add grade if selected
          if (
            includeGrades &&
            evaluation.grade !== null &&
            evaluation.grade !== undefined
          ) {
            evalData.grade = evaluation.grade;
          }

          // Add self-critique if exists
          if (evaluation.selfCritique) {
            evalData.selfCritique = evaluation.selfCritique;
          }

          // Add comments based on mode
          if (
            commentsMode !== 'none' &&
            evaluation.comments &&
            evaluation.comments.length > 0
          ) {
            evalData.comments = evaluation.comments.map((comment) => {
              const commentData: any = {
                header: comment.header,
                description: comment.description,
              };

              // Add highlight for both basic and expanded modes
              if (comment.highlight && (commentsMode === 'basic' || commentsMode === 'expanded')) {
                commentData.highlight = {
                  quotedText: comment.highlight.quotedText,
                };
                
                // Add context for basic mode (30 chars before and after)
                if (commentsMode === 'basic' && document.content) {
                  const startOffset = comment.highlight.startOffset;
                  const endOffset = comment.highlight.endOffset;
                  
                  // Get 30 chars before start and 30 chars after end
                  const contextStart = Math.max(0, startOffset - 30);
                  const contextEnd = Math.min(document.content.length, endOffset + 30);
                  
                  let context = document.content.substring(contextStart, contextEnd);
                  
                  // Add ellipsis if truncated
                  if (contextStart > 0) context = '...' + context;
                  if (contextEnd < document.content.length) context = context + '...';
                  
                  commentData.highlight.context = context;
                }
                
                // Add full offset data for expanded mode
                if (commentsMode === 'expanded') {
                  commentData.highlight.startOffset = comment.highlight.startOffset;
                  commentData.highlight.endOffset = comment.highlight.endOffset;
                }
              }

              // Add expanded data only if mode is 'expanded'
              if (commentsMode === 'expanded') {
                if (comment.variant) commentData.variant = comment.variant;
                if (comment.source) commentData.source = comment.source;
                if (comment.metadata) commentData.metadata = comment.metadata;

                if (includeGrades) {
                  if (
                    comment.importance !== null &&
                    comment.importance !== undefined
                  ) {
                    commentData.importance = comment.importance;
                  }
                  if (comment.grade !== null && comment.grade !== undefined) {
                    commentData.grade = comment.grade;
                  }
                }
              }

              return commentData;
            });
          }

          return evalData;
        });
      }

      // Generate output based on selected format
      let outputString: string;
      if (exportFormat === 'json') {
        outputString = JSON.stringify(exportData, null, 2);
      } else {
        outputString = yaml.dump(exportData, {
          noRefs: true,
          sortKeys: false,
          lineWidth: -1,
          skipInvalid: true,
        });
      }

      setExportContent(outputString);
      setCurrentFormat(exportFormat); // Update the format of displayed content
      setLastUpdated(new Date());
      setIsGenerating(false);
    }, 100);
  };

  // Generate initial export on mount
  useEffect(() => {
    generateExport();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle select all/clear all
  const handleSelectAll = () => {
    setSelectedEvaluations(new Set(evaluations.map((e) => e.agentId)));
  };

  const handleClearAll = () => {
    setSelectedEvaluations(new Set());
  };

  // Toggle individual evaluation
  const toggleEvaluation = (agentId: string) => {
    const newSelected = new Set(selectedEvaluations);
    if (newSelected.has(agentId)) {
      newSelected.delete(agentId);
    } else {
      newSelected.add(agentId);
    }
    setSelectedEvaluations(newSelected);
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      {/* Left Panel - Options */}
      <div className="lg:col-span-1">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-lg font-semibold text-gray-900">
            Export Options
          </h2>

          {/* Evaluation Selection */}
          <div className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Select Evaluations
              </label>
              <div className="flex gap-2">
                <button
                  onClick={handleSelectAll}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Select All
                </button>
                <span className="text-xs text-gray-400">|</span>
                <button
                  onClick={handleClearAll}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Clear All
                </button>
              </div>
            </div>
            <div className="space-y-2 rounded-md border border-gray-200 p-3">
              {evaluations.length > 0 ? (
                evaluations.map((evaluation) => (
                  <label
                    key={evaluation.agentId}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedEvaluations.has(evaluation.agentId)}
                      onChange={() => toggleEvaluation(evaluation.agentId)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">
                      {evaluation.agentName}
                    </span>
                    {evaluation.grade !== null &&
                      evaluation.grade !== undefined && (
                        <span className="ml-auto text-xs text-gray-500">
                          Grade: {evaluation.grade}
                        </span>
                      )}
                  </label>
                ))
              ) : (
                <p className="text-sm text-gray-500">
                  No evaluations available
                </p>
              )}
            </div>
          </div>

          {/* Export Format */}
          <div className="mb-6 space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Export Format
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="exportFormat"
                  value="yaml"
                  checked={exportFormat === 'yaml'}
                  onChange={() => setExportFormat('yaml')}
                  className="border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">YAML</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="exportFormat"
                  value="json"
                  checked={exportFormat === 'json'}
                  onChange={() => setExportFormat('json')}
                  className="border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">JSON</span>
              </label>
            </div>
          </div>

          {/* Document Information Section */}
          <div className="mb-6">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">
              Document Information
            </h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={includeContent}
                  onChange={(e) => setIncludeContent(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">Include document content</span>
              </label>
            </div>
          </div>

          {/* Evaluation Information Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">
              Evaluation Information
            </h3>
            
            {/* Include Options */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={includeAnalysis}
                  onChange={(e) => setIncludeAnalysis(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">Include analysis</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={includeGrades}
                  onChange={(e) => setIncludeGrades(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">Include grades</span>
              </label>
            </div>
            
            {/* Comments Mode Radio Group */}
            <div>
              <label className="text-sm font-medium text-gray-700">
                Comments
              </label>
              <div className="mt-2 space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="commentsMode"
                    value="none"
                    checked={commentsMode === 'none'}
                    onChange={() => setCommentsMode('none')}
                    className="border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">None</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="commentsMode"
                    value="basic"
                    checked={commentsMode === 'basic'}
                    onChange={() => setCommentsMode('basic')}
                    className="border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">Basic data (headers & descriptions only)</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="commentsMode"
                    value="expanded"
                    checked={commentsMode === 'expanded'}
                    onChange={() => setCommentsMode('expanded')}
                    className="border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">Expanded data (all fields)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Update Button */}
          <div className="mt-6">
            <Button
              onClick={generateExport}
              className={`w-full ${exportFormat !== currentFormat ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
              variant="default"
              disabled={isGenerating}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isGenerating ? "animate-spin" : ""}`}
              />
              {isGenerating ? "Updating..." : exportFormat !== currentFormat ? "Update to " + exportFormat.toUpperCase() : "Update Preview"}
            </Button>
          </div>

          {/* Export Info */}
          <div className="mt-4 rounded-md bg-blue-50 p-3">
            <p className="text-xs text-blue-800">
              Click "Update Preview" to regenerate the {exportFormat.toUpperCase()} with your selected
              options. Use the copy button in the preview to copy the export
              data.
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Export Preview */}
      <div className="lg:col-span-2">
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {currentFormat === 'yaml' ? 'YAML' : 'JSON'} Preview
                  {exportFormat !== currentFormat && (
                    <span className="ml-2 text-sm font-normal text-amber-600">
                      (Format changed - click Update)
                    </span>
                  )}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {selectedEvaluations.size} evaluation
                  {selectedEvaluations.size !== 1 ? "s" : ""} selected
                  {" • "}~{Math.round(exportContent.length / 1024)}KB
                  {" • "}~{estimateTokenCount(exportContent).toLocaleString()} tokens
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Last updated</p>
                <p className="text-sm text-gray-700">
                  {lastUpdated.toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <CodeBlock code={exportContent} language={currentFormat === 'yaml' ? 'yaml' : 'json'} />
          </div>
        </div>
      </div>
    </div>
  );
}
