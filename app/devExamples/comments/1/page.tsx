'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import SlateEditor from '@/components/SlateEditor';
import { mockComments, MockComment, mockMarkdownContent } from '../../../../lib/devExamples/commentsTestData';

// Convert mock comments to SlateEditor highlight format
function commentsToHighlights(comments: MockComment[]) {
  return comments.map((comment, index) => ({
    startOffset: comment.highlightStart,
    endOffset: comment.highlightEnd,
    quotedText: mockMarkdownContent.substring(comment.highlightStart, comment.highlightEnd),
    color: getCommentColor(index),
    tag: comment.id,
  }));
}

// Get consistent colors for comments
function getCommentColor(index: number): string {
  const colors = [
    'FFD700', // Gold
    'FFA500', // Orange
    '87CEEB', // Sky Blue
    'DDA0DD', // Plum
    '98FB98', // Pale Green
    'F0E68C', // Khaki
    'FFB6C1', // Light Pink
    'B0C4DE', // Light Steel Blue
  ];
  return colors[index % colors.length];
}

export default function CommentsExamplePage() {
  const [selectedComment, setSelectedComment] = useState<string | null>(null);
  const [hoveredComment, setHoveredComment] = useState<string | null>(null);
  const [commentPositions, setCommentPositions] = useState<Record<string, number>>({});
  const [adjustedComments, setAdjustedComments] = useState<Set<string>>(new Set());
  const contentRef = useRef<HTMLDivElement>(null);
  const [highlightsReady, setHighlightsReady] = useState(false);
  const [positionsCalculated, setPositionsCalculated] = useState(false);
  
  const highlights = commentsToHighlights(mockComments);
  
  // Calculate comment positions
  const calculatePositions = useCallback(() => {
    if (!contentRef.current) return;
    
    const container = contentRef.current;
    const containerRect = container.getBoundingClientRect();
    const newPositions: Record<string, number> = {};
    
    mockComments.forEach((comment) => {
      const highlightElements = container.querySelectorAll(`[data-tag="${comment.id}"]`);
      
      if (highlightElements.length > 0) {
        const highlightElement = highlightElements[0];
        const rect = highlightElement.getBoundingClientRect();
        // Position relative to content container, accounting for scroll
        const relativeTop = rect.top - containerRect.top + container.scrollTop;
        newPositions[comment.id] = relativeTop;
      } else {
        // Fallback position
        const index = mockComments.findIndex(c => c.id === comment.id);
        newPositions[comment.id] = 100 + (index * 150);
      }
    });
    
    // Sort comments by their position
    const sortedComments = Object.entries(newPositions)
      .sort(([, a], [, b]) => a - b)
      .map(([id, pos]) => ({ id, position: pos }));
    
    // Adjust positions to prevent overlaps
    const minGap = 10;
    const adjusted = new Set<string>();
    
    // Estimate heights based on text length and hover state
    const getCommentHeight = (commentId: string) => {
      const comment = mockComments.find(c => c.id === commentId);
      if (!comment) return 80;
      
      const baseHeight = 60;
      const charsPerLine = 45;
      const lineHeight = 20;
      
      const isExpanded = hoveredComment === commentId;
      const displayLength = (!isExpanded && comment.text.length > 200) ? 200 : comment.text.length;
      
      const lines = Math.ceil(displayLength / charsPerLine);
      return baseHeight + (lines * lineHeight) + (comment.text.length > 200 ? 25 : 0);
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
      const highlightElements = contentRef.current.querySelectorAll('[data-tag]');
      
      if (highlightElements.length >= mockComments.length) {
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
      calculatePositions();
    }
  }, [hoveredComment]);
  
  const handleHighlightClick = useCallback((tag: string) => {
    setSelectedComment(tag);
  }, []);
  
  const handleHighlightHover = useCallback((tag: string | null) => {
    // Optional: sync highlight hover with comment hover
  }, []);
  
  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      <div className="border-b bg-white px-8 py-4">
        <h1 className="text-2xl font-bold">AI Safety Comments Example</h1>
        <p className="text-gray-600 text-sm mt-1">
          A comprehensive document about AI with expert commentary
        </p>
      </div>
      
      <div className="flex-1 overflow-hidden p-8">
        <div className="flex gap-0 h-full bg-white rounded-lg shadow-sm overflow-y-auto">
          {/* Scrollable container for both content and comments */}
          <div className="flex min-h-full">
            {/* Main content area */}
            <div 
              ref={contentRef}
              className="flex-1 p-8"
              style={{ position: 'relative' }}
            >
              <SlateEditor
                content={mockMarkdownContent}
                highlights={highlights}
                onHighlightClick={handleHighlightClick}
                onHighlightHover={handleHighlightHover}
                activeTag={selectedComment}
              />
            </div>
            
            {/* Comments column */}
            <div className="border-l border-gray-200 bg-gray-50" style={{ width: '320px', flexShrink: 0 }}>
              <div className="relative" style={{ minHeight: '100%' }}>
                {/* Comment indicators */}
                {mockComments.map((comment) => {
                const position = commentPositions[comment.id] || 0;
                const isActive = selectedComment === comment.id;
                const isHovered = hoveredComment === comment.id;
                const needsTruncation = comment.text.length > 200;
                
                return (
                  <div key={comment.id}>
                    <div
                      style={{
                        position: 'absolute',
                        top: `${position}px`,
                        left: '20px',
                        right: '20px',
                        padding: '8px 0',
                        transition: 'all 0.2s ease-out',
                        cursor: 'pointer',
                        zIndex: isHovered ? 20 : 10,
                        opacity: positionsCalculated ? 1 : 0,
                        visibility: positionsCalculated ? 'visible' : 'hidden',
                      }}
                      onClick={() => setSelectedComment(comment.id)}
                      onMouseEnter={() => setHoveredComment(comment.id)}
                      onMouseLeave={() => setHoveredComment(null)}
                    >
                      <div style={{ 
                        fontSize: '13px', 
                        color: '#666', 
                        marginBottom: '6px',
                        fontWeight: 600,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        {comment.author}
                        <span style={{ 
                          fontSize: '11px', 
                          color: '#999',
                          fontWeight: 'normal'
                        }}>
                          {new Date(comment.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <div style={{ 
                        fontSize: '14px', 
                        color: '#333',
                        lineHeight: '1.5'
                      }}>
                        {(() => {
                          if (!needsTruncation || isHovered) {
                            return comment.text;
                          }
                          
                          return (
                            <>
                              {comment.text.substring(0, 200)}
                              <span style={{ color: '#999' }}>...</span>
                            </>
                          );
                        })()}
                      </div>
                      {comment.replies && comment.replies.length > 0 && (
                        <div style={{
                          fontSize: '12px',
                          color: '#666',
                          marginTop: '8px',
                          paddingTop: '8px',
                          borderTop: '1px solid #E8E8E8'
                        }}>
                          {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                        </div>
                      )}
                      {needsTruncation && !isHovered && (
                        <div style={{
                          fontSize: '12px',
                          color: '#999',
                          marginTop: '6px',
                          fontStyle: 'italic'
                        }}>
                          ↑ Hover to expand
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}