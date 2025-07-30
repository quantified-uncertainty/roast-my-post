"use client";

import { useRef } from "react";

import Link from "next/link";

import SlateEditor from "@/components/SlateEditor";
import { InformationCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/20/solid";
import type { Document } from "@/types/documentSchema";

import { DocumentMetadata } from "./DocumentMetadata";

interface FailedJob {
  id: string;
  status: string;
  createdAt: Date;
  agentName: string;
  agentId: string;
}

interface EmptyEvaluationsViewProps {
  document: Document;
  contentWithMetadataPrepend: string;
  isOwner?: boolean;
  hasPendingJobs?: boolean;
  failedJobs?: FailedJob[];
}

export function EmptyEvaluationsView({
  document,
  contentWithMetadataPrepend,
  isOwner = false,
  hasPendingJobs = false,
  failedJobs = [],
}: EmptyEvaluationsViewProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex h-full flex-col overflow-x-hidden">
      {/* Unified scroll container for all content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden pt-2">
        {/* Document content section */}
        <div className="flex min-h-screen justify-center py-5">
          {/* Main content area */}
          <div ref={contentRef} className="relative max-w-3xl flex-1 p-0">
            {/* Message banner at the top */}
            {hasPendingJobs ? (
              <div className="mx-6 mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center gap-2">
                  <InformationCircleIcon className="h-5 w-5 text-amber-600" />
                  <p className="text-sm text-amber-800">
                    Processing evaluations... This may take a few moments.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mx-6 mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <InformationCircleIcon className="h-5 w-5 text-blue-600" />
                    <p className="text-sm text-blue-800">
                      {isOwner
                        ? "This document has no evaluations."
                        : "This document doesn't have any evaluations, but you can still read the content below."}
                    </p>
                  </div>
                  {isOwner && (
                    <Link
                      href={`/docs/${document.id}`}
                      className="ml-4 inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      Add Evaluations
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Failed job warnings (only visible to owner) */}
            {isOwner && failedJobs.length > 0 && (
              <div className="mx-6 mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
                <div className="flex items-start gap-2">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-red-800 font-medium mb-2">
                      {failedJobs.length === 1 
                        ? "Warning: Evaluation failed"
                        : `Warning: ${failedJobs.length} evaluations failed`
                      }
                    </p>
                    <div className="space-y-1">
                      {failedJobs.map((job) => (
                        <p key={job.id} className="text-sm text-red-700">
                          • Evaluation "{job.agentName}" failed
                        </p>
                      ))}
                    </div>
                    <Link
                      href={`/docs/${document.id}`}
                      className="mt-2 inline-flex items-center text-sm font-medium text-red-800 hover:text-red-900"
                    >
                      View details in dashboard →
                    </Link>
                  </div>
                </div>
              </div>
            )}
            {/* Document metadata section */}
            <DocumentMetadata document={document} />

            <article className="prose prose-lg prose-slate mx-auto rounded-lg px-4 py-8">
              <SlateEditor
                content={contentWithMetadataPrepend}
                onHighlightHover={() => {}}
                onHighlightClick={() => {}}
                highlights={[]}
                activeTag={null}
              />
            </article>
          </div>
        </div>
      </div>
    </div>
  );
}
