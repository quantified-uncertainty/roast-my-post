"use client";

import { useState } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import type { ExtractionPhase, PipelineCounts, FilteredItem, Comment, StageMetrics } from "../../types";
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

  const dedupRemoved = totalExtracted - afterDedup;
  const filterRemoved = afterDedup - afterFilter;
  const reviewRemoved = commentsGenerated - commentsKept;

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
          summary={`${totalExtracted} issues from ${extractors.length} models`}
          timing={getStageTiming("extraction")?.durationMs}
          isExpanded={expandedSteps.has("extraction")}
          onToggle={() => toggleStep("extraction")}
          color="blue"
        >
          <div className="space-y-3">
            {extractors.map((ext, i) => (
              <div key={i} className="p-3 bg-blue-50 rounded-md">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-blue-900">{ext.extractorId}</span>
                  <div className="flex items-center gap-3">
                    {ext.durationMs !== undefined && (
                      <span className="text-xs text-blue-500 font-mono">{formatDuration(ext.durationMs)}</span>
                    )}
                    {ext.costUsd !== undefined && (
                      <span className="text-xs text-blue-400">{formatCost(ext.costUsd)}</span>
                    )}
                    <span className="text-blue-700 font-mono">{ext.issuesFound} issues</span>
                  </div>
                </div>
                <div className="text-xs text-blue-600 mt-1">{ext.model}</div>
              </div>
            ))}
            {extractors.length === 0 && (
              <p className="text-sm text-gray-500 italic">No extractor data available</p>
            )}
            {extraction?.judgeDurationMs !== undefined && (
              <div className="p-2 bg-blue-100 rounded-md text-xs text-blue-700">
                Judge aggregation: {formatDuration(extraction.judgeDurationMs)}
              </div>
            )}
          </div>
        </PipelineStep>

        {/* Step 2: Deduplication */}
        <PipelineStep
          step="dedup"
          title="2. Deduplication"
          summary={`${afterDedup} kept, ${dedupRemoved} duplicates removed`}
          timing={getStageTiming("deduplication")?.durationMs}
          isExpanded={expandedSteps.has("dedup")}
          onToggle={() => toggleStep("dedup")}
          color="purple"
        >
          <div className="space-y-3">
            {/* Per-model input breakdown */}
            {extractors.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-purple-800 mb-2">Input by Model</h5>
                <div className="grid grid-cols-1 gap-2">
                  {extractors.map((ext, i) => {
                    // Calculate approximate survival rate (proportional)
                    const survivalRate = totalExtracted > 0
                      ? (afterDedup / totalExtracted)
                      : 0;
                    const estimatedKept = Math.round(ext.issuesFound * survivalRate);

                    return (
                      <div key={i} className="p-2 bg-purple-50 rounded-md flex items-center justify-between">
                        <span className="text-sm text-purple-900">{ext.extractorId}</span>
                        <div className="text-sm">
                          <span className="font-mono text-purple-700">{ext.issuesFound}</span>
                          <span className="text-purple-400 mx-1">→</span>
                          <span className="font-mono text-purple-600">~{estimatedKept}</span>
                          <span className="text-purple-400 text-xs ml-1">(est.)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Summary stats */}
            <div className="p-3 bg-purple-100 rounded-md">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-purple-600">Total Input:</span>
                  <span className="font-mono ml-2">{totalExtracted}</span>
                </div>
                <div>
                  <span className="text-purple-600">Total Output:</span>
                  <span className="font-mono ml-2 font-bold">{afterDedup}</span>
                </div>
                <div>
                  <span className="text-purple-600">Duplicates Removed:</span>
                  <span className="font-mono ml-2 text-red-600">-{dedupRemoved}</span>
                </div>
                <div>
                  <span className="text-purple-600">Dedup Rate:</span>
                  <span className="font-mono ml-2">
                    {totalExtracted > 0 ? Math.round((dedupRemoved / totalExtracted) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-500">
              Semantic deduplication merges similar issues across models. Per-model estimates assume uniform dedup rate.
            </p>
          </div>
        </PipelineStep>

        {/* Step 3: Filtering */}
        <PipelineStep
          step="filter"
          title="3. Supported-Elsewhere Filter"
          summary={`${afterFilter} kept, ${filterRemoved} filtered out`}
          timing={getStageTiming("supported-elsewhere-filter")?.durationMs}
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

        {/* Step 4: Comment Generation */}
        <PipelineStep
          step="generation"
          title="4. Comment Generation"
          summary={`${commentsGenerated} comments generated`}
          timing={getStageTiming("comment-generation")?.durationMs}
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

        {/* Step 5: Review */}
        <PipelineStep
          step="review"
          title="5. Review Filter"
          summary={`${commentsKept} kept, ${reviewRemoved} removed`}
          timing={getStageTiming("review")?.durationMs}
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
  isExpanded: boolean;
  onToggle: () => void;
  color: "blue" | "purple" | "orange" | "teal" | "green";
  children: React.ReactNode;
}

function PipelineStep({
  title,
  summary,
  timing,
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
