"use client";

import React from "react";

import { ToolPageTemplate } from "@/components/tools/form-generators";
import {
  extractForecastingClaimsTool,
} from "@/tools/extract-forecasting-claims";

export default function ExtractForecastingClaimsAutoPage() {
  return (
    <ToolPageTemplate
      tool={extractForecastingClaimsTool}
      formConfig={{
        fieldOrder: [
          "text",
          "additionalContext",
          "maxDetailedAnalysis",
          "minQualityThreshold",
        ],
        fieldConfigs: {
          text: {
            label: "Text to Analyze",
            placeholder:
              "Paste text containing predictions, forecasts, or future-oriented claims...",
            helpText:
              "The tool will extract and analyze forecasting claims from this text",
            rows: 10,
          },
          additionalContext: {
            label: "Additional Context",
            placeholder:
              'Optional: Provide background about the document, company, or topic (e.g., "This is from Apple\'s Q3 2024 earnings call discussing their Vision Pro product")',
            helpText:
              "Context helps make predictions more specific by replacing pronouns and vague references",
            rows: 3,
          },
          maxDetailedAnalysis: {
            label: "Maximum Number of Detailed Analyses",
            helpText:
              "Maximum forecasts to extract and analyze (1-10). May return fewer if not enough quality predictions found.",
            min: 1,
            max: 10,
            step: 1,
          },
          minQualityThreshold: {
            label: "Minimum Quality Threshold",
            helpText:
              "Only return forecasts with average score (precision, verifiability, importance) above this threshold (0-100). Leave empty to include all forecasts.",
            placeholder: "Optional: e.g., 60",
            min: 0,
            max: 100,
            step: 5,
          },
        },
        submitButtonText: "Extract Forecasts",
        submitButtonColor: "blue",
        examples: [
          {
            name: "Business Strategy Document",
            description: "Corporate predictions and market forecasts",
            data: {
              text: `Our strategic outlook for the next five years is highly optimistic. We expect revenue to grow by 15-20% annually, driven by expansion into Asian markets. The cloud services division will likely become our largest revenue generator by 2026, surpassing traditional software licenses.

Market consolidation is inevitable - we predict that 3-4 major players will control 80% of the market by 2027. AI integration will be table stakes by 2025, and companies without robust AI capabilities will struggle to compete.

Our R&D investments will increase to 25% of revenue by 2025, up from the current 18%. We anticipate launching at least 5 major product innovations in the next 24 months. The enterprise segment will grow faster than SMB, with enterprise contracts expected to reach $500M by fiscal 2026.`,
              additionalContext:
                'This is from Salesforce\'s 2025 strategic planning document. Current revenue is $35B. Main competitors are Microsoft Dynamics, Oracle, and SAP. The "market" refers to the global CRM and enterprise software market.',
              maxDetailedAnalysis: 5,
            },
          },
          {
            name: "Technology Trends Report",
            description: "Tech industry predictions",
            data: {
              text: `Quantum computing will reach practical applications by 2028, with financial services being the first major adopters. We expect at least one major breakthrough in room-temperature superconductors before 2030.

Autonomous vehicles will achieve Level 5 autonomy in controlled environments by 2026, though widespread adoption won't occur until 2030 due to regulatory challenges. Electric vehicles will constitute 40% of new car sales by 2027.

The metaverse hype will fade by 2025, but AR glasses will see mainstream adoption by 2028. AI will automate 30% of current white-collar tasks by 2030.`,
              additionalContext:
                'This is from McKinsey\'s 2025 Technology Outlook report. "New car sales" refers to global passenger vehicle sales. "White-collar tasks" refers to office and knowledge work as defined by the Bureau of Labor Statistics.',
              maxDetailedAnalysis: 4,
            },
          },
          {
            name: "Economic Forecast",
            description: "Predictions with explicit probabilities",
            data: {
              text: `The Federal Reserve will likely cut interest rates by 75-100 basis points in 2025. There's a 70% chance that inflation will stabilize around 2.5% by mid-2025. Unemployment may rise slightly to 4.2% as the economy cools.

Economists estimate an 85% probability that GDP growth will moderate to 2.0-2.5% annually through 2026. The housing market will see a correction of 10-15% in major metropolitan areas by late 2025.`,
              maxDetailedAnalysis: 3,
            },
          },
        ],
      }}
      renderResults={(result) => {
        const typedResult = result as any;
        // Calculate combined scores for display purposes
        const forecastsWithScores = (typedResult.forecasts || []).map(
          (f: any) => ({
            ...f,
            combinedScore: Math.round(
              f.precisionScore * 0.4 +
                f.verifiabilityScore * 0.4 +
                f.importanceScore * 0.2
            ),
          })
        );
        // Sort by combined score descending
        const sortedForecasts = [...forecastsWithScores].sort(
          (a, b) => b.combinedScore - a.combinedScore
        );
        const highPriorityForecasts = sortedForecasts.filter(
          (f: any) => f.combinedScore >= 70
        );

        // Debug: Log first forecast to see data structure
        if (sortedForecasts.length > 0) {
          console.log("First forecast data:", sortedForecasts[0]);
        }

        return (
          <div className="space-y-6">
            {/* Summary */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-blue-900">
                Extracted{" "}
                <span className="font-semibold">
                  {typedResult.forecasts?.length || 0}
                </span>{" "}
                forecasting claims.
                {highPriorityForecasts.length > 0 && (
                  <span>
                    {" "}
                    Found {highPriorityForecasts.length} high priority forecasts
                    (combined score ≥ 70).
                  </span>
                )}
              </p>
            </div>

            {/* All forecasts list */}
            {sortedForecasts && sortedForecasts.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">
                  All Extracted Forecasts
                </h3>
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <ul className="space-y-3">
                    {sortedForecasts.map((forecast: any, i: number) => (
                      <li
                        key={i}
                        className="border-b border-gray-100 pb-3 last:border-b-0"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {forecast.originalText}
                              </p>
                              <p className="mt-1 text-xs italic text-gray-600">
                                → {forecast.rewrittenPredictionText}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-600">
                                {forecast.resolutionDate && (
                                  <span className="flex items-center gap-1">
                                    <svg
                                      className="h-3 w-3"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                      />
                                    </svg>
                                    {forecast.resolutionDate}
                                  </span>
                                )}
                                {forecast.authorProbability !== undefined && (
                                  <span className="flex items-center gap-1">
                                    <svg
                                      className="h-3 w-3"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                      />
                                    </svg>
                                    Author: {forecast.authorProbability}%
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="ml-2 flex flex-col items-end gap-1">
                              <div
                                className={`rounded px-3 py-1 text-xs font-medium ${
                                  forecast.combinedScore >= 80
                                    ? "bg-red-100 text-red-800"
                                    : forecast.combinedScore >= 60
                                      ? "bg-orange-100 text-orange-800"
                                      : forecast.combinedScore >= 40
                                        ? "bg-yellow-100 text-yellow-800"
                                        : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                Combined: {forecast.combinedScore}
                              </div>
                              <div className="flex gap-2 text-xs">
                                <div
                                  className="text-gray-500"
                                  title="Prediction Precision"
                                >
                                  P: {forecast.precisionScore}
                                </div>
                                <div
                                  className="text-gray-500"
                                  title="Verifiability"
                                >
                                  V: {forecast.verifiabilityScore}
                                </div>
                                <div
                                  className="text-gray-500"
                                  title="Importance"
                                >
                                  I: {forecast.importanceScore}
                                </div>
                              </div>
                              {forecast.robustnessScore !== undefined && (
                                <div
                                  className={`text-xs font-medium ${
                                    forecast.robustnessScore >= 80
                                      ? "text-green-600"
                                      : forecast.robustnessScore >= 60
                                        ? "text-blue-600"
                                        : forecast.robustnessScore >= 40
                                          ? "text-yellow-600"
                                          : forecast.robustnessScore >= 20
                                            ? "text-orange-600"
                                            : "text-red-600"
                                  }`}
                                  title="Claim Robustness"
                                >
                                  Robustness: {forecast.robustnessScore}%
                                </div>
                              )}
                            </div>
                          </div>
                          {forecast.thinking && (
                            <details className="text-xs">
                              <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                                Analysis reasoning
                              </summary>
                              <p className="mt-1 border-l-2 border-gray-200 pl-2 text-gray-600">
                                {forecast.thinking}
                              </p>
                            </details>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* High priority forecasts with full details */}
            {highPriorityForecasts.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">
                  High Priority Forecasts (Combined Score ≥ 70)
                </h3>
                {highPriorityForecasts.map((forecast: any, i: number) => (
                  <div
                    key={i}
                    className="rounded-lg border border-gray-200 bg-gray-50 p-6"
                  >
                    <div className="mb-4">
                      <div className="mb-2 flex items-start justify-between">
                        <h4 className="text-lg font-semibold">
                          Forecast {i + 1}
                        </h4>
                        <div className="flex items-center gap-2">
                          <div
                            className={`rounded px-3 py-1 text-sm ${
                              forecast.combinedScore >= 80
                                ? "bg-red-100 text-red-800"
                                : "bg-orange-100 text-orange-800"
                            }`}
                          >
                            Combined: {forecast.combinedScore}
                          </div>
                        </div>
                      </div>
                      <p className="font-medium text-gray-900">
                        {forecast.originalText}
                      </p>
                      <p className="mt-2 text-sm italic text-gray-600">
                        → {forecast.rewrittenPredictionText}
                      </p>
                    </div>

                    <div className="grid gap-4 text-sm">
                      <div className="grid grid-cols-3 gap-4 rounded bg-white p-3">
                        <div>
                          <span className="block font-medium text-gray-600">
                            Precision Score
                          </span>
                          <span className="text-lg font-semibold">
                            {forecast.precisionScore}
                          </span>
                        </div>
                        <div>
                          <span className="block font-medium text-gray-600">
                            Verifiability Score
                          </span>
                          <span className="text-lg font-semibold">
                            {forecast.verifiabilityScore}
                          </span>
                        </div>
                        <div>
                          <span className="block font-medium text-gray-600">
                            Importance Score
                          </span>
                          <span className="text-lg font-semibold">
                            {forecast.importanceScore}
                          </span>
                        </div>
                      </div>

                      {forecast.resolutionDate && (
                        <div>
                          <span className="font-medium text-gray-600">
                            Resolution Date:
                          </span>
                          <span className="ml-2">
                            {forecast.resolutionDate}
                          </span>
                        </div>
                      )}

                      {forecast.authorProbability !== undefined && (
                        <div>
                          <span className="font-medium text-gray-600">
                            Author Probability:
                          </span>
                          <span className="ml-2">
                            {forecast.authorProbability}%
                          </span>
                        </div>
                      )}


                      {forecast.robustnessScore !== undefined && (
                        <div className="rounded border bg-white p-3">
                          <span className="font-medium text-gray-600">
                            Claim Robustness:
                          </span>
                          <div className="mt-1 flex items-center gap-3">
                            <span
                              className={`text-lg font-semibold ${
                                forecast.robustnessScore >= 80
                                  ? "text-green-600"
                                  : forecast.robustnessScore >= 60
                                    ? "text-blue-600"
                                    : forecast.robustnessScore >= 40
                                      ? "text-yellow-600"
                                      : forecast.robustnessScore >= 20
                                        ? "text-orange-600"
                                        : "text-red-600"
                              }`}
                            >
                              {forecast.robustnessScore}%
                            </span>
                            <span className="text-sm text-gray-600">
                              {forecast.robustnessScore >= 80
                                ? "Strong claim - likely to hold up with data"
                                : forecast.robustnessScore >= 60
                                  ? "Moderate claim - reasonably robust"
                                  : forecast.robustnessScore >= 40
                                    ? "Weak claim - significant uncertainties"
                                    : forecast.robustnessScore >= 20
                                      ? "Very weak - unlikely to hold up"
                                      : "Extremely weak - almost certainly overstated"}
                            </span>
                          </div>
                        </div>
                      )}

                      {forecast.thinking && (
                        <div>
                          <span className="font-medium text-gray-600">
                            Analysis:
                          </span>
                          <p className="mt-1">{forecast.thinking}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Raw JSON Data */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Raw LLM Response Data</h3>
              <div className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-gray-100">
                <pre className="text-xs">
                  {JSON.stringify(typedResult, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        );
      }}
    />
  );
}
