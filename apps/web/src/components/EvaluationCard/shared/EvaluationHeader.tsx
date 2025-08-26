"use client";

import { GradeBadge } from "@/components/GradeBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { StaleBadge } from "@/components/StaleBadge";
import type { EvaluationStatus } from "@/components/StatusBadge";

interface EvaluationHeaderProps {
  agentName: string;
  grade?: number | null;
  isStale?: boolean;
  isRerunning?: boolean;
  evaluationStatus: EvaluationStatus;
  showGrade?: boolean;
  children?: React.ReactNode;
}

/**
 * Shared header component for evaluation cards
 * Shows agent name, grade/status badge, and stale/rerunning indicators
 */
export function EvaluationHeader({
  agentName,
  grade,
  isStale = false,
  isRerunning = false,
  evaluationStatus,
  showGrade = true,
  children,
}: EvaluationHeaderProps) {
  const isComplete = evaluationStatus === "completed";
  const hasGrade = grade !== undefined && grade !== null;

  return (
    <div className="flex items-center gap-2">
      {showGrade && isComplete && hasGrade && !isRerunning && (
        <GradeBadge grade={grade} variant="grayscale" size="xs" />
      )}
      <span className="text-sm font-semibold text-gray-700">{agentName}</span>
      {isStale && isComplete && <StaleBadge size="sm" />}
      {isRerunning && (
        <StatusBadge status={evaluationStatus} showText={true} />
      )}
      {children}
    </div>
  );
}