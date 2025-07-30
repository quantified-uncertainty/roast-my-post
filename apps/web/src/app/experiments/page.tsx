'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  BeakerIcon, 
  PlusIcon, 
  ClockIcon, 
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

interface ExperimentBatch {
  id: string;
  name: string | null;
  trackingId: string | null;
  description: string | null;
  isEphemeral: boolean;
  expiresAt: string | null;
  createdAt: string;
  agent: {
    id: string;
    name: string;
    isEphemeral: boolean;
  };
  ephemeralDocumentCount: number;
  jobStats: {
    total: number;
    completed: number;
    failed: number;
    running: number;
    pending: number;
  };
}

interface ExperimentsResponse {
  batches: ExperimentBatch[];
  total: number;
  limit: number;
  offset: number;
}

export default function ExperimentsPage() {
  const [experiments, setExperiments] = useState<ExperimentBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [includeExpired, setIncludeExpired] = useState(false);

  const fetchExperiments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/batches?type=experiment&includeExpired=${includeExpired}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch experiments');
      }
      
      const data: ExperimentsResponse = await response.json();
      setExperiments(data.batches);
    } catch {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  }, [includeExpired]);

  useEffect(() => {
    fetchExperiments();
  }, [fetchExperiments]);

  const handleDelete = async (experiment: ExperimentBatch) => {
    if (!experiment.trackingId) return;

    // Build deletion warning message
    const resourceWarnings: string[] = [];
    
    if (experiment.agent.isEphemeral) {
      resourceWarnings.push('1 agent');
    }
    
    if (experiment.ephemeralDocumentCount > 0) {
      resourceWarnings.push(`${experiment.ephemeralDocumentCount} document${experiment.ephemeralDocumentCount !== 1 ? 's' : ''}`);
    }
    
    let confirmMessage = 'Are you sure you want to delete this experiment?';
    if (resourceWarnings.length > 0) {
      confirmMessage += `\n\nNote: This will also delete ${resourceWarnings.join(' and ')}.`;
    }

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await fetch(`/api/experiments/${experiment.trackingId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete experiment');
      }

      // Refresh the list
      await fetchExperiments();
    } catch {
      alert('Failed to delete experiment');
    }
  };

  const getStatusColor = (stats: ExperimentBatch['jobStats']) => {
    if (stats.failed > 0) return 'text-red-600';
    if (stats.running > 0) return 'text-blue-600';
    if (stats.completed === stats.total) return 'text-green-600';
    return 'text-gray-600';
  };

  const getStatusIcon = (stats: ExperimentBatch['jobStats']) => {
    if (stats.failed > 0) return <XCircleIcon className="h-5 w-5" />;
    if (stats.running > 0) return <ArrowPathIcon className="h-5 w-5 animate-spin" />;
    if (stats.completed === stats.total) return <CheckCircleIcon className="h-5 w-5" />;
    return <ClockIcon className="h-5 w-5" />;
  };

  const getTimeRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff < 0) return 'Expired';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h remaining`;
    return `${hours}h remaining`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading experiments...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <BeakerIcon className="h-8 w-8 mr-3 text-purple-600" />
              Your Experiments
            </h1>
            <p className="mt-2 text-gray-600">
              Temporary agent configurations for testing and development
            </p>
            <p className="mt-1 text-sm text-gray-500">
              These experiments are private and only visible to you.
            </p>
          </div>
          
          <Link
            href="/experiments/new"
            className="bg-purple-600 text-white px-4 py-2 rounded-md font-medium hover:bg-purple-700 flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            New Experiment
          </Link>
        </div>

        {/* Filters */}
        <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={includeExpired}
              onChange={(e) => setIncludeExpired(e.target.checked)}
              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Show expired experiments</span>
          </label>
        </div>

        {/* Experiments List */}
        {experiments.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <BeakerIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">No experiments found</p>
            <Link
              href="/experiments/new"
              className="mt-4 inline-flex items-center text-purple-600 hover:text-purple-700"
            >
              <PlusIcon className="h-5 w-5 mr-1" />
              Create your first experiment
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {experiments.map((experiment) => {
              const timeRemaining = getTimeRemaining(experiment.expiresAt);
              const isExpired = timeRemaining === 'Expired';
              
              return (
                <div
                  key={experiment.id}
                  className={`bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow ${
                    isExpired ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      {/* Experiment Header */}
                      <div className="flex items-center mb-2">
                        <h3 className="text-lg font-semibold">
                          {experiment.trackingId ? (
                            <Link
                              href={`/experiments/${experiment.trackingId}`}
                              className="text-purple-600 hover:text-purple-700 underline decoration-purple-200 hover:decoration-purple-400 transition-colors"
                            >
                              {experiment.trackingId}
                            </Link>
                          ) : (
                            <span className="text-gray-500">No tracking ID</span>
                          )}
                        </h3>
                        {timeRemaining && (
                          <span className={`ml-3 text-sm ${
                            isExpired ? 'text-red-600' : 'text-gray-500'
                          }`}>
                            <ClockIcon className="inline h-4 w-4 mr-1" />
                            {timeRemaining}
                          </span>
                        )}
                      </div>
                      
                      {/* Description */}
                      {experiment.description && (
                        <p className="text-gray-600 text-sm mb-3">
                          {experiment.description}
                        </p>
                      )}
                      
                      {/* Details Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        {/* Agent */}
                        <div>
                          <span className="text-gray-500">Agent:</span>{' '}
                          <Link
                            href={`/agents/${experiment.agent.id}`}
                            className="text-purple-600 hover:text-purple-700"
                          >
                            {experiment.agent.name}
                          </Link>
                        </div>
                        
                        {/* Created */}
                        <div>
                          <span className="text-gray-500">Created:</span>{' '}
                          {new Date(experiment.createdAt).toLocaleDateString()}
                        </div>
                        
                        {/* Job Progress */}
                        <div className="flex items-center">
                          <span className="text-gray-500 mr-2">Progress:</span>
                          <span className={`flex items-center ${getStatusColor(experiment.jobStats)}`}>
                            {getStatusIcon(experiment.jobStats)}
                            <span className="ml-1">
                              {experiment.jobStats.completed}/{experiment.jobStats.total}
                            </span>
                          </span>
                        </div>
                      </div>
                      
                      {/* Job Stats Bar */}
                      <div className="mt-3">
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
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
                        <div className="mt-1 text-xs text-gray-500">
                          {experiment.jobStats.completed} completed, 
                          {experiment.jobStats.failed > 0 && ` ${experiment.jobStats.failed} failed,`}
                          {experiment.jobStats.running > 0 && ` ${experiment.jobStats.running} running,`}
                          {experiment.jobStats.pending > 0 && ` ${experiment.jobStats.pending} pending`}
                        </div>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="ml-4">
                      <button
                        onClick={() => handleDelete(experiment)}
                        disabled={!experiment.trackingId || experiment.jobStats.running > 0}
                        className="text-red-600 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                        title={experiment.jobStats.running > 0 ? 'Cannot delete while jobs are running' : 'Delete experiment'}
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}