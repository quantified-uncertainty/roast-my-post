"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import Link from "next/link";
import { PageLayout } from "@/components/PageLayout";
import { GradeBadge } from "@/components/GradeBadge";
import { PrivacyBadge } from "@/components/PrivacyBadge";
import {
  formatWordCount,
  getWordCountInfo,
} from "@/shared/utils/ui/documentUtils";
import {
  ChatBubbleLeftIcon,
  MagnifyingGlassIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  DocumentTextIcon,
  LinkIcon,
} from "@heroicons/react/24/outline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SerializedDocumentListing } from "@/models/DocumentListing.types";

interface DocumentsLayoutClientProps {
  documents: SerializedDocumentListing[];
  searchQuery: string;
  totalCount: number;
  hasSearched: boolean;
  title: string;
  subtitle: string;
  showPrivacyBadges?: boolean;
  currentUserId?: string;
}

export default function DocumentsLayoutClient({
  documents,
  searchQuery: initialSearchQuery,
  totalCount,
  hasSearched,
  title,
  subtitle,
  showPrivacyBadges = false,
  currentUserId,
}: DocumentsLayoutClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);

  // Update local state when prop changes
  useEffect(() => {
    setSearchQuery(initialSearchQuery);
  }, [initialSearchQuery]);

  // Debounced search function that updates URL
  const debouncedSearch = useDebouncedCallback((query: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (query.trim()) {
      params.set("search", query.trim());
    } else {
      params.delete("search");
    }

    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(newUrl);
  }, 300);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    debouncedSearch(value);
  };

  return (
    <PageLayout background="gray">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="pt-8 pb-6">
          <h1 className="text-3xl font-semibold text-gray-900">{title}</h1>
          <p className="mt-2 text-gray-600">{subtitle}</p>
        </div>
        
        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-2xl">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search documents..."
              className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 pl-10 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            />
          </div>
        </div>

        {/* Status message */}
        {!hasSearched && (
          <div className="mb-6 text-sm text-gray-600">
            Showing {totalCount} most recent documents. Type at least 2 characters to search all documents.
          </div>
        )}

        {hasSearched && (
          <div className="mb-6 text-sm text-gray-600">
            Found {totalCount} documents matching "{searchQuery}"
          </div>
        )}

        {/* Cards Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {documents.map((document) => {
            const agentReviews =
              document.document?.evaluations?.reduce(
                (acc: Record<string, number>, evaluation) => {
                  const agentId = evaluation.agentId;
                  acc[agentId] =
                    (acc[agentId] || 0) +
                    (evaluation.latestVersion?.commentCount || 0);
                  return acc;
                },
                {} as Record<string, number>
              ) || {};

            const isOwner = currentUserId && document.document.submittedById === currentUserId;
            const hasSource = document.urls && document.urls.length > 0;

            return (
              <div key={document.id} className="relative">
                <Card className="h-full transition-colors duration-150">
                  <CardHeader className="pb-3 pr-12">
                    <CardTitle className="text-base leading-7">
                      <Link 
                        href={`/docs/${document.document.id}/reader`}
                        className="hover:text-blue-600 transition-colors"
                      >
                        {document.title}
                      </Link>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="mb-2 flex items-center gap-2 text-xs text-gray-500">
                      <div>{document.authors.join(", ")}</div>
                      <div className="text-gray-300">•</div>
                      <div>
                        {new Date(
                          document.document.publishedDate
                        ).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
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
                    {document.urls[0] && (
                      <div className="mb-3 flex items-center gap-2 truncate text-xs">
                        <span
                          className="cursor-pointer text-blue-400 hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(
                              document.urls[0],
                              "_blank",
                              "noopener,noreferrer"
                            );
                          }}
                        >
                          {(() => {
                            try {
                              const url = new URL(document.urls[0]);
                              const path = url.pathname.split("/")[1];
                              return `${url.hostname}${path ? `/${path}...` : ""}`;
                            } catch {
                              return document.urls[0];
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
                    <div className="flex flex-wrap gap-2">
                      {showPrivacyBadges && (
                        <PrivacyBadge isPrivate={document.document.isPrivate} size="xs" />
                      )}
                      {Object.entries(agentReviews).map(
                        ([agentId, commentCount]) => {
                          const evaluation =
                            document.document.evaluations.find(
                              (r) => r.agentId === agentId
                            );
                          const hasGrade =
                            evaluation?.latestVersion?.grade !== null &&
                            evaluation?.latestVersion?.grade !== undefined;
                          const grade = evaluation?.latestVersion?.grade;

                          return (
                            <Link
                              key={agentId}
                              href={`/docs/${document.document.id}/reader?evals=${agentId}`}
                              className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 hover:bg-gray-200 transition-colors"
                            >
                              {evaluation?.agent.name || "Unknown Agent"}
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
                            </Link>
                          );
                        }
                      )}
                      {!document.document?.evaluations?.length && (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                          No reviews yet
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
                
                {/* Dropdown Menu */}
              <div className="absolute top-2 right-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                      onClick={(e) => e.preventDefault()}
                    >
                      <EllipsisVerticalIcon className="h-5 w-5 text-gray-500" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {isOwner && (
                      <>
                        <DropdownMenuItem asChild>
                          <a href={`/docs/${document.document.id}/edit`} className="flex items-center gap-2 cursor-pointer">
                            <PencilIcon className="h-4 w-4" />
                            <span>Edit</span>
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem asChild>
                      <a href={`/docs/${document.document.id}`} className="flex items-center gap-2 cursor-pointer">
                        <DocumentTextIcon className="h-4 w-4" />
                        <span>Details</span>
                      </a>
                    </DropdownMenuItem>
                    {hasSource && (
                      <DropdownMenuItem asChild>
                        <a 
                          href={document.urls[0]} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <LinkIcon className="h-4 w-4" />
                          <span>Source</span>
                        </a>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            );
          })}
        </div>
      </div>
    </PageLayout>
  );
}