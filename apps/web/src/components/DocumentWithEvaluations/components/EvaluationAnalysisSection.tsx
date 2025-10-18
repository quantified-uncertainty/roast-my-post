"use client";

import { Bot, ShieldUser } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

// Replaced custom CollapsibleSection with shadcn Accordion
import { CopyButton } from "@/components/CopyButton";
import { EvaluationComments } from "@/components/EvaluationComments";
import { GradeBadge } from "@/components/GradeBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ROUTES } from "@/constants/routes";
import type {
  Document,
  Evaluation,
  Comment as DbComment,
} from "@/shared/types/databaseTypes";

import { MARKDOWN_COMPONENTS } from "../config/markdown";

interface EvaluationAnalysisSectionProps {
  document: Document;
  evaluations: Evaluation[];
}

export function EvaluationAnalysisSection({
  document,
  evaluations,
}: EvaluationAnalysisSectionProps) {
  return (
    <div className="mx-auto mt-20 max-w-7xl px-4">
      <hr className="mb-16 border-2 border-gray-200" />
      <div className="mb-6 flex items-center justify-center gap-2 text-gray-700">
        <Bot className="h-4 w-4" />
        <span className="font-bold">
          {document.reviews.length} AI Evaluation
          {document.reviews.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="flex gap-8">
        {/* Main content */}
        <div className="flex-1 space-y-8">
          {evaluations.map((evaluation) => (
            <Card
              key={evaluation.agentId}
              id={`eval-${evaluation.agentId}`}
              className="shadow"
            >
              <CardHeader className="mb-0 border-b border-gray-200 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Link
                      href={ROUTES.AGENTS.DETAIL(evaluation.agentId)}
                      className="flex items-center gap-2 text-lg font-semibold text-blue-800 hover:text-blue-900 hover:underline"
                    >
                      <Bot className="h-4 w-4" />
                      {evaluation.agent.name}
                    </Link>
                    {!!evaluation.grade && (
                      <span className="mr-3">
                        <GradeBadge grade={evaluation.grade} variant="light" />
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/docs/${document.id}/evals/${evaluation.agentId}`}
                  >
                    <Button variant="outline" size="xs">
                      <ShieldUser className="mr-2 h-4 w-4" />
                      Open in Editor View
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {/* Summary Section */}
                {evaluation.summary && (
                  <Accordion
                    type="single"
                    collapsible
                    defaultValue={`eval-${evaluation.agentId}-summary`}
                  >
                    <AccordionItem value={`eval-${evaluation.agentId}-summary`}>
                      <AccordionTrigger>Summary</AccordionTrigger>
                      <AccordionContent>
                        <div className="mb-2 flex justify-end">
                          <CopyButton text={evaluation.summary} />
                        </div>
                        <div className="prose prose-sm max-w-none text-gray-600">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw]}
                            components={MARKDOWN_COMPONENTS}
                          >
                            {evaluation.summary}
                          </ReactMarkdown>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}

                {/* Analysis Section */}
                {evaluation.analysis && (
                  <Accordion type="single" collapsible>
                    <AccordionItem
                      value={`eval-${evaluation.agentId}-analysis`}
                    >
                      <AccordionTrigger>Analysis</AccordionTrigger>
                      <AccordionContent>
                        <div className="mb-2 flex justify-end">
                          <CopyButton text={evaluation.analysis} />
                        </div>
                        <div className="prose prose-sm max-w-none text-gray-600">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw]}
                            components={MARKDOWN_COMPONENTS}
                          >
                            {evaluation.analysis}
                          </ReactMarkdown>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}

                {/* Comments Section */}
                {evaluation.comments && evaluation.comments.length > 0 && (
                  <Accordion type="single" collapsible>
                    <AccordionItem
                      value={`eval-${evaluation.agentId}-comments`}
                    >
                      <AccordionTrigger>
                        {`Comments (${evaluation.comments.length})`}
                      </AccordionTrigger>
                      <AccordionContent>
                        <EvaluationComments
                          comments={evaluation.comments.map(
                            (comment: DbComment, index: number) => ({
                              id: `${evaluation.agentId}-comment-${index}`,
                              description: comment.description || "",
                              importance: comment.importance ?? null,
                              grade: comment.grade ?? null,
                              evaluationVersionId: evaluation.id || "",
                              highlightId: `${evaluation.agentId}-highlight-${index}`,
                              header: comment.header ?? null,
                              level: comment.level ?? null,
                              source: comment.source ?? null,
                              metadata: comment.metadata ?? null,
                              highlight: {
                                id: `${evaluation.agentId}-highlight-${index}`,
                                startOffset:
                                  comment.highlight?.startOffset || 0,
                                endOffset: comment.highlight?.endOffset || 0,
                                quotedText: comment.highlight?.quotedText || "",
                                isValid: comment.highlight?.isValid || true,
                                prefix: comment.highlight?.prefix ?? null,
                                error: comment.highlight?.error ?? null,
                              },
                            })
                          )}
                        />
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Table of Contents */}
        <div className="w-64 flex-shrink-0">
          <div className="sticky top-20">
            <nav className="space-y-1">
              <h3 className="mb-3 font-semibold text-gray-900">On this page</h3>
              <ul className="space-y-3">
                {evaluations.map((evaluation) => (
                  <li key={evaluation.agentId}>
                    <a
                      href={`#eval-${evaluation.agentId}`}
                      className="text-sm font-medium text-gray-700 hover:text-gray-900"
                    >
                      {evaluation.agent.name}
                    </a>
                    <ul className="ml-4 mt-2 space-y-1">
                      {evaluation.summary && (
                        <li>
                          <a
                            href={`#eval-${evaluation.agentId}-summary`}
                            className="text-sm text-gray-600 hover:text-gray-900"
                          >
                            Summary
                          </a>
                        </li>
                      )}
                      {evaluation.analysis && (
                        <li>
                          <a
                            href={`#eval-${evaluation.agentId}-analysis`}
                            className="text-sm text-gray-600 hover:text-gray-900"
                          >
                            Analysis
                          </a>
                        </li>
                      )}
                      {evaluation.comments &&
                        evaluation.comments.length > 0 && (
                          <li>
                            <a
                              href={`#eval-${evaluation.agentId}-comments`}
                              className="text-sm text-gray-600 hover:text-gray-900"
                            >
                              Comments ({evaluation.comments.length})
                            </a>
                          </li>
                        )}
                    </ul>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
