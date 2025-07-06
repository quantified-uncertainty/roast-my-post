"use client";

import { useRef } from "react";
import Link from "next/link";
import SlateEditor from "@/components/SlateEditor";
import { ArrowTopRightOnSquareIcon, InformationCircleIcon } from "@heroicons/react/20/solid";
import type { Document } from "@/types/documentSchema";

interface EmptyEvaluationsViewProps {
  document: Document;
  contentWithMetadataPrepend: string;
}

export function EmptyEvaluationsView({
  document,
  contentWithMetadataPrepend,
}: EmptyEvaluationsViewProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex h-full flex-col overflow-x-hidden">
      {/* Message banner at the top */}
      <div className="mx-5 mt-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-center gap-2">
          <InformationCircleIcon className="h-5 w-5 text-blue-600" />
          <p className="text-sm text-blue-800">
            This document hasn't been evaluated yet. You can still read the content below.
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
            <div className="flex items-center justify-between px-6">
              <div className="flex items-center gap-4 text-sm text-gray-600">
                {document.submittedBy && (
                  <span>
                    Uploaded from{" "}
                    <Link
                      href={`/users/${document.submittedBy.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {document.submittedBy.name ||
                        document.submittedBy.email ||
                        "Unknown"}
                    </Link>{" "}
                    on {new Date(document.updatedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/docs/${document.id}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-300"
                >
                  Document Details
                </Link>
                {(document.importUrl || document.url) && (
                  <Link
                    href={document.importUrl || document.url}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-300"
                  >
                    <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                    Source
                  </Link>
                )}
              </div>
            </div>

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