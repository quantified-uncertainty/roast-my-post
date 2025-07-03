import { GradeBadge } from "@/components/GradeBadge";
import type { Comment } from "@/types/documentSchema";
import { getValidAndSortedComments } from "@/utils/ui/commentUtils";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon, StarIcon, XCircleIcon } from "@heroicons/react/24/solid";

import { CommentsSidebarProps } from "../types";
import { getImportancePhrase } from "../utils";
import { MarkdownRenderer } from "./MarkdownRenderer";

/**
 * Handles hover and click interactions for comments in the sidebar.
 * Note: Comments can be interacted with in two places:
 * 1. In the document content (via SlateEditor's onHighlightHover and onHighlightClick)
 * 2. In this sidebar (via onCommentHover and onCommentClick)
 * Both hover interactions update the same hoveredCommentId state
 * Both click interactions update the same expandedCommentId state
 */
export function CommentsSidebar({
  comments,
  activeTag,
  expandedTag,
  onCommentHover,
  onCommentClick,
  evaluation,
  commentColorMap,
}: CommentsSidebarProps) {
  // Get valid and sorted comments
  const sortedComments = getValidAndSortedComments(comments);

  return (
    <div className="px-4">
      <div className="divide-y divide-gray-100">
        {sortedComments.map((comment: Comment, index: number) => {
          const tag = index.toString();
          const hasGradeInstructions = evaluation.agent.providesGrades ?? false;

          return (
            <div
              key={tag}
              className={`transition-all duration-200 ${
                expandedTag === tag ? "shadow-sm" : "hover:bg-gray-50"
              }`}
              onMouseEnter={() => onCommentHover(tag)}
              onMouseLeave={() => onCommentHover(null)}
              onClick={() => onCommentClick(tag)}
            >
              <div
                className={`px-4 py-3 ${expandedTag === tag ? "border-l-2 border-blue-400" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`} flex h-6 w-6 select-none items-center justify-center rounded-full text-sm font-medium transition-all duration-200`}
                    style={{
                      backgroundColor: commentColorMap[index].background,
                      color: commentColorMap[index].color,
                    }}
                  >
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3
                        className={`font-medium ${expandedTag === tag ? "text-blue-900" : "text-gray-900"}`}
                      >
                        <MarkdownRenderer className="inline">
                          {comment.description
                            .split("\n")
                            .slice(0, 2)
                            .join("\n")}
                        </MarkdownRenderer>
                      </h3>
                      <div className="flex shrink-0 items-center gap-2">
                        {hasGradeInstructions && (
                          <>
                            {comment.grade !== undefined &&
                              comment.grade > 70 && (
                                <CheckCircleIcon className="h-5 w-5 text-green-500 opacity-40" />
                              )}
                            {comment.grade !== undefined &&
                              comment.grade < 30 && (
                                <XCircleIcon className="h-5 w-5 text-red-500 opacity-40" />
                              )}
                          </>
                        )}
                        <ChevronLeftIcon
                          className={`h-4 w-4 transition-transform duration-200 ${
                            expandedTag === tag
                              ? "-rotate-90 text-gray-400"
                              : "text-gray-300"
                          }`}
                        />
                      </div>
                    </div>
                    {expandedTag === tag &&
                      comment.description.split("\n").length > 2 && (
                        <div className="mt-1 text-gray-800">
                          <MarkdownRenderer className="text-sm">
                            {comment.description
                              .split("\n")
                              .slice(2)
                              .join("\n")}
                          </MarkdownRenderer>
                        </div>
                      )}
                    {expandedTag === tag && (
                      <div className="mt-2 text-xs text-gray-400">
                        {comment.grade !== undefined && (
                          <span className="mr-4">
                            Grade:{" "}
                            <GradeBadge
                              grade={comment.grade}
                              variant="light"
                              size="xs"
                            />
                          </span>
                        )}
                        {comment.importance !== undefined && (
                          <span>
                            Importance:{" "}
                            <span>
                              {getImportancePhrase(comment.importance)}
                            </span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
