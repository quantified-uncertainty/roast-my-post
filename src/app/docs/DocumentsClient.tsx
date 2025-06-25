"use client";
import { useState, useEffect } from "react";
import { logger } from "@/lib/logger";

import Link from "next/link";

import { GradeBadge } from "@/components/GradeBadge";
import {
  Document,
  Evaluation,
} from "@/types/documentSchema";
import { getValidCommentCount } from "@/utils/ui/commentUtils";
import {
  formatWordCount,
  getWordCountInfo,
} from "@/utils/ui/documentUtils";
import {
  ChatBubbleLeftIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
  TableCellsIcon,
} from "@heroicons/react/24/outline";

export default function DocumentsClient({
  documents,
  currentUserId,
  showNewButton = true,
  initialLoad = false,
}: {
  documents: Document[];
  currentUserId?: string;
  showNewButton?: boolean;
  initialLoad?: boolean;
}) {
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [searchQuery, setSearchQuery] = useState("");
  const [allDocuments, setAllDocuments] = useState<Document[]>(documents);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Update documents when prop changes
  useEffect(() => {
    setAllDocuments(documents);
  }, [documents]);

  // Get unique evaluator names from all documents
  const evaluators = Array.from(
    new Set(
      documents
        .flatMap(
          (doc) =>
            doc.reviews?.map((review: Evaluation) => review.agent.name) || []
        )
        .filter(Boolean)
    )
  );

  // Server search function
  const handleServerSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setHasSearched(true);
    
    try {
      const response = await fetch(`/api/documents/search?q=${encodeURIComponent(searchQuery)}&limit=50`);
      if (!response.ok) throw new Error('Search failed');
      
      const data = await response.json();
      setAllDocuments(data.documents);
    } catch (error) {
      logger.error('Search error:', error);
      // Keep current documents on error
    } finally {
      setIsSearching(false);
    }
  };

  // Filter documents based on search query (for instant local search)
  // Match server search behavior for consistency
  const filteredDocuments = allDocuments.filter((document) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();

    // Build searchable text from all metadata (mimics server searchableText)
    const searchableText = [
      document.title,
      document.author, // This is already joined authors
      ...(document.platforms || []),
      document.url,
      document.importUrl || ''
    ].join(' ').toLowerCase();

    // Check searchable text
    if (searchableText.includes(query)) {
      return true;
    }

    // Check if any agent name matches
    return document.reviews?.some((review: Evaluation) =>
      review.agent.name.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Search and View Toggle - Keep in container */}
      <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8 flex flex-col items-center gap-4">
            <div className="flex w-full max-w-2xl justify-between">
              <div className="relative flex-grow">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleServerSearch()}
                  placeholder="Search by title or agent name..."
                  className="block w-full rounded-md border-0 py-2 pl-10 pr-20 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                />
                {initialLoad && (
                  <button
                    onClick={handleServerSearch}
                    disabled={isSearching || !searchQuery.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 disabled:text-gray-400"
                  >
                    {isSearching ? 'Searching...' : 'Search All'}
                  </button>
                )}
              </div>
              {showNewButton && (
                <Link
                  href="/docs/new"
                  className="ml-4 inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  New Document
                </Link>
              )}
            </div>
            <div className="inline-flex rounded-lg bg-gray-100 p-1">
              <button
                onClick={() => setViewMode("cards")}
                className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium ${
                  viewMode === "cards"
                    ? "bg-white text-gray-900 shadow"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Squares2X2Icon className="h-5 w-5" />
                Card View
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium ${
                  viewMode === "table"
                    ? "bg-white text-gray-900 shadow"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <TableCellsIcon className="h-5 w-5" />
                Table View
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Status message */}
      {initialLoad && !hasSearched && (
        <div className="text-center py-2 text-sm text-gray-600">
          Showing {allDocuments.length} most recent documents. Use "Search All" to find older documents.
        </div>
      )}

      {/* Content Section */}
      {viewMode === "cards" ? (
        // Card View - Keep in container
        <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="px-4 sm:px-0">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredDocuments.map((document) => {
                // Count reviews by agent
                const agentReviews =
                  document.reviews?.reduce(
                    (acc: Record<string, number>, review: Evaluation) => {
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
                      <h2 className="text-base font-semibold leading-7 text-gray-900">
                        {document.title}
                      </h2>
                      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                        <div>{document.author}</div>
                        <div className="text-gray-300">•</div>
                        <div>
                          {new Date(document.publishedDate).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          )}
                        </div>
                        <div className="text-gray-300">•</div>
                        <div className="flex items-center gap-1">
                          {(() => {
                            const { wordCount, color } = getWordCountInfo(
                              document.content
                            );
                            return (
                              <span className={color}>
                                {formatWordCount(wordCount) + " words"}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                      {document.url && (
                        <div className="mt-1 flex items-center gap-2 truncate text-xs">
                          <span
                            className="cursor-pointer text-blue-400 hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(
                                document.url,
                                "_blank",
                                "noopener,noreferrer"
                              );
                            }}
                          >
                            {(() => {
                              try {
                                const url = new URL(document.url);
                                const path = url.pathname.split("/")[1];
                                return `${url.hostname}${path ? `/${path}...` : ""}`;
                              } catch {
                                return document.url;
                              }
                            })()}
                          </span>
                          {document.platforms &&
                            document.platforms.length > 0 && (
                              <>
                                <div className="text-gray-300">•</div>
                                <div className="flex items-center gap-2">
                                  {document.platforms.map(
                                    (platform: string) => (
                                      <span
                                        key={platform}
                                        className="inline-flex items-center text-xs font-medium text-blue-500"
                                      >
                                        {platform}
                                      </span>
                                    )
                                  )}
                                </div>
                              </>
                            )}
                        </div>
                      )}
                      <div className="mt-4 flex flex-wrap gap-2">
                        {Object.entries(agentReviews).map(
                          ([agentId, commentCount]) => {
                            const review = document.reviews.find(
                              (r: Evaluation) => r.agentId === agentId
                            );
                            // Just check if grade exists in the evaluation
                            const hasGrade = review?.grade !== null && review?.grade !== undefined;
                            const grade = review?.grade;

                            return (
                              <div
                                key={agentId}
                                className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
                              >
                                {review?.agent.name}
                                {hasGrade && (
                                    <GradeBadge
                                      grade={grade ?? null}
                                      className="ml-1 text-xs"
                                      variant="dark"
                                    />
                                  )}
                                <ChatBubbleLeftIcon className="ml-2 h-3 w-3 text-gray-400" />{" "}
                                <span className="text-gray-500">
                                  {commentCount}
                                </span>
                              </div>
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
        </div>
      ) : (
        // Table View - Full width
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="overflow-x-auto">
            <div className="min-w-[1200px] px-8">
              {/* Minimum width to prevent squishing */}
              <table className="w-full divide-y divide-gray-200 rounded-lg border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="max-w-[300px] border-b border-gray-200 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                    >
                      Title
                    </th>
                    <th
                      scope="col"
                      className="w-32 border-b border-gray-200 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                    >
                      Author
                    </th>
                    <th
                      scope="col"
                      className="w-32 border-b border-gray-200 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                    >
                      Date
                    </th>
                    <th
                      scope="col"
                      className="w-48 border-b border-gray-200 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                    >
                      Platforms
                    </th>
                    <th
                      scope="col"
                      className="w-32 border-b border-gray-200 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                    >
                      Length
                    </th>
                    {evaluators.map((evaluator) => (
                      <th
                        key={evaluator}
                        scope="col"
                        className="border-b border-gray-200 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                      >
                        {evaluator}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredDocuments.map((document) => (
                    <tr key={document.id} className="hover:bg-gray-50">
                      <td className="max-w-[300px] whitespace-nowrap border-b border-gray-200 px-4 py-4">
                        <Link
                          href={`/docs/${document.slug}`}
                          className="block truncate text-blue-600 hover:text-blue-900"
                        >
                          {document.title}
                        </Link>
                      </td>
                      <td className="w-32 whitespace-nowrap border-b border-gray-200 px-6 py-4 text-sm text-gray-500">
                        {document.author}
                      </td>
                      <td className="w-32 whitespace-nowrap border-b border-gray-200 px-6 py-4 text-sm text-gray-500">
                        {new Date(document.publishedDate).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }
                        )}
                      </td>
                      <td className="w-48 whitespace-nowrap border-b border-gray-200 px-6 py-4 text-sm">
                        <div className="flex flex-wrap gap-2">
                          {document.platforms?.map((platform: string) => (
                            <span
                              key={platform}
                              className="inline-flex items-center text-xs font-medium text-blue-500"
                            >
                              {platform}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="w-32 whitespace-nowrap border-b border-gray-200 px-6 py-4 text-sm">
                        <div className="flex items-center gap-1">
                          {(() => {
                            const { wordCount, color } = getWordCountInfo(
                              document.content
                            );
                            return (
                              <span className={color}>
                                {formatWordCount(wordCount) + " words"}
                              </span>
                            );
                          })()}
                        </div>
                      </td>
                      {evaluators.map((evaluator) => {
                        const review = document.reviews?.find(
                          (r: Evaluation) => r.agent.name === evaluator
                        );
                        return (
                          <td
                            key={evaluator}
                            className="whitespace-nowrap border-b border-gray-200 px-6 py-4 text-sm"
                          >
                            {review?.grade !== undefined && (
                              <GradeBadge
                                grade={review.grade}
                                className="text-xs"
                                variant="dark"
                              />
                            )}
                            {review && (
                              <span className="ml-2 text-gray-500">
                                <ChatBubbleLeftIcon className="inline h-3 w-3 text-gray-400" />
                                <span className="ml-1">
                                  {getValidCommentCount(review.comments || [])}
                                </span>
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
