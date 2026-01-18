"use client";

import { useState } from "react";
import { ChevronDownIcon, ChevronRightIcon, ExclamationTriangleIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import type { ExtractionPhase, PipelineCounts, FilteredItem, Comment, StageMetrics, ExtractorInfo } from "../../types";
import { truncate } from "../../utils/formatters";

interface PipelineViewProps {
  extraction?: ExtractionPhase;
  counts?: PipelineCounts;
  filteredItems: FilteredItem[];
  stages?: StageMetrics[];
  totalDurationMs?: number;
  finalComments: Comment[];
  lostComments: Comment[];
}

function formatDuration(ms: number | undefined): string {
  if (ms === undefined) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function formatCost(usd: number | undefined): string {
  if (usd === undefined) return "";
  return `$${usd.toFixed(4)}`;
}

function formatTokens(tokens: number | undefined): string {
  if (tokens === undefined) return "";
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`;
  return String(tokens);
}

/** Extract a friendly model name from the full model ID */
function getModelDisplayName(model: string): string {
  // Remove provider prefix (e.g., "google/gemini-2.5-flash" -> "gemini-2.5-flash")
  const withoutProvider = model.includes("/") ? model.split("/")[1] : model;

  // Shorten common model names
  const shortcuts: Record<string, string> = {
    "claude-sonnet-4-5-20250929": "Claude Sonnet 4.5",
    "claude-3-5-sonnet-20241022": "Claude 3.5 Sonnet",
    "claude-3-haiku-20240307": "Claude 3 Haiku",
    "gemini-3-flash-preview": "Gemini 3 Flash",
    "gemini-2.5-flash": "Gemini 2.5 Flash",
    "gemini-2.5-pro": "Gemini 2.5 Pro",
    "gpt-4-turbo": "GPT-4 Turbo",
    "gpt-4o": "GPT-4o",
  };

  return shortcuts[withoutProvider] || withoutProvider;
}

/** Format temperature for display */
function formatTemperature(ext: ExtractorInfo): string {
  // Check actualApiParams first (source of truth)
  if (ext.actualApiParams?.temperature !== undefined) {
    return `temp ${ext.actualApiParams.temperature}`;
  }
  // Fall back to temperatureConfig
  if (ext.temperatureConfig === "default") {
    return "temp default";
  }
  if (typeof ext.temperatureConfig === "number") {
    return `temp ${ext.temperatureConfig}`;
  }
  return "";
}

/** Format reasoning/thinking for display */
function formatReasoning(ext: ExtractorInfo): string {
  // Check actualApiParams for Claude-style thinking
  if (ext.actualApiParams?.thinking?.type === "enabled") {
    const budget = ext.actualApiParams.thinking.budget_tokens;
    return `thinking ${formatTokens(budget)} tokens`;
  }
  // Check for OpenRouter-style reasoning effort
  if (ext.actualApiParams?.reasoning?.effort) {
    return `reasoning: ${ext.actualApiParams.reasoning.effort}`;
  }
  if (ext.thinkingEnabled === true) {
    return "thinking enabled";
  }
  if (ext.thinkingEnabled === false) {
    return "no thinking";
  }
  return "";
}

export function PipelineView({
  extraction,
  counts,
  filteredItems,
  stages,
  totalDurationMs,
  finalComments,
  lostComments,
}: PipelineViewProps) {
  // Helper to get stage timing
  const getStageTiming = (stageName: string): StageMetrics | undefined => {
    return stages?.find((s) => s.stageName === stageName);
  };
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  const toggleStep = (step: string) => {
    const newSet = new Set(expandedSteps);
    if (newSet.has(step)) {
      newSet.delete(step);
    } else {
      newSet.add(step);
    }
    setExpandedSteps(newSet);
  };

  const extractors = extraction?.extractors ?? [];
  const totalExtracted = extraction?.totalIssuesBeforeJudge ?? 0;
  const afterDedup = counts?.issuesAfterDedup ?? extraction?.totalIssuesAfterJudge ?? 0;
  const afterFilter = counts?.issuesAfterFiltering ?? 0;
  const commentsGenerated = counts?.commentsGenerated ?? 0;
  const commentsKept = counts?.commentsKept ?? 0;

  const filterRemoved = afterDedup - afterFilter;
  const reviewRemoved = commentsGenerated - commentsKept;

  // Calculate total cost from all extractors + judge + stages
  const extractorsCost = extractors.reduce((sum, ext) => sum + (ext.costUsd ?? 0), 0);
  const judgeCost = extraction?.judgeCostUsd ?? 0;
  const stagesCost = stages?.reduce((sum, s) => sum + (s.costUsd ?? 0), 0) ?? 0;
  const totalCostUsd = extractorsCost + judgeCost + stagesCost;

  // Separate filtered items by stage
  const filterStageItems = filteredItems.filter((item) => item.stage === "supported-elsewhere-filter");
  const reviewStageItems = filteredItems.filter((item) => item.stage === "review");

  return (
    <div className="border rounded-lg bg-white">
      <div className="px-4 py-3 bg-gray-50 border-b">
        <h4 className="font-medium text-gray-900">Pipeline Flow</h4>
      </div>

      <div className="divide-y">
        {/* Step 1: Extraction */}
        <PipelineStep
          step="extraction"
          title="1. Extraction"
          summary={`${totalExtracted} issues from ${extractors.length} model${extractors.length !== 1 ? "s" : ""}`}
          timing={getStageTiming("extraction")?.durationMs}
          cost={extractorsCost}
          isExpanded={expandedSteps.has("extraction")}
          onToggle={() => toggleStep("extraction")}
          color="blue"
        >
          <div className="space-y-3">
            {extractors.map((ext, i) => (
              <ExtractorCard key={i} ext={ext} />
            ))}
            {extractors.length === 0 && (
              <p className="text-sm text-gray-500 italic">No extractor data available</p>
            )}
            {extraction && (
              <DeduplicationCard extraction={extraction} extractorCount={extractors.length} />
            )}
          </div>
        </PipelineStep>

        {/* Step 2: Filtering */}
        <PipelineStep
          step="filter"
          title="2. Supported-Elsewhere Filter"
          summary={`${afterFilter} kept, ${filterRemoved} filtered out`}
          timing={getStageTiming("supported-elsewhere-filter")?.durationMs}
          cost={getStageTiming("supported-elsewhere-filter")?.costUsd}
          isExpanded={expandedSteps.has("filter")}
          onToggle={() => toggleStep("filter")}
          color="orange"
        >
          <div className="space-y-3">
            <div className="p-3 bg-orange-50 rounded-md">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-orange-600">Input:</span>
                  <span className="font-mono ml-2">{afterDedup}</span>
                </div>
                <div>
                  <span className="text-orange-600">Output:</span>
                  <span className="font-mono ml-2">{afterFilter}</span>
                </div>
              </div>
            </div>

            {filterStageItems.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-orange-800 mb-2">
                  Filtered Items ({filterStageItems.length})
                </h5>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {filterStageItems.map((item, i) => (
                    <FilteredItemCard key={i} item={item} />
                  ))}
                </div>
              </div>
            )}

            {filterStageItems.length === 0 && filterRemoved > 0 && (
              <p className="text-sm text-gray-500 italic">
                {filterRemoved} items filtered (details not available)
              </p>
            )}
          </div>
        </PipelineStep>

        {/* Step 3: Comment Generation */}
        <PipelineStep
          step="generation"
          title="3. Comment Generation"
          summary={`${commentsGenerated} comments generated`}
          timing={getStageTiming("comment-generation")?.durationMs}
          cost={getStageTiming("comment-generation")?.costUsd}
          isExpanded={expandedSteps.has("generation")}
          onToggle={() => toggleStep("generation")}
          color="teal"
        >
          <div className="p-3 bg-teal-50 rounded-md">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-teal-600">Input (issues):</span>
                <span className="font-mono ml-2">{afterFilter}</span>
              </div>
              <div>
                <span className="text-teal-600">Output (comments):</span>
                <span className="font-mono ml-2">{commentsGenerated}</span>
              </div>
            </div>
            <p className="text-xs text-teal-600 mt-2">
              Issues are converted to user-facing comments with proper formatting
            </p>
          </div>
        </PipelineStep>

        {/* Step 4: Review */}
        <PipelineStep
          step="review"
          title="4. Review Filter"
          summary={`${commentsKept} kept, ${reviewRemoved} removed`}
          timing={getStageTiming("review")?.durationMs}
          cost={getStageTiming("review")?.costUsd}
          isExpanded={expandedSteps.has("review")}
          onToggle={() => toggleStep("review")}
          color="green"
        >
          <div className="space-y-3">
            <div className="p-3 bg-green-50 rounded-md">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-green-600">Input:</span>
                  <span className="font-mono ml-2">{commentsGenerated}</span>
                </div>
                <div>
                  <span className="text-green-600">Final Output:</span>
                  <span className="font-mono ml-2 font-bold">{commentsKept}</span>
                </div>
              </div>
            </div>

            {/* Removed by review */}
            {reviewStageItems.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-red-700 mb-2">
                  Removed by Review ({reviewStageItems.length})
                </h5>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {reviewStageItems.map((item, i) => (
                    <FilteredItemCard key={i} item={item} />
                  ))}
                </div>
              </div>
            )}

            {reviewStageItems.length === 0 && reviewRemoved > 0 && (
              <p className="text-sm text-gray-500 italic">
                {reviewRemoved} comments removed (details not available)
              </p>
            )}

            {/* Final kept comments */}
            {finalComments.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-green-800 mb-2">
                  Final Comments ({finalComments.length})
                </h5>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {finalComments.map((comment, i) => (
                    <CommentCard key={i} comment={comment} variant="kept" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </PipelineStep>
      </div>

      {/* Summary Bar */}
      <div className="px-4 py-3 bg-gray-100 border-t text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">
            <span className="font-medium">{totalExtracted}</span> extracted →{" "}
            <span className="font-medium">{afterDedup}</span> deduped →{" "}
            <span className="font-medium">{afterFilter}</span> filtered →{" "}
            <span className="font-medium">{commentsGenerated}</span> generated →{" "}
            <span className="font-bold text-green-700">{commentsKept}</span> final
          </span>
          <div className="flex items-center gap-4 text-gray-500">
            {totalDurationMs !== undefined && (
              <span className="font-mono">{formatDuration(totalDurationMs)}</span>
            )}
            {totalCostUsd > 0 && (
              <span className="font-mono text-emerald-600" title="Total pipeline cost">
                {formatCost(totalCostUsd)}
              </span>
            )}
            <span>
              {totalExtracted > 0
                ? `${Math.round((commentsKept / totalExtracted) * 100)}% yield`
                : "—"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PipelineStepProps {
  step: string;
  title: string;
  summary: string;
  timing?: number;
  cost?: number;
  isExpanded: boolean;
  onToggle: () => void;
  color: "blue" | "purple" | "orange" | "teal" | "green";
  children: React.ReactNode;
}

function PipelineStep({
  title,
  summary,
  timing,
  cost,
  isExpanded,
  onToggle,
  color,
  children,
}: PipelineStepProps) {
  const colorClasses = {
    blue: "bg-blue-100 text-blue-800 border-blue-200",
    purple: "bg-purple-100 text-purple-800 border-purple-200",
    orange: "bg-orange-100 text-orange-800 border-orange-200",
    teal: "bg-teal-100 text-teal-800 border-teal-200",
    green: "bg-green-100 text-green-800 border-green-200",
  };

  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center space-x-3">
          {isExpanded ? (
            <ChevronDownIcon className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronRightIcon className="h-4 w-4 text-gray-500" />
          )}
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${colorClasses[color]}`}>
            {title}
          </span>
          {timing !== undefined && (
            <span className="text-xs text-gray-400 font-mono">{formatDuration(timing)}</span>
          )}
          {cost !== undefined && cost > 0 && (
            <span className="text-xs text-emerald-500 font-mono">{formatCost(cost)}</span>
          )}
        </div>
        <span className="text-sm text-gray-600">{summary}</span>
      </button>
      {isExpanded && <div className="px-4 pb-4 pt-2">{children}</div>}
    </div>
  );
}

