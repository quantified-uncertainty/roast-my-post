"use client";

import { useState } from "react";

import Link from "next/link";

import {
  formatCostFromDollars,
  formatDate,
  formatDuration,
} from "@/application/services/job/formatters";
import { AgentIcon } from "@/components/AgentIcon";
import { ExperimentalBadge } from "@/components/ExperimentalBadge";
import { GradeBadge } from "@/components/GradeBadge";
import { ROUTES } from "@/constants/routes";

import { EvaluationSection } from "./EvaluationSection";

interface EvaluationDetailsSectionProps {
  agentName: string;
  agentId?: string;
  agentDescription?: string;
  grade?: number | null;
  ephemeralBatch?: {
    trackingId: string | null;
    isEphemeral: boolean;
  } | null;
  priceInDollars?: number | string | null;
  durationInSeconds?: number | null;
  createdAt?: string | Date;
}

export function EvaluationDetailsSection({
  agentName,
  agentId,
  agentDescription,
  grade,
  ephemeralBatch,
  priceInDollars,
  durationInSeconds,
  createdAt,
}: EvaluationDetailsSectionProps) {
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  // Truncate description if needed
  const shouldTruncate = agentDescription && agentDescription.length > 150;
  const displayDescription =
    shouldTruncate && !descriptionExpanded
      ? agentDescription.substring(0, 150) + "..."
      : agentDescription;

  return (
    <EvaluationSection id="evaluation-details" title="Evaluation Details">
      <div className="space-y-6">
        {/* Agent Information and Statistics Row */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Agent Information */}
          <div className="lg:col-span-2">
            <div className="flex items-start gap-4">
              {/* Agent Icon */}
              <div className="flex-shrink-0">
                <AgentIcon agentId={agentId} size={32} />
              </div>

              {/* Agent Details */}
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-3">
                  {agentId ? (
                    <Link href={ROUTES.AGENTS.DETAIL(agentId)}>
                      <h3 className="cursor-pointer text-lg font-semibold text-gray-900 hover:text-gray-700 hover:underline">
                        {agentName}
                      </h3>
                    </Link>
                  ) : (
                    <h3 className="text-lg font-semibold text-gray-900">
                      {agentName}
                    </h3>
                  )}
                  {grade !== undefined && grade !== null && (
                    <GradeBadge grade={grade} variant="dark" size="sm" />
                  )}
                  {ephemeralBatch && ephemeralBatch.trackingId && (
                    <ExperimentalBadge trackingId={ephemeralBatch.trackingId} />
                  )}
                </div>

                {agentDescription && (
                  <div>
                    <p className="text-sm leading-relaxed text-gray-600">
                      {displayDescription}
                    </p>
                    {shouldTruncate && (
                      <button
                        onClick={() =>
                          setDescriptionExpanded(!descriptionExpanded)
                        }
                        className="mt-1 text-sm text-blue-600 hover:text-blue-800"
                      >
                        {descriptionExpanded ? "Show less" : "Show more"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Run Statistics */}
          <div className="lg:border-l lg:border-gray-200 lg:pl-6">
            <h4 className="mb-4 text-sm font-medium text-gray-700">
              Run Statistics
            </h4>
            <dl className="space-y-3">
              {durationInSeconds !== undefined &&
                durationInSeconds !== null && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-gray-500">
                      Duration
                    </dt>
                    <dd className="mt-1 text-sm font-medium text-gray-900">
                      {formatDuration(durationInSeconds)}
                    </dd>
                  </div>
                )}
              {priceInDollars !== undefined && priceInDollars !== null && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-gray-500">
                    Cost
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-gray-900">
                    {formatCostFromDollars(priceInDollars)}
                  </dd>
                </div>
              )}
              {createdAt && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-gray-500">
                    Created
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-gray-900">
                    {formatDate(createdAt)}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

      </div>
    </EvaluationSection>
  );
}
