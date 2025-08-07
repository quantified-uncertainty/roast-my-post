"use client";

import { RefObject } from "react";
import SlateEditor from "@/components/SlateEditor";
import { DocumentMetadata } from "./DocumentMetadata";
import { LAYOUT } from "../constants";
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
  hoveredCommentId: string | null;
  onHighlightHover: (commentId: string | null) => void;
  onHighlightClick: (commentId: string) => void;
  isFullWidth: boolean;
  onToggleFullWidth: () => void;
  contentRef: RefObject<HTMLDivElement | null>;
}

export function DocumentContent({
  document,
  contentWithMetadataPrepend,
  highlights,
  hoveredCommentId,
  onHighlightHover,
  onHighlightClick,
  isFullWidth,
  onToggleFullWidth,
  contentRef,
}: DocumentContentProps) {
  return (
    <div
      ref={contentRef}
      className={`relative p-0 ${isFullWidth ? "pr-4" : "max-w-3xl flex-1"}`}
      style={
        isFullWidth
          ? { width: `calc(100% - ${LAYOUT.COMMENT_COLUMN_WIDTH}px)`, overflow: "hidden" }
          : {}
      }
    >
      {/* Document metadata section */}
      <DocumentMetadata
        document={document}
        showDetailedAnalysisLink={true}
        isFullWidth={isFullWidth}
        onToggleFullWidth={onToggleFullWidth}
      />

      <article
        className={`prose prose-lg prose-slate ${
          isFullWidth
            ? `max-w-none [&_pre]:!max-w-[calc(100vw-${LAYOUT.COMMENT_COLUMN_WIDTH}px-${LAYOUT.CONTENT_SIDE_PADDING}px)] [&_pre]:overflow-x-auto`
            : "mx-auto"
        } rounded-lg px-4 py-8`}
      >
        <SlateEditor
          content={contentWithMetadataPrepend}
          onHighlightHover={onHighlightHover}
          onHighlightClick={onHighlightClick}
          highlights={highlights}
          activeTag={hoveredCommentId}
          hoveredTag={hoveredCommentId}
        />
      </article>
    </div>
  );
}