function FilteredItemCard({ item }: { item: FilteredItem }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="p-3 bg-orange-50 rounded-md border border-orange-100">
      <div
        className="flex items-start justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className="px-1.5 py-0.5 bg-orange-200 text-orange-800 rounded text-xs">
              {item.stage === "supported-elsewhere-filter" ? "Filter" : "Review"}
            </span>
            {item.header && (
              <span className="text-xs text-orange-700">[{item.header}]</span>
            )}
          </div>
          <p className="text-sm text-gray-700 mt-1">{truncate(item.quotedText, 80)}</p>
        </div>
        <ChevronRightIcon
          className={`h-4 w-4 text-gray-400 transition-transform ${expanded ? "rotate-90" : ""}`}
        />
      </div>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-orange-200">
          <p className="text-xs text-gray-600">
            <span className="font-medium">Reason:</span> {item.filterReason}
          </p>
          {item.supportLocation && (
            <p className="text-xs text-gray-500 mt-1">
              <span className="font-medium">Support found at:</span> {item.supportLocation}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function CommentCard({ comment, variant }: { comment: Comment; variant: "kept" | "lost" }) {
  const [expanded, setExpanded] = useState(false);
  const bgColor = variant === "kept" ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100";

  return (
    <div className={`p-3 rounded-md border ${bgColor}`}>
      <div
        className="flex items-start justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-gray-900">{comment.header || "Comment"}</span>
          <p className="text-sm text-gray-600 mt-1">{truncate(comment.quotedText, 80)}</p>
        </div>
        <ChevronRightIcon
          className={`h-4 w-4 text-gray-400 transition-transform ${expanded ? "rotate-90" : ""}`}
        />
      </div>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-600">{comment.description}</p>
          {comment.importance && (
            <p className="text-xs text-gray-500 mt-1">
              <span className="font-medium">Importance:</span> {comment.importance}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** Individual extractor card with collapsible details */
function ExtractorCard({ ext }: { ext: ExtractorInfo }) {
  const [showDetails, setShowDetails] = useState(false);
  const hasError = !!ext.error;
  const modelName = getModelDisplayName(ext.model);
  const tempDisplay = formatTemperature(ext);
  const reasoningDisplay = formatReasoning(ext);
  const inputTokens = ext.responseMetrics?.inputTokens;
  const outputTokens = ext.responseMetrics?.outputTokens;
  const cacheReadTokens = ext.responseMetrics?.cacheReadTokens;
  const cacheWriteTokens = ext.responseMetrics?.cacheWriteTokens;

  return (
    <div
      className={`p-3 rounded-md border ${
        hasError
          ? "bg-red-50 border-red-200"
          : "bg-blue-50 border-blue-100"
      }`}
    >
      {/* Header row: Model name + status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {hasError ? (
            <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
          ) : (
            <CheckCircleIcon className="h-4 w-4 text-green-500" />
          )}
          <span className={`font-medium ${hasError ? "text-red-900" : "text-blue-900"}`}>
            {modelName}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {ext.durationMs !== undefined && (
            <span className="text-xs text-gray-500 font-mono">
              {formatDuration(ext.durationMs)}
            </span>
          )}
          {ext.costUsd !== undefined && (
            <span className="text-xs text-gray-400">{formatCost(ext.costUsd)}</span>
          )}
          <span className={`font-mono ${hasError ? "text-red-700" : "text-blue-700"}`}>
            {ext.issuesFound} issue{ext.issuesFound !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Config row: temperature, reasoning */}
      <div className="flex flex-wrap gap-2 mt-2">
        {tempDisplay && (
          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
            {tempDisplay}
          </span>
        )}
        {reasoningDisplay && (
          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">
            {reasoningDisplay}
          </span>
        )}
      </div>

      {/* Error display */}
      {hasError && (
        <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-700">
          <span className="font-medium">Error:</span> {ext.error}
        </div>
      )}

      {/* Issue type breakdown if available */}
      {ext.issuesByType && Object.keys(ext.issuesByType).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {Object.entries(ext.issuesByType).map(([type, count]) => (
            <span
              key={type}
              className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded"
            >
              {type}: {count}
            </span>
          ))}
        </div>
      )}

      {/* Collapsible details toggle */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="mt-2 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
      >
        {showDetails ? (
          <ChevronDownIcon className="h-3 w-3" />
        ) : (
          <ChevronRightIcon className="h-3 w-3" />
        )}
        {showDetails ? "Hide details" : "Show details"}
      </button>

      {/* Collapsible details section */}
      {showDetails && (
        <div className="mt-2 pt-2 border-t border-gray-200 space-y-1.5">
          {/* Token usage */}
          {(inputTokens || outputTokens) && (
            <div className="text-xs text-gray-500">
              <span className="font-medium text-gray-600">Tokens:</span>{" "}
              {inputTokens && <span>in: {formatTokens(inputTokens)}</span>}
              {inputTokens && outputTokens && " · "}
              {outputTokens && <span>out: {formatTokens(outputTokens)}</span>}
              {cacheReadTokens ? (
                <span className="ml-2 text-green-600">cache read: {formatTokens(cacheReadTokens)}</span>
              ) : null}
              {cacheWriteTokens ? (
                <span className="ml-2 text-yellow-600">cache write: {formatTokens(cacheWriteTokens)}</span>
              ) : null}
            </div>
          )}

          {/* API params details */}
          {ext.actualApiParams && (
            <div className="text-xs text-gray-500">
              <span className="font-medium text-gray-600">API params:</span>{" "}
              temp={ext.actualApiParams.temperature}, maxTokens={ext.actualApiParams.maxTokens}
              {ext.actualApiParams.thinking && (
                <span className="ml-1">
                  , thinking budget: {formatTokens(ext.actualApiParams.thinking.budget_tokens)}
                </span>
              )}
              {ext.actualApiParams.reasoning?.effort && (
                <span className="ml-1">, reasoning: {ext.actualApiParams.reasoning.effort}</span>
              )}
            </div>
          )}

          {/* Response metrics */}
          {ext.responseMetrics && (
            <div className="text-xs text-gray-500">
              <span className="font-medium text-gray-600">Response:</span>{" "}
              {ext.responseMetrics.success ? "success" : "failed"}, latency: {ext.responseMetrics.latencyMs}ms
              {ext.responseMetrics.stopReason && (
                <span className="ml-1">, stop: {ext.responseMetrics.stopReason}</span>
              )}
            </div>
          )}

          {/* Full model ID */}
          <div className="text-xs text-gray-400">
            <span className="font-medium text-gray-600">Model ID:</span>{" "}
            <code className="bg-gray-100 px-1 rounded">{ext.model}</code>
          </div>
        </div>
      )}
    </div>
  );
}

/** Deduplication & Aggregation card showing both Jaccard dedup and Judge stages */
function DeduplicationCard({ extraction, extractorCount }: { extraction: ExtractionPhase; extractorCount: number }) {
  const [showDetails, setShowDetails] = useState(false);

  const totalFromExtractors = extraction.totalIssuesBeforeJudge ?? 0;
  const afterJaccardDedup = extraction.totalIssuesAfterDedup ?? totalFromExtractors;
  const afterJudge = extraction.totalIssuesAfterJudge ?? afterJaccardDedup;

  const jaccardRemoved = totalFromExtractors - afterJaccardDedup;
  const judgeRemoved = afterJaccardDedup - afterJudge;
  const totalRemoved = totalFromExtractors - afterJudge;

  const hasJudge = extraction.judgeDurationMs !== undefined;
  const judgeCost = extraction.judgeCostUsd;
  const overallRate = totalFromExtractors > 0 ? Math.round((totalRemoved / totalFromExtractors) * 100) : 0;

  return (
    <div className="p-3 bg-purple-50 border border-purple-100 rounded-md">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-purple-900">Deduplication & Aggregation</span>
        {hasJudge && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-purple-600 font-mono">
              judge: {formatDuration(extraction.judgeDurationMs)}
            </span>
            {judgeCost !== undefined && judgeCost > 0 && (
              <span className="text-xs text-purple-400 font-mono">
                {formatCost(judgeCost)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Flow visualization */}
      <div className="mt-3 flex items-center gap-2 text-xs">
        <div className="bg-purple-100 rounded px-2 py-1 text-center">
          <div className="text-purple-600 text-[10px]">Raw</div>
          <div className="font-mono text-purple-900 font-bold">{totalFromExtractors}</div>
        </div>
        <span className="text-purple-400">→</span>
        <div className="bg-purple-100 rounded px-2 py-1 text-center">
          <div className="text-purple-600 text-[10px]">Jaccard</div>
          <div className="font-mono text-purple-900">{afterJaccardDedup}</div>
          {jaccardRemoved > 0 && (
            <div className="text-[10px] text-red-500">-{jaccardRemoved}</div>
          )}
        </div>
        {hasJudge && (
          <>
            <span className="text-purple-400">→</span>
            <div className="bg-purple-100 rounded px-2 py-1 text-center">
              <div className="text-purple-600 text-[10px]">Judge</div>
              <div className="font-mono text-purple-900">{afterJudge}</div>
              {judgeRemoved > 0 && (
                <div className="text-[10px] text-red-500">-{judgeRemoved}</div>
              )}
            </div>
          </>
        )}
        <span className="text-purple-400">=</span>
        <div className="bg-green-100 rounded px-2 py-1 text-center">
          <div className="text-green-600 text-[10px]">Final</div>
          <div className="font-mono text-green-900 font-bold">{afterJudge}</div>
        </div>
        <span className="ml-2 text-purple-500 text-[10px]">
          ({overallRate}% reduced)
        </span>
      </div>

      {/* Collapsible details toggle */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="mt-2 text-xs text-purple-400 hover:text-purple-600 flex items-center gap-1"
      >
        {showDetails ? (
          <ChevronDownIcon className="h-3 w-3" />
        ) : (
          <ChevronRightIcon className="h-3 w-3" />
        )}
        {showDetails ? "Hide details" : "Show details"}
      </button>

      {/* Collapsible details */}
      {showDetails && (
        <div className="mt-2 pt-2 border-t border-purple-200 text-xs text-purple-700 space-y-2">
          <div>
            <span className="font-medium">Jaccard Dedup:</span> Merges issues with 70%+ word overlap, keeping higher quality version.
            {jaccardRemoved > 0 ? (
              <span className="ml-1 text-red-600">Removed {jaccardRemoved} duplicates.</span>
            ) : (
              <span className="ml-1 text-green-600">No duplicates found.</span>
            )}
          </div>
          {hasJudge && (
            <div>
              <span className="font-medium">LLM Judge:</span> Evaluates and merges semantically similar issues.
              {judgeRemoved > 0 ? (
                <span className="ml-1 text-red-600">Removed {judgeRemoved} issues.</span>
              ) : (
                <span className="ml-1 text-green-600">Kept all issues.</span>
              )}
            </div>
          )}
          {extraction.extractors && extraction.extractors.length > 0 && (
            <div>
              <span className="font-medium">Issues per extractor:</span>
              <ul className="ml-3 list-disc">
                {extraction.extractors.map((ext, i) => (
                  <li key={i}>
                    {ext.extractorId || getModelDisplayName(ext.model)}: {ext.issuesFound}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
