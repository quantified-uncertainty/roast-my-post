"use client";

import Link from "next/link";

import { evaluationAgents } from "@/data/agents";
import { documentsCollection } from "@/data/docs";
import {
  getGradeColor,
  getLetterGrade,
  getValidCommentCount,
} from "@/utils/commentUtils";
import { ChatBubbleLeftIcon } from "@heroicons/react/24/outline";

export default function DocumentsPage() {
  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h2 className="mb-4 text-lg font-semibold">Available Documents</h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {documentsCollection.documents.map((document) => {
              // Count reviews by agent
              const agentReviews =
                document.reviews?.reduce(
                  (acc, review) => {
                    acc[review.agentId] =
                      (acc[review.agentId] || 0) +
                      getValidCommentCount(review.comments || []);
                    return acc;
                  },
                  {} as Record<string, number>
                ) || {};

              return (
                <Link
                  key={document.id}
                  href={`/docs/${document.slug}`}
                  className="rounded-lg border border-gray-200 p-4 transition-colors duration-150 hover:bg-gray-50"
                >
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base leading-7 font-semibold text-gray-900">
                      {document.title}
                    </h2>
                    <p className="mt-1 truncate text-sm leading-5 text-gray-500">
                      {document.content}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {Object.entries(agentReviews).map(
                        ([agentId, commentCount]) => {
                          const agent = evaluationAgents.find(
                            (a) => a.id === agentId
                          );
                          const hasGradeInstructions = agent?.gradeInstructions;
                          const grade = document.reviews.find(
                            (r) => r.agentId === agentId
                          )?.grade;

                          return (
                            <span
                              key={agentId}
                              className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600"
                            >
                              {agentId}
                              {hasGradeInstructions && grade !== undefined && (
                                <span
                                  className="ml-1 rounded-sm px-1.5"
                                  style={getGradeColor(grade)}
                                >
                                  {getLetterGrade(grade)}
                                </span>
                              )}
                              <ChatBubbleLeftIcon className="h-3 w-3" />{" "}
                              {commentCount}
                            </span>
                          );
                        }
                      )}
                      {document.reviews?.length === 0 && (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                          No reviews yet
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
