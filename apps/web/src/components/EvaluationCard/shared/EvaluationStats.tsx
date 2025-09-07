"use client";

import React from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import type { EvaluationStatus } from "@/components/StatusBadge";

interface EvaluationStatsProps {
  versionCount?: number;
  commentCount?: number;
  wordCount?: number;
  successRate?: number;
  avgDuration?: number;
  totalCost?: number;
  createdAt?: Date | string;
  docId?: string;
  agentId?: string;
  versionNumber?: number;
  evaluationStatus?: EvaluationStatus;
  isRerunning?: boolean;
}

/**
 * Shared component for displaying evaluation statistics
 * Can be used in both compact and full card variants
 */
export function EvaluationStats({
  versionCount,
  commentCount,
  wordCount,
  successRate,
  avgDuration,
  totalCost,
  createdAt,
  docId,
  agentId,
  versionNumber,
  evaluationStatus,
  isRerunning,
}: EvaluationStatsProps) {
  const stats = [];

  // Version link
  if (versionCount !== undefined && docId && agentId) {
    stats.push(
      <Link
        key="versions"
        href={`/docs/${docId}/evals/${agentId}/versions/${versionNumber || versionCount}`}
        className="text-blue-600 hover:text-blue-800"
      >
        {versionCount} version{versionCount !== 1 ? "s" : ""}
      </Link>
    );
  }

  // Success rate
  if (successRate !== undefined) {
    stats.push(
      <span key="success" className={successRate < 100 ? "text-amber-600" : ""}>
        {successRate.toFixed(0)}% success
      </span>
    );
  }

  // Average duration
  if (avgDuration !== undefined) {
    stats.push(<span key="duration">{avgDuration.toFixed(1)}s avg</span>);
  }

  // Total cost
  if (totalCost !== undefined) {
    stats.push(<span key="cost">${totalCost.toFixed(2)} total</span>);
  }

  // Comment count
  if (commentCount !== undefined) {
    stats.push(
      <span key="comments" className="flex items-center gap-1">
        {commentCount} comment{commentCount !== 1 ? "s" : ""}
      </span>
    );
  }

  // Word count
  if (wordCount !== undefined && wordCount > 0) {
    stats.push(<span key="words">{wordCount} words</span>);
  }

  // Created time
  if (createdAt) {
    const date = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
    stats.push(
      <span key="time">
        {formatDistanceToNow(date, { addSuffix: true })}
      </span>
    );
  }

  if (stats.length === 0) return null;

  return (
    <div className="flex items-center gap-3 text-sm text-gray-500">
      {stats.map((stat, index) => (
        <React.Fragment key={index}>
          {index > 0 && <span>•</span>}
          {stat}
        </React.Fragment>
      ))}
    </div>
  );
}