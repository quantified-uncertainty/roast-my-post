"use client";

import { RefObject } from "react";
import SlateEditor from "@/components/SlateEditor";
import { LAYOUT } from "../constants";
import { useLocalCommentsUI } from "../context/LocalCommentsUIContext";
import type { Document } from "@/shared/types/databaseTypes";

interface DocumentContentProps {
  document: Document;
  contentWithMetadataPrepend: string;
  highlights: Array<{
    startOffset: number;
    endOffset: number;
    quotedText: string;
    tag: string;
    color: string;
  }>;
  onHighlightClick?: (commentId: string) => void;
  isFullWidth: boolean;
  contentRef: RefObject<HTMLDivElement | null>;
}

export function DocumentContent({
  document,
  contentWithMetadataPrepend,
  highlights,
  onHighlightClick,
  isFullWidth,
  contentRef,
}: DocumentContentProps) {
  const { hoveredCommentId, setHoveredCommentId } = useLocalCommentsUI();
  return (
    <div
      ref={contentRef}
      className={`relative p-0 ${isFullWidth ? "pr-4" : "max-w-3xl flex-1"}`}
      style={
        isFullWidth
          ? {
              width: `calc(100% - ${LAYOUT.COMMENT_COLUMN_WIDTH}px)`,
              overflow: "hidden",
            }
          : {}
      }
    >
      {/* Submitter Notes - only show if notes exist */}
      {document.submitterNotes && (
        <div className={`mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 ${isFullWidth ? "" : "mx-auto"}`}>
          <h3 className="mb-2 text-sm font-semibold text-blue-900">
            Submitter's Notes
          </h3>
          <p className="whitespace-pre-wrap text-sm text-blue-800">
            {document.submitterNotes}
          </p>
        </div>
      )}
      <article
        className={`prose prose-lg prose-slate ${
          isFullWidth
            ? `max-w-none [&_pre]:!max-w-[calc(100vw-${LAYOUT.COMMENT_COLUMN_WIDTH}px-${LAYOUT.CONTENT_SIDE_PADDING}px)] [&_pre]:overflow-x-auto`
            : "mx-auto"
        } rounded-lg`}
      >
        <SlateEditor
          content={contentWithMetadataPrepend}
          onHighlightHover={(id) => setHoveredCommentId(id)}
          onHighlightClick={onHighlightClick}
          highlights={highlights}
          activeTag={hoveredCommentId}
          hoveredTag={hoveredCommentId}
        />
      </article>
    </div>
  );
}
