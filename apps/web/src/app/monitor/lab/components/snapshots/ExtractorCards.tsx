"use client";

import { useState } from "react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import type { ExtractorInfo, ExtractionPhase } from "../../types";
import {
  formatDuration,
  formatCost,
  formatTokens,
  getModelDisplayName,
  formatTemperature,
  formatReasoning,
} from "./pipelineUtils";

/**
 * Individual extractor card with collapsible details
 */
export function ExtractorCard({ ext }: { ext: ExtractorInfo }) {
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
        hasError ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-100"
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
            <span key={type} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
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
                <span className="ml-2 text-green-600">
                  cache read: {formatTokens(cacheReadTokens)}
                </span>
              ) : null}
              {cacheWriteTokens ? (
                <span className="ml-2 text-yellow-600">
                  cache write: {formatTokens(cacheWriteTokens)}
                </span>
              ) : null}
            </div>
          )}

          {/* API params details */}
          {ext.actualApiParams && (
            <div className="text-xs text-gray-500">
              <span className="font-medium text-gray-600">API params:</span> temp=
              {ext.actualApiParams.temperature}, maxTokens={ext.actualApiParams.maxTokens}
              {ext.actualApiParams.thinking && (
                <span className="ml-1">
                  , thinking budget: {formatTokens(ext.actualApiParams.thinking.budget_tokens)}
                </span>
              )}
              {ext.actualApiParams.reasoning?.max_tokens && (
                <span className="ml-1">
                  , reasoning budget: {formatTokens(ext.actualApiParams.reasoning.max_tokens)}
                </span>
              )}
              {ext.actualApiParams.reasoning?.effort &&
                !ext.actualApiParams.reasoning.max_tokens && (
                  <span className="ml-1">, reasoning: {ext.actualApiParams.reasoning.effort}</span>
                )}
            </div>
          )}

          {/* Response metrics */}
          {ext.responseMetrics && (
            <div className="text-xs text-gray-500">
              <span className="font-medium text-gray-600">Response:</span>{" "}
              {ext.responseMetrics.success ? "success" : "failed"}, latency:{" "}
              {ext.responseMetrics.latencyMs}ms
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

/**
 * Deduplication & Aggregation card showing both Jaccard dedup and Judge stages
 */
export function DeduplicationCard({
  extraction,
  extractorCount: _extractorCount,
}: {
  extraction: ExtractionPhase;
  extractorCount: number;
}) {
  const [showDetails, setShowDetails] = useState(false);

  const totalFromExtractors = extraction.totalIssuesBeforeJudge;
  const afterJaccardDedup = extraction.totalIssuesAfterDedup ?? totalFromExtractors;
  const afterJudge = extraction.totalIssuesAfterJudge;

  const jaccardRemoved = totalFromExtractors - afterJaccardDedup;
  const judgeRemoved = afterJaccardDedup - afterJudge;
  const totalRemoved = totalFromExtractors - afterJudge;

  const hasJudge = extraction.judgeDurationMs !== undefined;
  const judgeCost = extraction.judgeCostUsd;
  const overallRate =
    totalFromExtractors > 0 ? Math.round((totalRemoved / totalFromExtractors) * 100) : 0;

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
              <span className="text-xs text-purple-400 font-mono">{formatCost(judgeCost)}</span>
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
          {jaccardRemoved > 0 && <div className="text-[10px] text-red-500">-{jaccardRemoved}</div>}
        </div>
        {hasJudge && (
          <>
            <span className="text-purple-400">→</span>
            <div className="bg-purple-100 rounded px-2 py-1 text-center">
              <div className="text-purple-600 text-[10px]">Judge</div>
              <div className="font-mono text-purple-900">{afterJudge}</div>
              {judgeRemoved > 0 && <div className="text-[10px] text-red-500">-{judgeRemoved}</div>}
            </div>
          </>
        )}
        <span className="text-purple-400">=</span>
        <div className="bg-green-100 rounded px-2 py-1 text-center">
          <div className="text-green-600 text-[10px]">Final</div>
          <div className="font-mono text-green-900 font-bold">{afterJudge}</div>
        </div>
        <span className="ml-2 text-purple-500 text-[10px]">({overallRate}% reduced)</span>
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
            <span className="font-medium">Jaccard Dedup:</span> Merges issues with 70%+ word
            overlap, keeping higher quality version.
            {jaccardRemoved > 0 ? (
              <span className="ml-1 text-red-600">Removed {jaccardRemoved} duplicates.</span>
            ) : (
              <span className="ml-1 text-green-600">No duplicates found.</span>
            )}
          </div>
          {hasJudge && (
            <>
              <div>
                <span className="font-medium">LLM Judge:</span> Evaluates and merges semantically
                similar issues.
                {judgeRemoved > 0 ? (
                  <span className="ml-1 text-red-600">Removed {judgeRemoved} issues.</span>
                ) : (
                  <span className="ml-1 text-green-600">Kept all issues.</span>
                )}
              </div>
              {/* Judge telemetry details */}
              {extraction.judgeModel && (
                <div className="text-gray-500">
                  <span className="font-medium text-gray-600">Model:</span>{" "}
                  <code className="bg-gray-100 px-1 rounded">{extraction.judgeModel}</code>
                </div>
              )}
              {extraction.judgeActualApiParams && (
                <div className="text-gray-500">
                  <span className="font-medium text-gray-600">API params:</span> temp=
                  {extraction.judgeActualApiParams.temperature}, maxTokens=
                  {extraction.judgeActualApiParams.maxTokens}
                  {extraction.judgeActualApiParams.thinking && (
                    <span className="ml-1">
                      , thinking:{" "}
                      {formatTokens(extraction.judgeActualApiParams.thinking.budget_tokens)}
                    </span>
                  )}
                  {extraction.judgeActualApiParams.reasoning?.max_tokens && (
                    <span className="ml-1">
                      , reasoning:{" "}
                      {formatTokens(extraction.judgeActualApiParams.reasoning.max_tokens)}
                    </span>
                  )}
                  {extraction.judgeActualApiParams.reasoning?.effort &&
                    !extraction.judgeActualApiParams.reasoning.max_tokens && (
                      <span className="ml-1">
                        , reasoning: {extraction.judgeActualApiParams.reasoning.effort}
                      </span>
                    )}
                </div>
              )}
              {extraction.judgeResponseMetrics && (
                <div className="text-gray-500">
                  <span className="font-medium text-gray-600">Response:</span>{" "}
                  {extraction.judgeResponseMetrics.success ? "success" : "failed"}
                  {extraction.judgeResponseMetrics.latencyMs && (
                    <span>, latency: {extraction.judgeResponseMetrics.latencyMs}ms</span>
                  )}
                  {extraction.judgeResponseMetrics.inputTokens && (
                    <span>
                      , in: {formatTokens(extraction.judgeResponseMetrics.inputTokens)}
                    </span>
                  )}
                  {extraction.judgeResponseMetrics.outputTokens && (
                    <span>
                      , out: {formatTokens(extraction.judgeResponseMetrics.outputTokens)}
                    </span>
                  )}
                  {extraction.judgeResponseMetrics.stopReason && (
                    <span>, stop: {extraction.judgeResponseMetrics.stopReason}</span>
                  )}
                </div>
              )}
            </>
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
