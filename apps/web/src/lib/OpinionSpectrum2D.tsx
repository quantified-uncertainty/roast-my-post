"use client";

import { useState } from "react";

import {
  AlertTriangle,
  HelpCircle,
  Scale,
  ShieldAlert,
  Zap,
} from "lucide-react";

export type RefusalReason =
  | "Safety"
  | "Policy"
  | "MissingData"
  | "Unclear"
  | "Error";

export interface Opinion2DPoint {
  id: string;
  name: string;
  avatar: string;
  agreement: number; // 0-100: strongly disagree to strongly agree
  confidence: number; // 0-100: low to high confidence
  info?: string;
  refusalReason?: RefusalReason;
}

// Icon mapping for refusal reasons
const REFUSAL_ICONS: Record<
  RefusalReason,
  React.ComponentType<{ size?: number }>
> = {
  Safety: ShieldAlert,
  Policy: Scale,
  MissingData: HelpCircle,
  Unclear: AlertTriangle,
  Error: Zap,
};

// Calculate 2D offset for points that are close together
function getRadialOffset(
  person: Opinion2DPoint,
  allPeople: Opinion2DPoint[],
  proximityThreshold: number = 8,
  clusterRadius: number = 30
): { x: number; y: number } {
  // Find all people within proximity threshold
  const nearby = allPeople
    .filter((p) => {
      const dx = p.agreement - person.agreement;
      const dy = p.confidence - person.confidence;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < proximityThreshold;
    })
    .sort((a, b) => a.id.localeCompare(b.id)); // Consistent ordering

  if (nearby.length === 1) return { x: 0, y: 0 }; // No collision

  // Find this person's index in the nearby group
  const index = nearby.findIndex((p) => p.id === person.id);

  // Check if all points are at EXACT same position (distance = 0)
  const allExactSamePosition = nearby.every((p) => {
    const dx = p.agreement - person.agreement;
    const dy = p.confidence - person.confidence;
    return Math.sqrt(dx * dx + dy * dy) < 0.01; // Essentially 0
  });

  // Use tighter clustering for exact same position
  const effectiveRadius = allExactSamePosition
    ? clusterRadius * 0.4
    : clusterRadius;

  // Arrange in a circle around the centroid
  const angle = (index / nearby.length) * Math.PI * 2;
  return {
    x: Math.cos(angle) * effectiveRadius,
    y: Math.sin(angle) * effectiveRadius,
  };
}

