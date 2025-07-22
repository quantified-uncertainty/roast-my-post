"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  ClockIcon, 
  PlayIcon,
  DocumentTextIcon,
  CpuChipIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  ClockIcon as TimeIcon
} from "@heroicons/react/24/outline";

interface SystemStats {
  jobs: {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
    completedToday: number;
    failedToday: number;
    successRate24h: number;
    avgDurationMinutes: number;
    totalCostToday: number;
  };
  evaluations: {
    total: number;
    today: number;
    avgGrade: number;
    totalComments: number;
  };
  documents: {
    total: number;
    withEvaluations: number;
  };
  agents: {
    total: number;
    active: number;
  };
}

const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const formatPercent = (ratio: number) => `${(ratio * 100).toFixed(1)}%`;
const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes.toFixed(1)}m`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}h ${mins}m`;
};

export default function MonitorPage() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/monitor/stats");
        if (!response.ok) {
          throw new Error("Failed to fetch system stats");
        }
        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading system stats...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">Error: {error}</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">No stats available</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">System Monitor</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Real-time overview of job processing, evaluations, and system health across all documents and agents.
        </p>
      </div>

      {/* System Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Active Jobs */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <PlayIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Active Jobs
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {stats.jobs.running} running, {stats.jobs.pending} pending
                </dd>
              </dl>
            </div>
          </div>
        </div>

        {/* Success Rate */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ChartBarIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Success Rate (24h)
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {formatPercent(stats.jobs.successRate24h)}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        {/* Daily Cost */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CurrencyDollarIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Cost Today
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {formatCurrency(stats.jobs.totalCostToday)}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        {/* Avg Processing Time */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TimeIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Avg Duration
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {formatDuration(stats.jobs.avgDurationMinutes)}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Job Statistics */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <CpuChipIcon className="h-5 w-5 mr-2" />
              Job Statistics
            </h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.jobs.completed}</div>
                <div className="text-sm text-gray-500">Total Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.jobs.failed}</div>
                <div className="text-sm text-gray-500">Total Failed</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Completed Today</span>
                <span className="text-sm font-medium">{stats.jobs.completedToday}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Failed Today</span>
                <span className="text-sm font-medium">{stats.jobs.failedToday}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Currently Running</span>
                <span className="text-sm font-medium flex items-center">
                  <PlayIcon className="h-4 w-4 mr-1 text-blue-600 animate-pulse" />
                  {stats.jobs.running}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">In Queue</span>
                <span className="text-sm font-medium flex items-center">
                  <ClockIcon className="h-4 w-4 mr-1 text-yellow-600" />
                  {stats.jobs.pending}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* System Overview */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <DocumentTextIcon className="h-5 w-5 mr-2" />
              System Overview
            </h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.evaluations.total}</div>
                <div className="text-sm text-gray-500">Total Evaluations</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.evaluations.avgGrade.toFixed(1)}</div>
                <div className="text-sm text-gray-500">Avg Grade</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Documents</span>
                <span className="text-sm font-medium">{stats.documents.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">With Evaluations</span>
                <span className="text-sm font-medium">{stats.documents.withEvaluations}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Active Agents</span>
                <span className="text-sm font-medium">{stats.agents.active} / {stats.agents.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Comments</span>
                <span className="text-sm font-medium">{stats.evaluations.totalComments}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Evaluations Today</span>
                <span className="text-sm font-medium">{stats.evaluations.today}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/monitor/jobs"
            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div>
              <h4 className="font-medium text-gray-900">Monitor Jobs</h4>
              <p className="text-sm text-gray-500">View detailed job status and logs</p>
            </div>
            <CpuChipIcon className="h-6 w-6 text-gray-400" />
          </Link>
          
          <Link
            href="/monitor/evals"
            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div>
              <h4 className="font-medium text-gray-900">Monitor Evaluations</h4>
              <p className="text-sm text-gray-500">Review recent evaluations and grades</p>
            </div>
            <DocumentTextIcon className="h-6 w-6 text-gray-400" />
          </Link>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="text-center text-sm text-gray-500">
        Auto-refreshing every 30 seconds • Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
}