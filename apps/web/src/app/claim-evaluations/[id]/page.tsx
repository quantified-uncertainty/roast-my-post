'use client';

import { useEffect, useState, useMemo } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ClaimEvaluationDisplay, ClaimEvaluationResult } from '@/lib/OpinionSpectrum2D';
import { getModelAbbreviation } from '../../tools/constants/modelAbbreviations';
import { ModelResponseStatsTable } from '@/components/ModelResponseStatsTable';
import { EvaluationDots } from '../EvaluationDots';
import { TagTree } from '../TagTree';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Split } from 'lucide-react';

interface ClaimEvaluationPageProps {
  params: Promise<{ id: string }>;
}

interface ClaimEvaluation {
  id: string;
  userId: string;
  claim: string;
  context: string | null;
  summaryMean: number | null;
  rawOutput: unknown;
  createdAt: string;
  explanationLength: number | null;
  temperature: number | null;
  prompt: string | null;
  variationOf: string | null;
  submitterNotes: string | null;
  tags?: string[];
  analysisText: string | null;
  analysisGeneratedAt: string | null;
  user: {
    name: string | null;
    email: string | null;
  };
  variations?: Array<{
    id: string;
    claim: string;
    submitterNotes: string | null;
    summaryMean: number | null;
    createdAt: string;
    rawOutput: unknown;
    context: string | null;
    tags: string[];
  }>;
}

