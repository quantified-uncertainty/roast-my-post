'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  BeakerIcon,
  DocumentIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  CodeBracketIcon,
  StarIcon
} from '@heroicons/react/24/outline';

interface ExperimentDetails {
  id: string;
  trackingId: string;
  name: string | null;
  description: string | null;
  createdAt: string;
  expiresAt: string | null;
  isExpired: boolean;
  
  agent: {
    id: string;
    name: string;
    isEphemeral: boolean;
    config: {
      primaryInstructions?: string;
      selfCritiqueInstructions?: string;
      providesGrades?: boolean;
    };
  };
  
  jobStats: {
    total: number;
    completed: number;
    failed: number;
    running: number;
    pending: number;
  };
  
  aggregateMetrics: {
    averageGrade: number | null;
    totalCost: number;
    totalTime: number;
    successRate: number;
  };
  
  results: Array<{
    jobId: string;
    documentId: string;
    documentTitle: string;
    status: string;
    evaluation: {
      createdAt: string;
      grade: number | null;
      summary: string | null;
      highlightCount: number;
    } | null;
    processingTime: number | null;
    cost: number | null;
  }>;
  
  ephemeralDocuments: Array<{
    id: string;
    title: string;
  }>;
  
  actions: {
    canRerun: boolean;
    canExtend: boolean;
    canPromote: boolean;
  };
}

