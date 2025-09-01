"use client";

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
  Squares2X2Icon,
  TableCellsIcon,
} from "@heroicons/react/24/outline";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SerializedDocumentListing } from "@/models/DocumentListing.types";

interface DocumentsResultsProps {
  documents: SerializedDocumentListing[];
  searchQuery: string;
  totalCount: number;
  hasSearched: boolean;
}

export default function DocumentsResults({
  documents,
  searchQuery,
  totalCount,
  hasSearched,
}: DocumentsResultsProps) {
  // Get unique evaluator names from all documents
  const evaluators = Array.from(
    new Set(
      documents
        .flatMap(
          (doc) =>
            doc.document?.evaluations?.map(
              (evaluation) => evaluation.agent.name
            ) || []
        )
        .filter(Boolean)
    )
  );

  return (
    <PageLayout>
      {/* Public Documents Header */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold text-gray-900">Public Documents</h1>
      </div>

      {/* Status message */}
      {!hasSearched && (
        <div className="py-2 text-center text-sm text-gray-600">
          Showing {totalCount} most recent documents. Type at least 2 characters
          to search all documents.
        </div>
      )}

      {hasSearched && (
        <div className="py-2 text-center text-sm text-gray-600">
          Found {totalCount} documents matching "{searchQuery}"
        </div>
      )}

      {/* Content Section */}
      <Tabs defaultValue="cards" className="w-full">
        <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="px-4 sm:px-0">
            <div className="mb-6 flex justify-center">
              <TabsList>
                <TabsTrigger value="cards" className="flex items-center gap-2">
                  <Squares2X2Icon className="h-5 w-5" />
                  Card View
                </TabsTrigger>
                <TabsTrigger value="table" className="flex items-center gap-2">
                  <TableCellsIcon className="h-5 w-5" />
                  Table View
                </TabsTrigger>
              </TabsList>
            </div>
          </div>
        </div>

        <TabsContent value="cards" className="mt-0">
          {/* Card View - Keep in container */}
          <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
            <div className="px-4 sm:px-0">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {documents.map((document) => {
                  // Count reviews by agent
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

                  return (
                    <Link
                      key={document.id}
                      href={`/docs/${document.document.id}/reader`}
                      className="block"
                    >
                      <Card className="h-full cursor-pointer transition-colors duration-150 hover:bg-gray-50">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base leading-7">
                            {document.title}
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
                            {Object.entries(agentReviews).map(
                              ([agentId, commentCount]) => {
                                const evaluation =
                                  document.document.evaluations.find(
                                    (r) => r.agentId === agentId
                                  );
                                // Just check if grade exists in the evaluation
                                const hasGrade =
                                  evaluation?.latestVersion?.grade !== null &&
                                  evaluation?.latestVersion?.grade !== undefined;
                                const grade = evaluation?.latestVersion?.grade;

                                return (
                                  <div
                                    key={agentId}
                                    className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
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
                                  </div>
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
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="table" className="mt-0">
          {/* Table View - Full width */}
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="overflow-x-auto">
              <div className="min-w-[1200px] px-8">
                {/* Minimum width to prevent squishing */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="max-w-[300px]">Title</TableHead>
                      <TableHead className="w-32">Author</TableHead>
                      <TableHead className="w-32">Date</TableHead>
                      <TableHead className="w-48">Platforms</TableHead>
                      <TableHead className="w-32">Length</TableHead>
                      {evaluators.map((evaluator) => (
                        <TableHead key={evaluator}>{evaluator}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((document) => (
                      <TableRow key={document.id}>
                        <TableCell className="max-w-[300px]">
                          <Link
                            href={`/docs/${document.document.id}/reader`}
                            className="flex items-center gap-2 truncate text-blue-600 hover:text-blue-900"
                          >
                            {document.title}
                          </Link>
                        </TableCell>
                        <TableCell className="w-32">
                          {document.authors.join(", ")}
                        </TableCell>
                        <TableCell className="w-32">
                          {new Date(
                            document.document.publishedDate
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="w-48">
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
                        </TableCell>
                        <TableCell className="w-32">
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
                        </TableCell>
                        {evaluators.map((evaluator) => {
                          const evaluation =
                            document.document?.evaluations?.find(
                              (r) => r.agent.name === evaluator
                            );
                          return (
                            <TableCell key={evaluator}>
                              {evaluation?.latestVersion?.grade !== undefined && (
                                <GradeBadge
                                  grade={
                                    evaluation.latestVersion.grade as
                                      | number
                                      | null
                                  }
                                  className="text-xs"
                                  variant="dark"
                                />
                              )}
                              {evaluation && (
                                <span className="ml-2 text-gray-500">
                                  <ChatBubbleLeftIcon className="inline h-3 w-3 text-gray-400" />
                                  <span className="ml-1">
                                    {evaluation.latestVersion?.commentCount || 0}
                                  </span>
                                </span>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}
