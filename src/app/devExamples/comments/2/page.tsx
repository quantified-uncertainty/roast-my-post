"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import SlateEditor from "@/components/SlateEditor";

import {
  SimpleComment,
  simpleComments,
  simpleMarkdownContent,
} from "../../../../tests/fixtures/simpleCommentsTestData";

// Convert comments to SlateEditor highlight format
function commentsToHighlights(comments: SimpleComment[]) {
  return comments.map((comment) => ({
    startOffset: comment.highlightStart,
    endOffset: comment.highlightEnd,
    quotedText: simpleMarkdownContent.substring(
      comment.highlightStart,
      comment.highlightEnd
    ),
    color: comment.id === "comment-1" ? "FFD700" : "FFA500", // Gold and Orange
    tag: comment.id,
  }));
}

export default function SimpleCommentsPage() {
  const [selectedComment, setSelectedComment] = useState<string | null>(null);
  const [hoveredComment, setHoveredComment] = useState<string | null>(null);
  const [commentPositions, setCommentPositions] = useState<
    Record<string, number>
  >({});
  const [adjustedComments, setAdjustedComments] = useState<Set<string>>(
    new Set()
  );
  const contentRef = useRef<HTMLDivElement>(null);
  const [highlightsReady, setHighlightsReady] = useState(false);
  const [positionsCalculated, setPositionsCalculated] = useState(false);

  const highlights = commentsToHighlights(simpleComments);

  // Calculate comment positions
  const calculatePositions = useCallback(() => {
    if (!contentRef.current) return;

    const container = contentRef.current;
    const containerRect = container.getBoundingClientRect();
    const newPositions: Record<string, number> = {};

    // First, let's see what highlights exist
    const allHighlights = container.querySelectorAll("[data-tag]");

    simpleComments.forEach((comment) => {
      // Look for highlight elements with the comment's tag
      const highlightElements = container.querySelectorAll(
        `[data-tag="${comment.id}"]`
      );

      if (highlightElements.length > 0) {
        // Use the first highlight element
        const highlightElement = highlightElements[0];
        const rect = highlightElement.getBoundingClientRect();
        const relativeTop = rect.top - containerRect.top + container.scrollTop;

        newPositions[comment.id] = relativeTop;
      } else {
        // Fallback position
        newPositions[comment.id] =
          comment.id === "comment-1"
            ? 100
            : comment.id === "comment-2"
              ? 300
              : 500;
      }
    });

    // Sort comments by their position
    const sortedComments = Object.entries(newPositions)
      .sort(([, a], [, b]) => a - b)
      .map(([id, pos]) => ({ id, position: pos }));

    // Adjust positions to prevent overlaps
    const minGap = 10; // Minimum gap between comments
    const adjusted = new Set<string>();

    // Estimate heights based on text length and expansion state
    const getCommentHeight = (commentId: string) => {
      const comment = simpleComments.find((c) => c.id === commentId);
      if (!comment) return 80;

      const baseHeight = 60; // Base height for author + padding
      const charsPerLine = 40; // Approximate characters per line
      const lineHeight = 20; // Height per line of text

      // Check if comment is hovered or short enough to show fully
      const isExpanded = hoveredComment === commentId;
      const displayLength =
        !isExpanded && comment.text.length > 200 ? 200 : comment.text.length;

      const lines = Math.ceil(displayLength / charsPerLine);
      return (
        baseHeight + lines * lineHeight + (comment.text.length > 200 ? 25 : 0)
      ); // Extra space for hover hint
    };

    for (let i = 1; i < sortedComments.length; i++) {
      const prevComment = sortedComments[i - 1];
      const currentComment = sortedComments[i];
      const prevHeight = getCommentHeight(prevComment.id);
      const minPosition = prevComment.position + prevHeight + minGap;

      if (currentComment.position < minPosition) {
        currentComment.position = minPosition;
        newPositions[currentComment.id] = minPosition;
        adjusted.add(currentComment.id);
      }
    }

    setCommentPositions(newPositions);
    setAdjustedComments(adjusted);
    setPositionsCalculated(true);
  }, [hoveredComment]);

  // Wait for highlights to render
  useEffect(() => {
    if (!contentRef.current) return;

    let attempts = 0;
    const maxAttempts = 10;

    const checkHighlights = () => {
      if (!contentRef.current) return;

      attempts++;
      const highlightElements =
        contentRef.current.querySelectorAll("[data-tag]");

      if (highlightElements.length >= simpleComments.length) {
        setHighlightsReady(true);
      } else if (attempts < maxAttempts) {
        setTimeout(checkHighlights, 100);
      }
    };

    setTimeout(checkHighlights, 200);
  }, []);

  // Calculate positions when highlights are ready
  useEffect(() => {
    if (highlightsReady) {
      setTimeout(calculatePositions, 100);
    }
  }, [highlightsReady, calculatePositions]);

  // Recalculate immediately when hover changes
  useEffect(() => {
    if (highlightsReady && positionsCalculated) {
      calculatePositions(); // No delay for hover changes
    }
  }, [hoveredComment]);

  const handleHighlightClick = useCallback((tag: string) => {
    setSelectedComment(tag);
  }, []);

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <div className="border-b bg-white px-8 py-4">
        <h1 className="text-2xl font-bold">Simple Comments Example</h1>
        <p className="mt-1 text-sm text-gray-600">
          Testing with just 2 comments for easier debugging
        </p>
      </div>

      <div className="flex-1 overflow-hidden p-8">
        <div className="flex h-full gap-0 overflow-y-auto rounded-lg bg-white shadow-sm">
          {/* Scrollable container for both content and comments */}
          <div className="flex min-h-full">
            {/* Main content area */}
            <div
              ref={contentRef}
              className="flex-1 p-8"
              style={{ position: "relative" }}
            >
              <SlateEditor
                content={simpleMarkdownContent}
                highlights={highlights}
                onHighlightClick={handleHighlightClick}
                activeTag={selectedComment}
              />
            </div>

            {/* Comments column */}
            <div
              className="border-l border-gray-200 bg-gray-50"
              style={{ width: "320px", flexShrink: 0 }}
            >
              <div className="relative" style={{ minHeight: "100%" }}>
                {/* Comment indicators */}
                {simpleComments.map((comment) => {
                  const position = commentPositions[comment.id] || 0;
                  const isActive = selectedComment === comment.id;
                  const isHovered = hoveredComment === comment.id;
                  const wasAdjusted = adjustedComments.has(comment.id);
                  const needsTruncation = comment.text.length > 200;

                  return (
                    <div key={comment.id}>
                      <div
                        style={{
                          position: "absolute",
                          top: `${position}px`,
                          left: "20px",
                          right: "20px",
                          padding: "8px 0",
                          transition: "all 0.2s ease-out",
                          cursor: "pointer",
                          zIndex: isHovered ? 20 : 10,
                          opacity: positionsCalculated ? 1 : 0,
                          visibility: positionsCalculated
                            ? "visible"
                            : "hidden",
                        }}
                        onClick={() => setSelectedComment(comment.id)}
                        onMouseEnter={() => setHoveredComment(comment.id)}
                        onMouseLeave={() => setHoveredComment(null)}
                      >
                        <div
                          style={{
                            fontSize: "13px",
                            color: "#666",
                            marginBottom: "6px",
                            fontWeight: 600,
                          }}
                        >
                          {comment.author}
                        </div>
                        <div
                          style={{
                            fontSize: "14px",
                            color: "#333",
                            lineHeight: "1.5",
                          }}
                        >
                          {(() => {
                            if (!needsTruncation || isHovered) {
                              return comment.text;
                            }

                            return (
                              <>
                                {comment.text.substring(0, 200)}
                                <span style={{ color: "#999" }}>...</span>
                              </>
                            );
                          })()}
                        </div>
                        {needsTruncation && (
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#999",
                              marginTop: "6px",
                              fontStyle: "italic",
                            }}
                          >
                            {isHovered
                              ? "↑ Full comment shown"
                              : "↑ Hover to expand"}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Debug panel */}
          <div className="w-80 rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">Debug Info</h2>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Highlights ready:</span>{" "}
                <span
                  className={
                    highlightsReady ? "text-green-600" : "text-yellow-600"
                  }
                >
                  {highlightsReady ? "Yes" : "No"}
                </span>
              </div>
              <div>
                <span className="font-medium">Positions calculated:</span>{" "}
                <span
                  className={
                    positionsCalculated ? "text-green-600" : "text-yellow-600"
                  }
                >
                  {positionsCalculated ? "Yes" : "No"}
                </span>
              </div>
              <div className="mt-4">
                <div className="mb-2 font-medium">Comment Positions:</div>
                {Object.entries(commentPositions).map(([id, pos]) => (
                  <div key={id} className="ml-2">
                    {id}: {pos}px
                  </div>
                ))}
              </div>
              <button
                onClick={calculatePositions}
                className="mt-4 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
              >
                Recalculate Positions
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
