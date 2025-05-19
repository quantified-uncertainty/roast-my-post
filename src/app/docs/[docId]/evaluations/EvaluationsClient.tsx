"use client";

import { useState } from "react";

import Link from "next/link";

import { Button } from "@/components/Button";
import type { Document, Evaluation } from "@/types/documentSchema";
import { getGradeColorStrong, getLetterGrade } from "@/utils/commentUtils";
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

interface EvaluationsClientProps {
  document: Document;
  isOwner?: boolean;
}

export default function EvaluationsClient({
  document,
  isOwner,
}: EvaluationsClientProps) {
  const { reviews } = document;
  const [expandedReviews, setExpandedReviews] = useState<
    Record<string, boolean>
  >({});

  const toggleReviewExpansion = (reviewId: string) => {
    setExpandedReviews((prev) => ({
      ...prev,
      [reviewId]: !prev[reviewId],
    }));
  };

  const formatDate = (dateString: Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="container mx-auto max-w-5xl py-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href={`/docs/${document.id}`}>
            <Button variant="secondary" className="flex items-center gap-2">
              <ArrowLeftIcon className="h-4 w-4" />
              Back to Document
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">
            Evaluations for: {document.title}
          </h1>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <DocumentTextIcon className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="mb-2 text-lg font-medium">No evaluations yet</h3>
          <p className="mb-4 text-gray-500">
            This document hasn't been evaluated by any agents yet.
          </p>
          {isOwner && (
            <Link href={`/docs/${document.id}`}>
              <Button>View Document</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
              <h2 className="text-lg font-medium">
                Evaluations ({reviews.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-200">
              {reviews.map((review: Evaluation) => {
                const isExpanded = expandedReviews[review.agentId] || false;
                const hasVersions =
                  review.versions && review.versions.length > 0;

                return (
                  <div
                    key={review.agentId}
                    className="border-b border-gray-200 last:border-b-0"
                  >
                    <div
                      className="flex cursor-pointer items-start p-6 hover:bg-gray-50"
                      onClick={() => toggleReviewExpansion(review.agentId)}
                    >
                      <div className="ml-4 flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="flex items-center gap-2 font-medium text-gray-900">
                              {review.agent.name} {`v${review.agent.version}`}
                              {hasVersions && (
                                <span className="text-gray-400">
                                  {isExpanded ? (
                                    <ChevronDownIcon className="h-4 w-4" />
                                  ) : (
                                    <ChevronRightIcon className="h-4 w-4" />
                                  )}
                                </span>
                              )}
                            </h3>
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatDate(review.createdAt)}
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex items-center space-x-4 text-sm">
                            {review.costInCents > 0 && (
                              <span className="text-gray-500">
                                Versions: {review.versions?.length}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Versions section */}
                    {isExpanded && hasVersions && (
                      <div className="bg-gray-50 px-6 py-4 pl-20">
                        <h4 className="mb-2 text-sm font-medium text-gray-700">
                          Version History
                        </h4>
                        <div className="space-y-4">
                          {review.versions?.map((version, index) => (
                            <div
                              key={index}
                              className="rounded-lg border border-gray-200 bg-white p-4"
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <h5 className="font-medium text-gray-800">
                                    Version{" "}
                                    {review.versions?.length
                                      ? review.versions.length - index
                                      : 0}
                                    {index === 0 && " (Latest)"}
                                  </h5>
                                  <p className="mt-1 text-xs text-gray-500">
                                    Created: {formatDate(version.createdAt)}
                                  </p>
                                </div>
                                <div
                                  className="flex h-8 w-8 items-center justify-center rounded-full"
                                  style={
                                    getGradeColorStrong(version.grade || 0)
                                      .style
                                  }
                                >
                                  <span className="text-xs font-medium text-white">
                                    {getLetterGrade(version.grade || 0)}
                                  </span>
                                </div>
                              </div>

                              <div className="mt-2">
                                <p className="line-clamp-2 text-sm text-gray-600">
                                  {version.summary}
                                </p>
                              </div>

                              <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                                <span>
                                  {version.comments?.length || 0} comments
                                </span>
                                {version.job?.costInCents &&
                                  version.job.costInCents > 0 && (
                                    <span>
                                      Cost: $
                                      {(version.job.costInCents / 100).toFixed(
                                        2
                                      )}
                                    </span>
                                  )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
