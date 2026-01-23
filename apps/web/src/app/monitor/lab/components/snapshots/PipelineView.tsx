"use client";

import { useState } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import type {
  ExtractionPhase,
  PipelineCounts,
  FilteredItem,
  PassedItem,
  Comment,
  StageMetrics,
} from "../../types";
import {
  formatDuration,
  formatCost,
  formatTokens,
  getFilterStageTitle,
} from "./pipelineUtils";
import { FilteredItemCard, PassedItemCard, CommentCard } from "./ItemCards";
import { ExtractorCard, DeduplicationCard } from "./ExtractorCards";

interface PipelineViewProps {
  extraction?: ExtractionPhase;
  counts?: PipelineCounts;
  filteredItems: FilteredItem[];
  passedItems?: PassedItem[];
  stages?: StageMetrics[];
  totalDurationMs?: number;
  finalComments: Comment[];
  lostComments: Comment[];
}

export function PipelineView({
  extraction,
  counts,
  filteredItems,
  passedItems,
  stages,
  totalDurationMs,
  finalComments,
  lostComments: _lostComments,
}: PipelineViewProps) {
  // Helper to get stage timing
  const getStageTiming = (stageName: string): StageMetrics | undefined => {
    return stages?.find((s) => s.stageName === stageName);
  };
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [expandedPassedSections, setExpandedPassedSections] = useState<Set<string>>(new Set());

  const togglePassedSection = (stageName: string) => {
    const newSet = new Set(expandedPassedSections);
    if (newSet.has(stageName)) {
      newSet.delete(stageName);
    } else {
      newSet.add(stageName);
    }
    setExpandedPassedSections(newSet);
  };

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

  const _filterRemoved = afterDedup - afterFilter;
  const reviewRemoved = commentsGenerated - commentsKept;

  // Calculate total cost from all extractors + judge + stages
  const extractorsCost = extractors.reduce((sum, ext) => sum + (ext.costUsd ?? 0), 0);
  const judgeCost = extraction?.judgeCostUsd ?? 0;
  const stagesCost = stages?.reduce((sum, s) => sum + (s.costUsd ?? 0), 0) ?? 0;
  const totalCostUsd = extractorsCost + judgeCost + stagesCost;

  // Get filter stages from telemetry (exclude extraction, comment-generation, review which have their own sections)
  const coreStages = new Set(["extraction", "comment-generation", "review"]);
  const filterStages = (stages ?? [])
    .filter((s) => !coreStages.has(s.stageName))
    .map((s) => s.stageName);

  // Separate filtered items by stage
  const getFilteredItemsForStage = (stageName: string): FilteredItem[] =>
    filteredItems.filter((item) => item.stage === stageName);
  const getPassedItemsForStage = (stageName: string): PassedItem[] =>
    (passedItems ?? []).filter((item) => item.stage === stageName);
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

        {/* Steps 2+: Dynamic Filter Stages */}
        {filterStages.map((stageName, index) => {
          const stageData = getStageTiming(stageName);
          const stageFilteredItems = getFilteredItemsForStage(stageName);
          const stagePassedItems = getPassedItemsForStage(stageName);
          const stageInputCount = stageData?.inputCount ?? afterDedup;
          const stageOutputCount = stageData?.outputCount ?? stageInputCount;
          const stageRemovedCount = stageFilteredItems.length;

          return (
            <PipelineStep
              key={stageName}
              step={stageName}
              title={getFilterStageTitle(stageName, index)}
              summary={`${stageOutputCount} kept, ${stageRemovedCount} filtered out`}
              timing={stageData?.durationMs}
              cost={stageData?.costUsd}
              isExpanded={expandedSteps.has(stageName)}
              onToggle={() => toggleStep(stageName)}
              color="orange"
            >
              <div className="space-y-3">
                <div className="p-3 bg-orange-50 rounded-md">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-orange-600">Input:</span>
                      <span className="font-mono ml-2">{stageInputCount}</span>
                    </div>
                    <div>
                      <span className="text-orange-600">Output:</span>
                      <span className="font-mono ml-2">{stageOutputCount}</span>
                    </div>
                  </div>
                  {/* Filter telemetry details */}
                  {stageData?.model && (
                    <div className="mt-2 pt-2 border-t border-orange-200 text-xs text-gray-500">
                      <span className="font-medium text-gray-600">Model:</span>{" "}
                      <code className="bg-gray-100 px-1 rounded">{stageData.model}</code>
                    </div>
                  )}
                  {stageData?.actualApiParams && (
                    <div className="text-xs text-gray-500 mt-1">
                      <span className="font-medium text-gray-600">API params:</span> temp=
                      {stageData.actualApiParams.temperature}, maxTokens=
                      {stageData.actualApiParams.maxTokens}
                      {stageData.actualApiParams.reasoning?.max_tokens && (
                        <span>
                          , reasoning: {formatTokens(stageData.actualApiParams.reasoning.max_tokens)}
                        </span>
                      )}
                      {stageData.actualApiParams.reasoning?.effort &&
                        !stageData.actualApiParams.reasoning.max_tokens && (
                          <span>, reasoning: {stageData.actualApiParams.reasoning.effort}</span>
                        )}
                    </div>
                  )}
                  {stageData?.responseMetrics && (
                    <div className="text-xs text-gray-500 mt-1">
                      <span className="font-medium text-gray-600">Response:</span>{" "}
                      {stageData.responseMetrics.inputTokens && (
                        <span>in: {formatTokens(stageData.responseMetrics.inputTokens)}</span>
                      )}
                      {stageData.responseMetrics.inputTokens &&
                        stageData.responseMetrics.outputTokens &&
                        " · "}
                      {stageData.responseMetrics.outputTokens && (
                        <span>out: {formatTokens(stageData.responseMetrics.outputTokens)}</span>
                      )}
                      {stageData.responseMetrics.latencyMs && (
                        <span>, latency: {stageData.responseMetrics.latencyMs}ms</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Passed Items (collapsed by default) */}
                {stagePassedItems.length > 0 && (
                  <div>
                    <button
                      onClick={() => togglePassedSection(stageName)}
                      className="flex items-center gap-1 text-sm font-medium text-green-700 hover:text-green-800 mb-2"
                    >
                      {expandedPassedSections.has(stageName) ? (
                        <ChevronDownIcon className="h-4 w-4" />
                      ) : (
                        <ChevronRightIcon className="h-4 w-4" />
                      )}
                      Passed Through ({stagePassedItems.length})
                    </button>
                    {expandedPassedSections.has(stageName) && (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {stagePassedItems.map((item, i) => (
                          <PassedItemCard key={i} item={item} />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {stageFilteredItems.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-orange-800 mb-2">
                      Filtered Out ({stageFilteredItems.length})
                    </h5>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {stageFilteredItems.map((item, i) => (
                        <FilteredItemCard key={i} item={item} />
                      ))}
                    </div>
                  </div>
                )}

                {stageFilteredItems.length === 0 && stageRemovedCount > 0 && (
                  <p className="text-sm text-gray-500 italic">
                    {stageRemovedCount} items filtered (details not available)
                  </p>
                )}
              </div>
            </PipelineStep>
          );
        })}

        {/* Comment Generation (step number = 2 + filterStages.length) */}
        <PipelineStep
          step="generation"
          title={`${2 + filterStages.length}. Comment Generation`}
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

        {/* Review (step number = 3 + filterStages.length) */}
        <PipelineStep
          step="review"
          title={`${3 + filterStages.length}. Review Filter`}
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
                : "-"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PipelineStep Component
// ============================================================================

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
