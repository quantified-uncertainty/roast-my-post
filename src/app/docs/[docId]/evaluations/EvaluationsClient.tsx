"use client";

import { useState } from "react";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/Button";
import type { Document, Evaluation } from "@/types/documentSchema";
import { getGradeColorStrong, getLetterGrade } from "@/utils/commentUtils";
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  ChatBubbleLeftIcon,
  DocumentTextIcon,
  DocumentTextIcon as DocumentTextIcon2,
  SparklesIcon,
} from "@heroicons/react/24/outline";

import { rerunEvaluation } from "./actions";

interface EvaluationsClientProps {
  document: Document;
  isOwner?: boolean;
}

export default function EvaluationsClient({
  document,
  isOwner,
}: EvaluationsClientProps) {
  const { reviews } = document;
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [selectedVersionIndex, setSelectedVersionIndex] = useState<
    number | null
  >(null);
  const [activeTab, setActiveTab] = useState<
    "summary" | "comments" | "thinking"
  >("summary");

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

  const handleRerun = async (evaluationId: string) => {
    await rerunEvaluation(evaluationId, document.id);
  };

  const selectedReview = reviews.find(
    (review) => review.agentId === selectedReviewId
  );

  const selectedVersion = selectedReview?.versions?.[selectedVersionIndex ?? 0];

  return (
    <div className="container mx-auto max-w-[2000px] py-8">
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
        <div className="grid grid-cols-12 gap-6">
          {/* Left column - Evaluations list (2 columns) */}
          <div className="col-span-2 overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
              <h2 className="text-lg font-medium">
                Evaluations ({reviews.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-200">
              {reviews.map((review: Evaluation) => (
                <div
                  key={review.agentId}
                  className={`cursor-pointer p-6 hover:bg-gray-50 ${
                    selectedReviewId === review.agentId ? "bg-gray-50" : ""
                  }`}
                  onClick={() => {
                    setSelectedReviewId(review.agentId);
                    setSelectedVersionIndex(0);
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {review.agent.name} {`v${review.agent.version}`}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {formatDate(review.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {review.versions && review.versions.length > 0 && (
                        <div className="text-sm text-gray-500">
                          {review.versions.length} versions
                        </div>
                      )}
                      {isOwner && (
                        <Button
                          variant="secondary"
                          className="flex items-center gap-1 px-2 py-1 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRerun(review.agentId);
                          }}
                        >
                          <ArrowPathIcon className="h-3 w-3" />
                          Rerun
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Middle column - Version history (3 columns) */}
          <div className="col-span-3 overflow-hidden rounded-lg border border-gray-200 bg-white">
            {selectedReview ? (
              <div>
                <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
                  <h2 className="text-lg font-medium">
                    Version History - {selectedReview.agent.name}
                  </h2>
                </div>
                <div className="p-6">
                  {selectedReview.versions &&
                  selectedReview.versions.length > 0 ? (
                    <div className="space-y-4">
                      {selectedReview.versions.map((version, index) => (
                        <div
                          key={index}
                          className={`cursor-pointer rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:bg-gray-50 ${
                            selectedVersionIndex === index
                              ? "border-blue-500 bg-blue-50"
                              : ""
                          }`}
                          onClick={() => setSelectedVersionIndex(index)}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h5 className="font-medium text-gray-800">
                                Version{" "}
                                {selectedReview.versions?.length
                                  ? selectedReview.versions.length - index
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
                                getGradeColorStrong(version.grade || 0).style
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
                                  {(version.job.costInCents / 100).toFixed(2)}
                                </span>
                              )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500">
                      No versions available for this evaluation
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center p-8 text-center text-gray-500">
                Select an evaluation to view its version history
              </div>
            )}
          </div>

          {/* Right column - Full version details (7 columns) */}
          <div className="col-span-7 overflow-hidden rounded-lg border border-gray-200 bg-white">
            {selectedVersion ? (
              <div>
                <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
                  <div className="mb-4">
                    <h2 className="text-lg font-medium">Version Details</h2>
                    <div className="mt-2 space-y-2 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Agent Version:</span>{" "}
                        {selectedReview?.agent.name} v
                        {selectedReview?.agent.version}
                      </div>
                      <div>
                        <span className="font-medium">Document Version:</span>{" "}
                        {selectedVersion?.documentVersion?.version || "1"}
                      </div>
                      <div>
                        <span className="font-medium">Created:</span>{" "}
                        {formatDate(selectedVersion.createdAt)}
                      </div>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex space-x-4 border-b border-gray-200">
                    <button
                      onClick={() => setActiveTab("summary")}
                      className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium ${
                        activeTab === "summary"
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                      }`}
                    >
                      <DocumentTextIcon2 className="h-4 w-4" />
                      Summary
                    </button>
                    <button
                      onClick={() => setActiveTab("comments")}
                      className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium ${
                        activeTab === "comments"
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                      }`}
                    >
                      <ChatBubbleLeftIcon className="h-4 w-4" />
                      Comments ({selectedVersion.comments?.length || 0})
                    </button>
                    <button
                      onClick={() => setActiveTab("thinking")}
                      className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium ${
                        activeTab === "thinking"
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                      }`}
                    >
                      <SparklesIcon className="h-4 w-4" />
                      Thinking
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  {/* Summary Tab */}
                  {activeTab === "summary" && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="mb-2 text-lg font-medium text-gray-900">
                          Summary
                        </h3>
                        <div className="prose max-w-none">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw]}
                          >
                            {selectedVersion.summary}
                          </ReactMarkdown>
                        </div>
                      </div>

                      <div>
                        <h3 className="mb-2 text-lg font-medium text-gray-900">
                          Grade
                        </h3>
                        <div className="flex items-center gap-4">
                          <div
                            className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-medium text-white"
                            style={
                              getGradeColorStrong(selectedVersion.grade || 0)
                                .style
                            }
                          >
                            {getLetterGrade(selectedVersion.grade || 0)}
                          </div>
                          <div className="text-gray-700">
                            Numerical Grade: {selectedVersion.grade || 0}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Comments Tab */}
                  {activeTab === "comments" && (
                    <div className="space-y-6">
                      {selectedVersion.comments?.map((comment, index) => (
                        <div
                          key={index}
                          className="rounded-lg border border-gray-200 p-4"
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <h4 className="font-medium text-gray-900">
                              {comment.title}
                            </h4>
                            {comment.grade !== undefined && (
                              <div
                                className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium text-white"
                                style={getGradeColorStrong(comment.grade).style}
                              >
                                {getLetterGrade(comment.grade)}
                              </div>
                            )}
                          </div>
                          <div className="prose max-w-none">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              rehypePlugins={[rehypeRaw]}
                            >
                              {comment.description}
                            </ReactMarkdown>
                          </div>
                          {comment.highlight && (
                            <div className="mt-4 rounded bg-gray-50 p-4">
                              <div className="mb-2 font-medium text-gray-900">
                                Highlighted Text
                              </div>
                              <div className="text-gray-700">
                                {comment.highlight.quotedText}
                              </div>
                              <div className="mt-2 text-sm text-gray-500">
                                Location: {comment.highlight.startOffset} -{" "}
                                {comment.highlight.endOffset}
                              </div>
                            </div>
                          )}
                          {comment.importance && (
                            <div className="mt-2 text-sm text-gray-500">
                              Importance: {comment.importance}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Thinking Tab */}
                  {activeTab === "thinking" && (
                    <div className="space-y-6">
                      {selectedVersion.job?.llmThinking ? (
                        <div className="prose max-w-none">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw]}
                          >
                            {selectedVersion.job.llmThinking}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <div className="text-center text-gray-500">
                          No thinking process available for this version
                        </div>
                      )}
                      {selectedVersion.job?.costInCents &&
                        selectedVersion.job.costInCents > 0 && (
                          <div className="mt-4 text-sm text-gray-500">
                            Cost: $
                            {(selectedVersion.job.costInCents / 100).toFixed(2)}
                          </div>
                        )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center p-8 text-center text-gray-500">
                Select a version to view its details
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
