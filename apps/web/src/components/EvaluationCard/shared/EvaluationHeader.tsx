"use client";

import Link from "next/link";

import { AgentIcon } from "@/components/AgentIcon";
import { GradeBadge } from "@/components/GradeBadge";
import { StaleBadge } from "@/components/StaleBadge";
import type { EvaluationStatus } from "@/components/StatusBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { ROUTES } from "@/constants/routes";

interface EvaluationHeaderProps {
  agentName: string;
  agentId: string;
  grade?: number | null;
  isStale?: boolean;
  isRerunning?: boolean;
  evaluationStatus: EvaluationStatus;
  showGrade?: boolean;
  children?: React.ReactNode;
}

/**
 * Shared header component for evaluation cards
 * Shows evaluator name, grade/status badge, and stale/rerunning indicators
 */
export function EvaluationHeader({
  agentName,
  agentId,
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
      <AgentIcon agentId={agentId} size={20} />
      <Link
        href={ROUTES.AGENTS.DETAIL(agentId)}
        className="text-sm font-semibold text-gray-600 underline hover:text-blue-900"
      >
        {agentName}
      </Link>
      {isStale && isComplete && <StaleBadge size="sm" />}
      {isRerunning && <StatusBadge status={evaluationStatus} showText={true} />}
      {children}
    </div>
  );
}
