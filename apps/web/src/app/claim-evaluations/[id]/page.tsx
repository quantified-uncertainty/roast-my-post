'use client';

import { useEffect, useState } from 'react';
import { notFound, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ClaimEvaluationDisplay, ClaimEvaluationResult } from '@/lib/OpinionSpectrum2D';
import { getModelAbbreviation } from '../../tools/constants/modelAbbreviations';

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
  user: {
    name: string | null;
    email: string | null;
  };
}

export default function ClaimEvaluationPage({ params }: ClaimEvaluationPageProps) {
  const [evaluation, setEvaluation] = useState<ClaimEvaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFullPrompt, setShowFullPrompt] = useState(false);
  const router = useRouter();

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

        {/* Evaluation Results */}
        <ClaimEvaluationDisplay
          result={evaluation.rawOutput as unknown as ClaimEvaluationResult}
          getModelAbbrev={getModelAbbreviation}
        />

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
  );
}
