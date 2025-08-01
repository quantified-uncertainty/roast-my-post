import Link from "next/link";

import MarkdownRenderer from "@/components/MarkdownRenderer";
import type { Agent } from "@/types/agentSchema";

import { StatusBadge } from "../components";
import type { OverviewStats } from "../types";
import { formatDate, formatDateWithTime, formatRelativeDate } from "../utils";

interface OverviewTabProps {
  agent: Agent;
  overviewStats: OverviewStats | null;
  overviewLoading: boolean;
}

export function OverviewTab({
  agent,
  overviewStats,
  overviewLoading,
}: OverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Description */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">Description</h2>
        <div className="whitespace-pre-wrap text-gray-700">
          {agent.description}
        </div>
      </div>

      {/* README Preview */}
      {agent.readme && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">README</h2>
          <MarkdownRenderer className="prose prose-sm max-w-none text-gray-700">
            {agent.readme}
          </MarkdownRenderer>
        </div>
      )}

      {/* Loading state */}
      {overviewLoading ? (
        <div className="py-8 text-center">
          <div className="text-gray-500">Loading overview statistics...</div>
        </div>
      ) : overviewStats ? (
        <>
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Total Evaluations */}
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="text-2xl font-bold text-gray-900">
                {overviewStats.totalEvaluations}
              </div>
              <div className="text-sm text-gray-500">Total Evaluations</div>
            </div>

            {/* Average Grade */}
            {overviewStats.averageGrade !== null && (
              <div className="rounded-lg bg-white p-6 shadow">
                <div className="text-2xl font-bold text-gray-900">
                  {overviewStats.averageGrade !== null
                    ? overviewStats.averageGrade.toFixed(1)
                    : "—"}
                </div>
                <div className="text-sm text-gray-500">Average Grade</div>
              </div>
            )}

            {/* Total Cost */}
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="text-2xl font-bold text-gray-900">
                ${(overviewStats.totalCost / 100).toFixed(2)}
              </div>
              <div className="text-sm text-gray-500">Total Cost</div>
            </div>

            {/* Average Cost */}
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="text-2xl font-bold text-gray-900">
                ${(overviewStats.averageCost / 100).toFixed(3)}
              </div>
              <div className="text-sm text-gray-500">Average Cost</div>
            </div>

            {/* Average Time */}
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="text-2xl font-bold text-gray-900">
                {overviewStats.averageTime > 0 
                  ? `${Math.round(overviewStats.averageTime)}s`
                  : "—"}
              </div>
              <div className="text-sm text-gray-500">Average Time</div>
            </div>

            {/* Success Rate */}
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="text-2xl font-bold text-gray-900">
                {overviewStats.successRate.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500">Success Rate</div>
            </div>

            {/* Documents Evaluated */}
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="text-2xl font-bold text-gray-900">
                {overviewStats.uniqueDocuments}
              </div>
              <div className="text-sm text-gray-500">Documents Evaluated</div>
            </div>

            {/* Active Jobs */}
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="text-2xl font-bold text-gray-900">
                {overviewStats.activeJobs}
              </div>
              <div className="text-sm text-gray-500">Active Jobs</div>
            </div>

            {/* Created Date */}
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="text-lg font-semibold text-gray-900">
                {formatDate(overviewStats.createdAt)}
              </div>
              <div className="text-sm text-gray-500">Created</div>
            </div>

            {/* Updated Date */}
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="text-lg font-semibold text-gray-900">
                {formatDate(overviewStats.updatedAt)}
              </div>
              <div className="text-sm text-gray-500">Last Updated</div>
            </div>
          </div>

          {/* Recent Activity */}
          {overviewStats.recentEvaluations &&
            overviewStats.recentEvaluations.length > 0 && (
              <div className="rounded-lg bg-white shadow">
                <div className="border-b border-gray-200 px-6 py-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Recent Activity
                  </h3>
                </div>
                <div className="divide-y divide-gray-200">
                  {overviewStats.recentEvaluations.map((evaluation) => (
                    <div
                      key={evaluation.id}
                      className="px-6 py-4 hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            <Link
                              href={`/docs/${evaluation.documentId}/evaluations`}
                              className="hover:text-blue-600"
                            >
                              {evaluation.documentTitle}
                            </Link>
                          </div>
                          <div className="text-sm text-gray-500">
                            <span title={formatDateWithTime(evaluation.createdAt)}>
                              {formatRelativeDate(evaluation.createdAt)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {agent.providesGrades &&
                           evaluation.grade !== null &&
                           evaluation.grade !== undefined && (
                            <div className="text-lg font-semibold text-gray-900">
                              {evaluation.grade}/100
                            </div>
                          )}
                          <StatusBadge status={evaluation.status} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </>
      ) : (
        <div className="py-8 text-center">
          <div className="text-gray-500">
            Unable to load overview statistics
          </div>
        </div>
      )}
    </div>
  );
}