export default function ClaimEvaluationPage({ params }: ClaimEvaluationPageProps) {
  const [evaluation, setEvaluation] = useState<ClaimEvaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFullPrompt, setShowFullPrompt] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [claimSearch, setClaimSearch] = useState('');
  const [isRegeneratingAnalysis, setIsRegeneratingAnalysis] = useState(false);

  useEffect(() => {
    async function loadEvaluation() {
      try {
        const { id } = await params;
        const response = await fetch(`/api/claim-evaluations/${id}`);

        if (response.status === 404) {
          notFound();
        }

        if (response.status === 403) {
          setError('Access denied');
          return;
        }

        if (response.status === 401) {
          setError('Please sign in to view this evaluation');
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to load evaluation');
        }

        const data = await response.json();
        setEvaluation(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    loadEvaluation();
  }, [params]);

  const handleRegenerateAnalysis = async () => {
    if (!evaluation) return;

    setIsRegeneratingAnalysis(true);
    try {
      const response = await fetch(`/api/claim-evaluations/${evaluation.id}/analysis/regenerate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to regenerate analysis');
      }

      const data = await response.json();

      // Update the evaluation with new analysis
      setEvaluation({
        ...evaluation,
        analysisText: data.analysisText,
        analysisGeneratedAt: data.analysisGeneratedAt,
      });
    } catch (err) {
      console.error('Error regenerating analysis:', err);
      alert(err instanceof Error ? err.message : 'Failed to regenerate analysis. Please try again.');
    } finally {
      setIsRegeneratingAnalysis(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!evaluation) {
    return null;
  }

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <Link
              href="/claim-evaluations"
              className="text-indigo-600 hover:text-indigo-700 mb-4 inline-block"
            >
              ← Back to Evaluations
            </Link>
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold mb-2">Claim Evaluation</h1>
                <p className="text-gray-500">
                  Created {new Date(evaluation.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })} by {evaluation.user.name || evaluation.user.email || 'Unknown'}
                </p>
              </div>
              {evaluation.summaryMean !== null && (
                <div className="text-right">
                  <div className="text-sm text-gray-600 mb-1">Summary Mean</div>
                  <div className="text-3xl font-bold text-indigo-600">
                    {evaluation.summaryMean.toFixed(2)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Claim */}
          <div className="mb-6 rounded-lg border bg-white p-6 shadow-sm">
            <h3 className="mb-3 text-sm font-medium text-gray-600">Claim</h3>
            <p className="text-xl font-medium text-gray-900">
              &ldquo;{evaluation.claim}&rdquo;
            </p>
          </div>

          {/* Context (if provided) */}
          {evaluation.context && (
            <div className="mb-6 rounded-lg border bg-white p-6 shadow-sm">
              <h3 className="mb-3 text-sm font-medium text-gray-600">Context</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{evaluation.context}</p>
            </div>
          )}
        </div>
      </div>

      {/* Variation Comparison with Tag Tree - Full Width */}
      {evaluation.variations && evaluation.variations.length > 0 && (
        <div className="mb-6 px-4">
          <div className="flex gap-4">
            {/* Tag Tree Sidebar */}
            <div className="w-64 flex-shrink-0">
              <div className="sticky top-4 rounded-lg border bg-white shadow-sm p-4">
                {/* Claim Search */}
                <div className="mb-4">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search claims..."
                      value={claimSearch}
                      onChange={(e) => setClaimSearch(e.target.value)}
                      className="w-full rounded border border-gray-300 py-1.5 pl-8 pr-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Tag Tree */}
                <TagTree
                  tags={[
                    ...(evaluation.tags || []).map((t) => [t]),
                    ...evaluation.variations.map((v) => v.tags),
                  ]}
                  selectedTags={selectedTags}
                  onTagSelect={(tag) => {
                    setSelectedTags((prev) =>
                      prev.includes(tag)
                        ? prev.filter((t) => t !== tag)
                        : [...prev, tag]
                    );
                  }}
                />
                {(selectedTags.length > 0 || claimSearch) && (
                  <button
                    onClick={() => {
                      setSelectedTags([]);
                      setClaimSearch('');
                    }}
                    className="mt-2 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            </div>

            {/* Comparison Table */}
            <div className="flex-1 min-w-0">
              <VariationComparisonTable
                currentEvaluation={evaluation}
                variations={evaluation.variations}
                selectedTags={selectedTags}
                claimSearch={claimSearch}
              />
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">

        {/* Variation Info (for single variations without children) */}
        {(evaluation.variationOf || evaluation.submitterNotes) && (!evaluation.variations || evaluation.variations.length === 0) && (
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-6 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-blue-800">
              <Split size={16} />
              Variation Info
            </h3>
            {evaluation.submitterNotes && (
              <div className="mb-3">
                <div className="text-xs text-blue-600 mb-1">Notes</div>
                <p className="text-gray-700">{evaluation.submitterNotes}</p>
              </div>
            )}
            {evaluation.variationOf && (
              <div>
                <div className="text-xs text-blue-600 mb-1">Parent Evaluation</div>
                <Link
                  href={`/claim-evaluations/${evaluation.variationOf}`}
                  className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                >
                  View parent evaluation →
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Evaluation Results */}
        <ClaimEvaluationDisplay
          result={evaluation.rawOutput as unknown as ClaimEvaluationResult}
          getModelAbbrev={getModelAbbreviation}
        />

        {/* Model Response Stats */}
        <ModelResponseStatsTable
          evaluations={(evaluation.rawOutput as unknown as ClaimEvaluationResult)?.evaluations || []}
        />

        {/* Analysis Section */}
        <div className="mt-6 rounded-lg border border-indigo-200 bg-indigo-50 p-6 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-indigo-900">AI Analysis</h3>
              <button
                onClick={handleRegenerateAnalysis}
                disabled={isRegeneratingAnalysis}
                className="text-xs px-2 py-1 rounded bg-indigo-100 hover:bg-indigo-200 text-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRegeneratingAnalysis ? (evaluation.analysisText ? 'Regenerating...' : 'Generating...') : (evaluation.analysisText ? 'Regenerate' : 'Generate')}
              </button>
            </div>
            {evaluation.analysisGeneratedAt && (
              <span className="text-xs text-indigo-600">
                Generated {new Date(evaluation.analysisGeneratedAt).toLocaleString()}
              </span>
            )}
          </div>
          {evaluation.analysisText ? (
            <div className="prose prose-sm prose-indigo max-w-none text-gray-800">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {evaluation.analysisText}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-indigo-700 italic">
              No analysis yet. Click "Generate" to create an AI analysis of these results.
            </p>
          )}
        </div>

        {/* Parameters Section */}
        <div className="mt-6 rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-medium text-gray-600">Evaluation Parameters</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            {evaluation.explanationLength !== null && (
              <div>
                <div className="text-xs text-gray-500">Explanation Length</div>
                <div className="text-sm font-medium">{evaluation.explanationLength} words</div>
              </div>
            )}
            {evaluation.temperature !== null && (
              <div>
                <div className="text-xs text-gray-500">Temperature</div>
                <div className="text-sm font-medium">{evaluation.temperature}</div>
              </div>
            )}
          </div>

          {evaluation.prompt && (
            <div>
              <div className="text-xs text-gray-500 mb-2">Prompt</div>
              <div className="rounded bg-gray-50 p-3 border border-gray-200">
                <pre className="whitespace-pre-wrap break-words font-mono text-xs text-gray-700">
                  {showFullPrompt
                    ? evaluation.prompt
                    : evaluation.prompt.split('\n').slice(0, 4).join('\n')}
                </pre>
                {evaluation.prompt.split('\n').length > 4 && (
                  <button
                    onClick={() => setShowFullPrompt(!showFullPrompt)}
                    className="mt-2 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    {showFullPrompt ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    </>
  );
}

interface VariationComparisonTableProps {
  currentEvaluation: ClaimEvaluation;
  variations: Array<{
    id: string;
    claim: string;
    submitterNotes: string | null;
    summaryMean: number | null;
    createdAt: string;
    rawOutput: unknown;
    context: string | null;
    tags: string[];
  }>;
  selectedTags: string[];
  claimSearch: string;
}

function VariationComparisonTable({ currentEvaluation, variations, selectedTags, claimSearch }: VariationComparisonTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Filter variations by selected tags and search (if any)
  const filteredVariations = useMemo(() => {
    let filtered = variations;

    // Filter by tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter((v) =>
        selectedTags.every((tag) => v.tags.includes(tag))
      );
    }

    // Filter by claim search
    if (claimSearch.trim()) {
      const searchLower = claimSearch.toLowerCase();
      filtered = filtered.filter((v) =>
        v.claim.toLowerCase().includes(searchLower) ||
        v.submitterNotes?.toLowerCase().includes(searchLower) ||
        v.context?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [variations, selectedTags, claimSearch]);

  // Combine current evaluation with its filtered variations
  const allEvaluations = [currentEvaluation, ...filteredVariations];

  // Helper to calculate mean confidence from evaluations
  const getMeanConfidence = (rawOutput: unknown): number | null => {
    const output = rawOutput as any;
    if (!output?.evaluations) return null;

    const confidences = output.evaluations
      .filter((e: any) => !e.hasError && e.successfulResponse?.confidence != null)
      .map((e: any) => e.successfulResponse.confidence);

    if (confidences.length === 0) return null;
    return Math.round(confidences.reduce((a: number, b: number) => a + b, 0) / confidences.length);
  };

  return (
    <div className="mb-6 rounded-lg border bg-white shadow-sm overflow-hidden">
      <div className="bg-gray-50 px-6 py-4 border-b">
        <h3 className="flex items-center gap-2 text-sm font-medium text-gray-900">
          <Split size={16} />
          Variation Comparison ({allEvaluations.length} total)
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Variation
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Claim
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tags
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Evaluations
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Agreement
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Δ
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Confidence
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {allEvaluations.map((evaluation, index) => {
              const isCurrentEvaluation = evaluation.id === currentEvaluation.id;
              const evaluations = (evaluation.rawOutput as any)?.evaluations || [];
              const meanConfidence = getMeanConfidence(evaluation.rawOutput);

              // Calculate delta from parent
              const delta = !isCurrentEvaluation && evaluation.summaryMean !== null && currentEvaluation.summaryMean !== null
                ? Math.round(evaluation.summaryMean - currentEvaluation.summaryMean)
                : null;

              // Color code delta: green for positive (increases agreement), red for negative
              const getDeltaColor = (delta: number) => {
                const absDelta = Math.abs(delta);
                if (delta > 0) {
                  // Positive delta - more agreement
                  if (absDelta >= 20) return 'text-green-700 font-bold';
                  if (absDelta >= 10) return 'text-green-600 font-semibold';
                  return 'text-green-500';
                } else {
                  // Negative delta - less agreement
                  if (absDelta >= 20) return 'text-red-700 font-bold';
                  if (absDelta >= 10) return 'text-red-600 font-semibold';
                  return 'text-red-500';
                }
              };

              const isExpanded = expandedRows.has(evaluation.id);
              const hasContext = evaluation.context && evaluation.context.trim().length > 0;

              return (
                <>
                  <tr
                    key={evaluation.id}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-2">
                        {hasContext && (
                          <button
                            onClick={() => toggleRow(evaluation.id)}
                            className="text-gray-400 hover:text-gray-600 focus:outline-none mt-0.5 flex-shrink-0"
                            aria-label={isExpanded ? 'Collapse context' : 'Expand context'}
                          >
                            <svg
                              className={`h-4 w-4 transition-transform ${isExpanded ? 'transform rotate-90' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        )}
                        <div className="flex-1 min-w-0">
                          {evaluation.submitterNotes ? (
                            <>
                              <div className="text-sm text-gray-900 font-medium">
                                {evaluation.submitterNotes}
                              </div>
                              <div className="mt-0.5">
                                {isCurrentEvaluation ? (
                                  <span className="text-xs text-indigo-600">
                                    Current
                                  </span>
                                ) : (
                                  <Link
                                    href={`/claim-evaluations/${evaluation.id}`}
                                    className="text-xs text-indigo-600 hover:text-indigo-700"
                                  >
                                    Variation {index}
                                  </Link>
                                )}
                              </div>
                            </>
                          ) : (
                            <div>
                              {isCurrentEvaluation ? (
                                <span className="text-sm font-medium text-indigo-600">
                                  Current
                                </span>
                              ) : (
                                <Link
                                  href={`/claim-evaluations/${evaluation.id}`}
                                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                                >
                                  Variation {index}
                                </Link>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-md">
                        {evaluation.claim}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {'tags' in evaluation && evaluation.tags && evaluation.tags.length > 0 ? (
                          evaluation.tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700"
                            >
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400 italic text-xs">None</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center">
                        <EvaluationDots evaluations={evaluations} />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {evaluation.summaryMean !== null ? (
                        <span className="text-sm font-bold text-gray-900">
                          {Math.round(evaluation.summaryMean)}%
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {delta !== null ? (
                        <span className={`text-sm ${getDeltaColor(delta)}`}>
                          {delta > 0 ? '+' : ''}{delta}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {meanConfidence !== null ? (
                        <span className="text-sm text-gray-600">
                          {meanConfidence}%
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                  {isExpanded && hasContext && (
                    <tr key={`${evaluation.id}-context`} className="bg-gray-50">
                      <td colSpan={7} className="px-6 py-4">
                        <div className="max-w-full">
                          <div className="text-xs font-medium text-gray-600 mb-2">Context:</div>
                          <div className="prose prose-sm max-w-none bg-white rounded border border-gray-200 p-4 max-h-96 overflow-y-auto">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {evaluation.context || ''}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
