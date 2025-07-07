"use client";

import { useRef } from "react";

import Link from "next/link";

import SlateEditor from "@/components/SlateEditor";
import type { Document } from "@/types/documentSchema";
import { InformationCircleIcon } from "@heroicons/react/20/solid";

import { DocumentMetadata } from "./DocumentMetadata";

interface EmptyEvaluationsViewProps {
  document: Document;
  contentWithMetadataPrepend: string;
  isOwner?: boolean;
}

export function EmptyEvaluationsView({
  document,
  contentWithMetadataPrepend,
  isOwner = false,
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
            <div className="mx-3 mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
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