// Shared tooltip component
interface TooltipProps {
  person: Opinion2DPoint;
  borderColor?: string;
  darkTextColor?: string;
  positioning: React.CSSProperties;
  showMetrics?: boolean;
  refusalReason?: RefusalReason;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

function Tooltip({
  person,
  borderColor = "#9ca3af",
  darkTextColor,
  positioning,
  showMetrics = false,
  refusalReason,
  onMouseEnter,
  onMouseLeave,
}: TooltipProps) {
  return (
    <div
      className="absolute z-20 w-64 rounded-lg border-2 bg-white px-3 py-2 shadow-xl"
      style={{
        ...positioning,
        borderColor: borderColor,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="text-sm font-semibold">{person.name}</div>
      {person.info && (
        <div className="mt-1 text-xs text-gray-600">{person.info}</div>
      )}
      {showMetrics ? (
        <div className="mt-1 text-xs text-gray-500">
          Agreement:{" "}
          <span className="font-semibold" style={{ color: darkTextColor }}>
            {person.agreement}%
          </span>{" "}
          | Confidence:{" "}
          <span
            className="font-semibold"
            style={{
              color: `rgb(${150 - Math.round(person.confidence * 1.5)}, ${150 - Math.round(person.confidence * 1.5)}, ${150 - Math.round(person.confidence * 1.5)})`,
            }}
          >
            {person.confidence}%
          </span>
        </div>
      ) : refusalReason ? (
        <div className="mt-1 text-xs text-gray-500">
          Issue:{" "}
          <span className="font-semibold text-gray-700">{refusalReason}</span>
        </div>
      ) : null}
    </div>
  );
}

interface AvatarProps {
  person: Opinion2DPoint;
  allPeople: Opinion2DPoint[];
  onHover: () => void;
  isHovered: boolean;
  proximityThreshold?: number;
  clusterRadius?: number;
}

function Avatar({
  person,
  allPeople,
  onHover,
  isHovered,
  proximityThreshold = 8,
  clusterRadius = 30,
}: AvatarProps) {
  const offset = getRadialOffset(
    person,
    allPeople,
    proximityThreshold,
    clusterRadius
  );

  // Calculate color based on position
  // agreement: 0-100, confidence: 0-100
  // agreement 0 = strongly disagree (left side), 100 = strongly agree (right side)
  // Normalize to 0-1
  const normalizedAgreement = (100 - person.agreement) / 100; // 0 = agree (right/green), 1 = disagree (left/red)
  const normalizedConfidence = person.confidence / 100; // 0 = bottom (low), 1 = top (high)

  // Red → Orange → Yellow → Green gradient
  // normalizedAgreement 0 (agree/right) = Green
  // normalizedAgreement 0.33 = Yellow
  // normalizedAgreement 0.67 = Orange
  // normalizedAgreement 1 (disagree/left) = Red
  let red, green, blue;

  if (normalizedAgreement < 0.33) {
    // Green to Yellow (0 to 0.33)
    const t = normalizedAgreement / 0.33;
    red = Math.round(255 * t);
    green = 255;
    blue = 0;
  } else if (normalizedAgreement < 0.67) {
    // Yellow to Orange (0.33 to 0.67)
    const t = (normalizedAgreement - 0.33) / 0.34;
    red = 255;
    green = Math.round(255 * (1 - t * 0.35)); // 255 to ~165
    blue = 0;
  } else {
    // Orange to Red (0.67 to 1)
    const t = (normalizedAgreement - 0.67) / 0.33;
    red = 255;
    green = Math.round(165 * (1 - t)); // 165 to 0
    blue = 0;
  }

  // Desaturate based on confidence (low confidence = more gray)
  const saturation = normalizedConfidence;
  const grayValue = 220; // Lighter gray for low-confidence items

  const finalRed = Math.round(red * saturation + grayValue * (1 - saturation));
  const finalGreen = Math.round(
    green * saturation + grayValue * (1 - saturation)
  );
  const finalBlue = Math.round(
    blue * saturation + grayValue * (1 - saturation)
  );

  const bgColor = `rgb(${finalRed}, ${finalGreen}, ${finalBlue})`;

  // Calculate border color (darker version)
  const borderRed = Math.max(0, finalRed - 60);
  const borderGreen = Math.max(0, finalGreen - 60);
  const borderBlue = Math.max(0, finalBlue - 60);
  const borderColor = `rgb(${borderRed}, ${borderGreen}, ${borderBlue})`;

  // Calculate dark text color for tooltip (based on base color, not desaturated)
  const darkRed = Math.round(red * 0.6);
  const darkGreen = Math.round(green * 0.6);
  const darkBlue = Math.round(blue * 0.6);
  const darkTextColor = `rgb(${darkRed}, ${darkGreen}, ${darkBlue})`;

  // Text color (dark for light backgrounds, light for dark backgrounds)
  const brightness =
    (finalRed * 299 + finalGreen * 587 + finalBlue * 114) / 1000;
  const textColor = brightness > 155 ? "text-gray-800" : "text-white";

  return (
    <>
      <div
        className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 text-xs font-semibold transition-all duration-200 ${textColor} ${isHovered ? "z-10 scale-125 shadow-lg" : "hover:scale-110"} `}
        onMouseEnter={onHover}
        style={{
          position: "absolute",
          left: `${person.agreement}%`,
          top: `${100 - person.confidence}%`,
          transform: `translate(calc(-50% + ${offset.x}px), calc(-50% - ${offset.y}px))`,
          backgroundColor: bgColor,
          borderColor: borderColor,
          opacity: 0.8,
        }}
      >
        {person.avatar}
      </div>

      {isHovered && (
        <Tooltip
          person={person}
          borderColor={borderColor}
          darkTextColor={darkTextColor}
          positioning={{
            left: person.agreement < 50 ? `${person.agreement}%` : "auto",
            right:
              person.agreement >= 50 ? `${100 - person.agreement}%` : "auto",
            top: `${100 - person.confidence}%`,
            transform: `translate(${person.agreement < 50 ? offset.x : -offset.x}px, calc(-50% - ${offset.y}px - 70px))`,
          }}
          showMetrics={true}
          onMouseEnter={() => {}}
          onMouseLeave={() => {}}
        />
      )}
    </>
  );
}

export interface OpinionSpectrum2DProps {
  data: Opinion2DPoint[];
  height?: string; // Tailwind height class, e.g., "h-96"
  showGridLines?: boolean;
  showAxisLabels?: boolean;
  proximityThreshold?: number; // Distance threshold for collision detection (default: 8)
  clusterRadius?: number; // Radius for radial clustering (default: 30px)
  className?: string;
}

// Helper function to get agreement label and color
function getAgreementLabelAndColor(agreement: number): {
  label: string;
  color: string;
} {
  if (agreement >= 80)
    return {
      label: "Strongly Agree",
      color: "border-green-500 text-green-700",
    };
  if (agreement >= 60)
    return { label: "Agree", color: "border-green-400 text-green-600" };
  if (agreement >= 40)
    return { label: "Neutral", color: "border-gray-400 text-gray-600" };
  if (agreement >= 20)
    return { label: "Disagree", color: "border-red-400 text-red-600" };
  return { label: "Strongly Disagree", color: "border-red-500 text-red-700" };
}

// Successful response details
interface SuccessfulResponse {
  agreement: number;
  confidence: number;
  reasoning: string;
}

// Failed response details
interface FailedResponse {
  error: string;
  refusalReason: RefusalReason;
  errorDetails?: string;
}

// Evaluation result
interface EvaluationResult {
  model: string;
  provider: string;
  hasError: boolean;
  responseTimeMs?: number;
  rawResponse?: string;
  thinkingText?: string;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  successfulResponse?: SuccessfulResponse;
  failedResponse?: FailedResponse;
}

export interface ClaimEvaluationResult {
  evaluations: EvaluationResult[];
  consensus?: {
    mean: number;
    stdDev: number;
    range: { min: number; max: number };
  };
}

export interface ClaimEvaluationDisplayProps {
  result: ClaimEvaluationResult;
  getModelAbbrev: (modelId: string) => string;
}

// Type aliases for grouped results
type GroupedResults = Record<
  string,
  (EvaluationResult & { successfulResponse: SuccessfulResponse })[]
>;
type GroupedFailed = Record<
  string,
  (EvaluationResult & { failedResponse: FailedResponse })[]
>;

export function ClaimEvaluationDisplay({
  result,
  getModelAbbrev,
}: ClaimEvaluationDisplayProps) {
  const [showRawJSON, setShowRawJSON] = useState(false);

  // Guard against missing evaluations array
  if (!result.evaluations) {
    return (
      <div className="mt-6 rounded-lg border border-yellow-200 bg-yellow-50 p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-yellow-900 mb-2">No Evaluation Data</h3>
        <p className="text-sm text-yellow-700">
          This evaluation does not contain any results yet or the data format is incomplete.
        </p>
      </div>
    );
  }

  // Split evaluations into successful and failed
  const successfulEvaluations = result.evaluations.filter(
    (e): e is EvaluationResult & { successfulResponse: SuccessfulResponse } =>
      !e.hasError && !!e.successfulResponse
  );
  const failedEvaluations = result.evaluations.filter(
    (e): e is EvaluationResult & { failedResponse: FailedResponse } =>
      e.hasError && !!e.failedResponse
  );

  // Convert successful results to Opinion2DPoint format
  const successfulOpinions: Opinion2DPoint[] = successfulEvaluations.map(
    (r, i) => ({
      id: `success-${i}`,
      name: r.model,
      avatar: getModelAbbrev(r.model),
      agreement: r.successfulResponse.agreement,
      confidence: r.successfulResponse.confidence ?? 50,
      info: r.successfulResponse.reasoning,
    })
  );

  // Convert failed evaluations to Opinion2DPoint format
  const failedOpinions: Opinion2DPoint[] = failedEvaluations.map((f, i) => ({
    id: `failed-${i}`,
    name: f.model,
    avatar: getModelAbbrev(f.model),
    agreement: 0,
    confidence: 0,
    info: f.failedResponse.error,
    refusalReason: f.failedResponse.refusalReason,
  }));

  // Combine successful and failed results
  const opinion2DData: Opinion2DPoint[] = [
    ...successfulOpinions,
    ...failedOpinions,
  ];

  // Group ALL evaluations by model (both successful and failed)
  type ModelGroup = {
    modelId: string;
    provider: string;
    runs: (EvaluationResult & { successfulResponse: SuccessfulResponse })[];
    failures: (EvaluationResult & { failedResponse: FailedResponse })[];
  };

  const allModelGroups: ModelGroup[] = Object.values(
    result.evaluations.reduce(
      (acc, evaluation) => {
        const modelId = evaluation.model;

        if (!acc[modelId]) {
          acc[modelId] = {
            modelId,
            provider: evaluation.provider,
            runs: [],
            failures: [],
          };
        }

        if (!evaluation.hasError && evaluation.successfulResponse) {
          acc[modelId].runs.push(
            evaluation as EvaluationResult & {
              successfulResponse: SuccessfulResponse;
            }
          );
        } else if (evaluation.hasError && evaluation.failedResponse) {
          acc[modelId].failures.push(
            evaluation as EvaluationResult & { failedResponse: FailedResponse }
          );
        }

        return acc;
      },
      {} as Record<string, ModelGroup>
    )
  ).sort((a, b) => {
    // Sort by provider first, then model name
    if (a.provider !== b.provider) {
      return a.provider.localeCompare(b.provider);
    }
    return a.modelId.localeCompare(b.modelId);
  });

  const hasMultipleRuns = allModelGroups.some((group) => group.runs.length > 1);

  return (
    <div className="space-y-6">
      {/* Consensus Summary - only show if we have successful results */}
      {successfulOpinions.length > 0 && result.consensus && (
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-medium text-gray-600">Consensus</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Mean Agreement:</span>
              <span className="ml-2 font-semibold">
                {result.consensus.mean}%
              </span>
            </div>
            <div>
              <span className="text-gray-600">Std Dev:</span>
              <span className="ml-2 font-semibold">
                {result.consensus.stdDev}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Range:</span>
              <span className="ml-2 font-semibold">
                {result.consensus.range.min}% - {result.consensus.range.max}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 2D Opinion Spectrum Visualization */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <OpinionSpectrum2D
          data={opinion2DData}
          height="h-96"
          proximityThreshold={5}
          clusterRadius={20}
        />
      </div>

      {/* Individual Model Results - Grouped by Model */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-600">Model Responses</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setShowRawJSON(false)}
              className={`rounded-lg px-3 py-1 text-sm font-medium transition-colors ${
                !showRawJSON
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Visual View
            </button>
            <button
              onClick={() => setShowRawJSON(true)}
              className={`rounded-lg px-3 py-1 text-sm font-medium transition-colors ${
                showRawJSON
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Raw JSON
            </button>
          </div>
        </div>

        {showRawJSON ? (
          <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded bg-gray-50 p-4 font-mono text-sm">
            {JSON.stringify(result, null, 2)}
          </pre>
        ) : (
          <div className="space-y-4">
            {/* All Results - Sorted by provider then model */}
            {allModelGroups.map((group) => {
              if (group.runs.length > 0) {
                const { modelId, runs } = group;
                const firstRun = runs[0];

                // Calculate stats for multiple runs
                const agreements = runs.map(
                  (r: any) => r.successfulResponse.agreement
                );
                const confidences = runs.map(
                  (r: any) => r.successfulResponse.confidence
                );
                const avgAgreement =
                  agreements.reduce((a: number, b: number) => a + b, 0) /
                  agreements.length;
                const avgConfidence =
                  confidences.reduce((a: number, b: number) => a + b, 0) /
                  confidences.length;

                const { label, color } =
                  getAgreementLabelAndColor(avgAgreement);

                return (
                  <div key={modelId} className="rounded-lg border-2 p-4">
                    {/* Model Header */}
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <span className="text-lg font-medium">{modelId}</span>
                        <span className="ml-2 text-sm text-gray-500">
                          ({firstRun.provider})
                        </span>
                        {hasMultipleRuns && (
                          <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                            {runs.length} {runs.length === 1 ? "run" : "runs"}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-sm font-semibold ${color}`}
                        >
                          {label}
                        </span>
                        <span className="text-sm text-gray-500">
                          ({Math.round(avgAgreement)}% avg)
                        </span>
                      </div>
                    </div>

                    {/* Average Stats for Multiple Runs */}
                    {hasMultipleRuns && runs.length > 1 && (
                      <div className="mb-3 rounded bg-gray-50 p-3 text-sm">
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <span className="text-gray-600">
                              Avg Agreement:
                            </span>
                            <span className="ml-2 font-semibold">
                              {Math.round(avgAgreement)}%
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">
                              Avg Confidence:
                            </span>
                            <span className="ml-2 font-semibold">
                              {Math.round(avgConfidence)}%
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">
                              Agreement Range:
                            </span>
                            <span className="ml-2 font-semibold">
                              {Math.min(...agreements)}%-
                              {Math.max(...agreements)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Individual Runs */}
                    <div className="space-y-2">
                      {runs.map((r: any, runIdx: number) => {
                        return (
                          <div
                            key={runIdx}
                            className={`rounded-lg p-3 ${hasMultipleRuns && runs.length > 1 ? "border bg-white" : ""}`}
                          >
                            {hasMultipleRuns && runs.length > 1 && (
                              <div className="mb-2 text-xs font-semibold text-gray-500">
                                Run #{runIdx + 1}
                              </div>
                            )}
                            <div className="mb-2 flex items-center gap-4 text-sm">
                              <span className="text-gray-600">
                                Agreement:{" "}
                                <span className="font-semibold text-gray-900">
                                  {r.successfulResponse.agreement}%
                                </span>
                              </span>
                              <span className="text-gray-600">
                                Confidence:{" "}
                                <span className="font-semibold text-gray-900">
                                  {r.successfulResponse.confidence}%
                                </span>
                              </span>
                            </div>
                            <p className="text-sm italic text-gray-700">
                              &ldquo;{r.successfulResponse.reasoning}&rdquo;
                            </p>
                            {r.thinkingText && (
                              <details className="mt-2">
                                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                                  View extended reasoning
                                </summary>
                                <div className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap rounded bg-gray-50 p-3 text-xs text-gray-700">
                                  {r.thinkingText}
                                </div>
                              </details>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              } else if (group.failures.length > 0) {
                // Failed result
                const { modelId, failures } = group;
                const firstFailure = failures[0];

                // Get icon for refusal reason
                const RefusalIcon =
                  REFUSAL_ICONS[
                    firstFailure.failedResponse.refusalReason as RefusalReason
                  ] || AlertTriangle;

                return (
                  <div
                    key={`failed-${modelId}`}
                    className="rounded-lg border-2 border-gray-200 bg-gray-50 p-4"
                  >
                    {/* Model Header */}
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <span className="text-lg font-medium">{modelId}</span>
                        <span className="ml-2 text-sm text-gray-500">
                          ({firstFailure.provider})
                        </span>
                        {failures.length > 1 && (
                          <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                            {failures.length}{" "}
                            {failures.length === 1 ? "failure" : "failures"}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-red-500">
                          <RefusalIcon size={20} />
                        </div>
                        <span className="rounded-full border-2 border-red-400 bg-white px-3 py-1 text-sm font-semibold text-red-700">
                          {firstFailure.failedResponse.refusalReason}
                        </span>
                      </div>
                    </div>

                    {/* Individual Failures */}
                    <div className="space-y-2">
                      {failures.map((f: any, failIdx: number) => {
                        return (
                          <div
                            key={failIdx}
                            className={`rounded-lg p-3 ${failures.length > 1 ? "border border-gray-200 bg-white" : ""}`}
                          >
                            {failures.length > 1 && (
                              <div className="mb-2 text-xs font-semibold text-gray-500">
                                Failure #{failIdx + 1}
                              </div>
                            )}
                            <p className="text-sm italic text-gray-700">
                              &ldquo;{f.failedResponse.error}&rdquo;
                            </p>
                            {f.rawResponse && (
                              <details className="mt-2">
                                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                                  View raw response
                                </summary>
                                <div className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap rounded bg-gray-50 p-3 text-xs text-gray-700">
                                  {f.rawResponse}
                                </div>
                              </details>
                            )}
                            {f.failedResponse.errorDetails && (
                              <details className="mt-2">
                                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                                  View error details
                                </summary>
                                <div className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap rounded bg-gray-50 p-3 text-xs text-gray-700">
                                  {f.failedResponse.errorDetails}
                                </div>
                              </details>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function OpinionSpectrum2D({
  data,
  height = "h-64",
  showGridLines = true,
  showAxisLabels = true,
  proximityThreshold = 8,
  clusterRadius = 30,
  className = "",
}: OpinionSpectrum2DProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Split data into regular opinions and refusals
  const regularData = data.filter((p) => !p.refusalReason);
  const refusals = data.filter((p) => p.refusalReason);

  // Check if all responses failed (only refusals, no regular data)
  const allResponsesFailed = regularData.length === 0 && refusals.length > 0;

  // Group refusals by reason
  const refusalsByReason = refusals.reduce(
    (acc, person) => {
      const reason = person.refusalReason!;
      if (!acc[reason]) acc[reason] = [];
      acc[reason].push(person);
      return acc;
    },
    {} as Record<RefusalReason, Opinion2DPoint[]>
  );

  return (
    <div className={className}>
      <div className="flex gap-4">
        {/* Main visualization area */}
        <div className="flex-1">
          {allResponsesFailed ? (
            /* All Responses Failed State */
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <AlertTriangle className="mb-2 h-8 w-16 text-gray-300" />
              <h4 className="mb-2 text-xl font-semibold text-gray-600">
                All Responses Failed
              </h4>
              <p className="text-gray-400">
                There is no data to display in the chart.
              </p>
            </div>
          ) : (
            <>
              {/* Top label */}
              {showAxisLabels && (
                <div className="mb-6 text-center text-sm font-semibold text-gray-400">
                  ↑ High Confidence
                </div>
              )}

              {/* 2D Grid container */}
              <div className={`relative w-full ${height} rounded`}>
                {/* Grid lines */}
                {showGridLines && (
                  <div className="absolute inset-0">
                    {/* Vertical lines */}
                    {[0, 100].map((pos) => (
                      <div
                        key={`v-${pos}`}
                        className="absolute h-full"
                        style={{
                          left: `${pos}%`,
                          borderLeft: "1px solid #ddd",
                        }}
                      />
                    ))}
                    {/* Horizontal lines */}
                    {[0, 100].map((pos) => (
                      <div
                        key={`h-${pos}`}
                        className="absolute w-full"
                        style={{
                          bottom: `${pos}%`,
                          borderTop: "1px solid #ddd",
                        }}
                      />
                    ))}
                    {/* Center cross-hair (darker than outer border) */}
                    <div
                      className="absolute w-full"
                      style={{
                        bottom: "50%",
                        borderTop: "2px solid #aaa",
                      }}
                    />
                    <div
                      className="absolute h-full"
                      style={{
                        left: "50%",
                        borderLeft: "1px solid #ddd",
                      }}
                    />
                  </div>
                )}

                {/* Avatars - only show non-refused */}
                <div
                  className="absolute inset-0"
                  onMouseLeave={() => setHoveredId(null)}
                >
                  {regularData.map((person) => (
                    <Avatar
                      key={person.id}
                      person={person}
                      allPeople={regularData}
                      onHover={() => setHoveredId(person.id)}
                      isHovered={hoveredId === person.id}
                      proximityThreshold={proximityThreshold}
                      clusterRadius={clusterRadius}
                    />
                  ))}
                </div>
              </div>

              {/* X-axis labels */}
              {showAxisLabels && (
                <div className="relative mt-4 h-6 text-sm font-semibold">
                  <span className="absolute left-0 text-red-600">
                    ← Strongly Disagree
                  </span>
                  <span className="absolute right-0 text-green-600">
                    Strongly Agree →
                  </span>
                </div>
              )}
              {/* Bottom label */}
              {showAxisLabels && (
                <div className="mt-2 text-center text-sm font-semibold text-gray-400">
                  ↓ Low Confidence
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Refusals Section */}
      {refusals.length > 0 && (
        <div className="mt-4 border-t border-gray-200 pt-2">
          <div className="flex items-center justify-center gap-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Errors
            </h3>
            <div className="flex flex-wrap items-center gap-6">
              {(
                [
                  "Safety",
                  "Policy",
                  "MissingData",
                  "Unclear",
                  "Error",
                ] as RefusalReason[]
              ).map((reason) => {
                const reasonModels = refusalsByReason[reason];
                if (!reasonModels || reasonModels.length === 0) return null;

                const IconComponent = REFUSAL_ICONS[reason];

                return (
                  <div key={reason} className="flex items-center gap-2 p-2">
                    <div className="flex items-center">
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-gray-300`}
                      >
                        <IconComponent size={16} />
                      </div>
                      <span className="text-sm font-medium text-gray-400">
                        {reason}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {reasonModels.map((person) => (
                        <div key={person.id} className="relative">
                          <div
                            className={`flex h-8 w-auto cursor-pointer items-center justify-center rounded-full border-2 border-gray-200 bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 transition-all ${hoveredId === person.id ? "z-10 scale-110 shadow-md" : "hover:scale-105"}`}
                            onMouseEnter={() => setHoveredId(person.id)}
                          >
                            {person.avatar}
                          </div>
                          {hoveredId === person.id && (
                            <Tooltip
                              person={person}
                              positioning={{
                                top: "-90px",
                                left: "50%",
                                transform: "translateX(-50%)",
                              }}
                              refusalReason={reason}
                              onMouseEnter={() => setHoveredId(person.id)}
                              onMouseLeave={() => setHoveredId(null)}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