export default function ExperimentDetailsPage() {
  const params = useParams();
  const trackingId = params.trackingId as string;
  
  const [experiment, setExperiment] = useState<ExperimentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'results' | 'config'>('results');

  useEffect(() => {
    fetchExperiment();
  }, [trackingId]);

  const fetchExperiment = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/experiments/${trackingId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch experiment');
      }
      
      const data: ExperimentDetails = await response.json();
      setExperiment(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case 'FAILED':
        return <XCircleIcon className="h-5 w-5 text-red-600" />;
      case 'RUNNING':
        return <ArrowPathIcon className="h-5 w-5 text-blue-600 animate-spin" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const formatCost = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading experiment...</div>
      </div>
    );
  }

  if (error || !experiment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600">Error: {error || 'Experiment not found'}</div>
      </div>
    );
  }

  const timeRemaining = experiment.expiresAt
    ? new Date(experiment.expiresAt).getTime() - Date.now()
    : null;
  const daysRemaining = timeRemaining ? Math.floor(timeRemaining / (1000 * 60 * 60 * 24)) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-2">
            <BeakerIcon className="h-8 w-8 mr-3 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-900">{experiment.trackingId}</h1>
            {experiment.isExpired && (
              <span className="ml-3 px-2 py-1 text-sm bg-red-100 text-red-800 rounded">
                Expired
              </span>
            )}
          </div>
          
          {experiment.description && (
            <p className="text-gray-600 mb-4">{experiment.description}</p>
          )}
          
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <div>
              Created: {new Date(experiment.createdAt).toLocaleString()}
            </div>
            {experiment.expiresAt && (
              <div className={experiment.isExpired ? 'text-red-600' : ''}>
                <ClockIcon className="inline h-4 w-4 mr-1" />
                {experiment.isExpired 
                  ? 'Expired' 
                  : `${daysRemaining} days remaining`}
              </div>
            )}
            <div>
              Agent: 
              <Link 
                href={`/agents/${experiment.agent.id}`}
                className="ml-1 text-purple-600 hover:text-purple-700"
              >
                {experiment.agent.name}
              </Link>
              {experiment.agent.isEphemeral && (
                <span className="ml-1 text-xs text-gray-500">(ephemeral)</span>
              )}
            </div>
          </div>
        </div>

        {/* Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-500">Success Rate</div>
            <div className="text-2xl font-semibold">
              {experiment.aggregateMetrics.successRate.toFixed(0)}%
            </div>
          </div>
          
          {experiment.agent.config.providesGrades && experiment.aggregateMetrics.averageGrade !== null && (
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="text-sm text-gray-500">Average Grade</div>
              <div className="text-2xl font-semibold flex items-center">
                {experiment.aggregateMetrics.averageGrade.toFixed(1)}
                <StarIcon className="h-5 w-5 ml-1 text-yellow-500" />
              </div>
            </div>
          )}
          
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-500">Total Cost</div>
            <div className="text-2xl font-semibold">
              {formatCost(experiment.aggregateMetrics.totalCost)}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-500">Total Time</div>
            <div className="text-2xl font-semibold">
              {formatTime(experiment.aggregateMetrics.totalTime)}
            </div>
          </div>
        </div>

        {/* Job Progress */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Job Progress</h2>
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden mb-2">
            {experiment.jobStats.total > 0 && (
              <>
                <div
                  className="bg-green-500 h-full float-left"
                  style={{
                    width: `${(experiment.jobStats.completed / experiment.jobStats.total) * 100}%`
                  }}
                />
                <div
                  className="bg-red-500 h-full float-left"
                  style={{
                    width: `${(experiment.jobStats.failed / experiment.jobStats.total) * 100}%`
                  }}
                />
                <div
                  className="bg-blue-500 h-full float-left"
                  style={{
                    width: `${(experiment.jobStats.running / experiment.jobStats.total) * 100}%`
                  }}
                />
              </>
            )}
          </div>
          <div className="text-sm text-gray-600">
            {experiment.jobStats.completed} completed, 
            {experiment.jobStats.failed > 0 && ` ${experiment.jobStats.failed} failed,`}
            {experiment.jobStats.running > 0 && ` ${experiment.jobStats.running} running,`}
            {experiment.jobStats.pending > 0 && ` ${experiment.jobStats.pending} pending`}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('results')}
                className={`py-4 px-6 border-b-2 font-medium text-sm ${
                  activeTab === 'results'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <DocumentIcon className="inline h-4 w-4 mr-2" />
                Results
              </button>
              <button
                onClick={() => setActiveTab('config')}
                className={`py-4 px-6 border-b-2 font-medium text-sm ${
                  activeTab === 'config'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <CodeBracketIcon className="inline h-4 w-4 mr-2" />
                Agent Config
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'results' ? (
              <div className="space-y-4">
                {experiment.results.map((result) => (
                  <div key={result.jobId} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          {getStatusIcon(result.status)}
                          <h3 className="ml-2 font-medium">
                            <Link
                              href={`/documents/${result.documentId}`}
                              className="hover:text-purple-600"
                            >
                              {result.documentTitle}
                            </Link>
                          </h3>
                        </div>
                        
                        {result.evaluation && (
                          <div className="space-y-2 text-sm">
                            {result.evaluation.grade !== null && (
                              <div>
                                <span className="text-gray-500">Grade:</span>{' '}
                                <span className="font-medium">{result.evaluation.grade}/10</span>
                              </div>
                            )}
                            {result.evaluation.summary && (
                              <div>
                                <span className="text-gray-500">Summary:</span>{' '}
                                <span className="text-gray-700">{result.evaluation.summary}</span>
                              </div>
                            )}
                            <div className="flex gap-4 text-xs text-gray-500">
                              <span>{result.evaluation.highlightCount} highlights</span>
                              {result.processingTime && <span>{result.processingTime}s</span>}
                              {result.cost && <span>{formatCost(result.cost)}</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {experiment.results.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No results yet
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Primary Instructions</h3>
                  <pre className="bg-gray-50 p-4 rounded text-sm whitespace-pre-wrap">
                    {experiment.agent.config.primaryInstructions || 'No instructions provided'}
                  </pre>
                </div>
                
                {experiment.agent.config.selfCritiqueInstructions && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Self-Critique Instructions</h3>
                    <pre className="bg-gray-50 p-4 rounded text-sm whitespace-pre-wrap">
                      {experiment.agent.config.selfCritiqueInstructions}
                    </pre>
                  </div>
                )}
                
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Settings</h3>
                  <div className="text-sm">
                    Provides grades: {experiment.agent.config.providesGrades ? 'Yes' : 'No'}
                  </div>
                </div>
                
                {experiment.ephemeralDocuments.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Ephemeral Documents</h3>
                    <ul className="text-sm space-y-1">
                      {experiment.ephemeralDocuments.map(doc => (
                        <li key={doc.id}>• {doc.title}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}