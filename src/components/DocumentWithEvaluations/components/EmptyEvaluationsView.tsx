"use client";

import { useRef } from "react";
import Link from "next/link";
import SlateEditor from "@/components/SlateEditor";
import { InformationCircleIcon } from "@heroicons/react/20/solid";
import type { Document } from "@/types/documentSchema";
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
      {/* Message banner at the top */}
      <div className="mx-5 mt-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-center gap-2">
          <InformationCircleIcon className="h-5 w-5 text-blue-600" />
          <p className="text-sm text-blue-800">
            {isOwner ? (
              <>
                This document has no evaluations.{" "}
                <Link
                  href={`/docs/${document.id}`}
                  className="font-medium text-blue-900 hover:underline"
                >
                  Add some here
                </Link>
                .
              </>
            ) : (
              "This document doesn't have any evaluations, but you can still read the content below."
            )}
          </p>
        </div>
      </div>

      {/* Main content container */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden pt-2">
        {/* Document content section */}
        <div className="flex min-h-screen justify-center py-5">
          {/* Main content area */}
          <div ref={contentRef} className="relative max-w-3xl flex-1 p-0">
            {/* Document metadata section */}
            <DocumentMetadata document={document} />

            <article className="prose prose-lg prose-slate mx-auto rounded-lg p-8">
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