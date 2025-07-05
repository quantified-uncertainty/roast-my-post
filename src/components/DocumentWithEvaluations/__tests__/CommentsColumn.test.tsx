import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { CommentsColumn } from '../components/CommentsColumn';
import type { Comment } from '@/types/documentSchema';

// Mock the SlateEditor to control when highlights are rendered
jest.mock('@/components/SlateEditor', () => ({
  __esModule: true,
  default: ({ highlights }: any) => {
    // Simulate the real SlateEditor behavior where multiple comments can share highlights
    const uniqueTags = new Set(highlights.map((h: any) => h.tag));
    return (
      <div data-testid="slate-editor">
        {Array.from(uniqueTags).map((tag) => (
          <span key={tag} data-tag={tag}>
            Highlight {tag}
          </span>
        ))}
      </div>
    );
  },
}));

describe('CommentsColumn', () => {
  const mockOnCommentHover = jest.fn();
  const mockOnCommentClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle multiple comments sharing the same highlight position', async () => {
    const contentRef = React.createRef<HTMLDivElement>();
    
    // Create comments where multiple comments reference the same text
    const comments: (Comment & { agentName?: string })[] = [
      {
        highlight: { startOffset: 0, endOffset: 10 },
        description: 'Agent 1 comment on first highlight',
        agentName: 'Agent 1',
      },
      {
        highlight: { startOffset: 0, endOffset: 10 },
        description: 'Agent 2 comment on same highlight',
        agentName: 'Agent 2',
      },
      {
        highlight: { startOffset: 20, endOffset: 30 },
        description: 'Agent 1 comment on second highlight',
        agentName: 'Agent 1',
      },
    ] as any[];

    const { container } = render(
      <div ref={contentRef} style={{ height: '500px', position: 'relative' }}>
        <div data-tag="0">First highlight</div>
        <div data-tag="0">Same highlight duplicate</div>
        <div data-tag="1">Second highlight</div>
        <CommentsColumn
          comments={comments}
          contentRef={contentRef}
          selectedCommentId={null}
          hoveredCommentId={null}
          onCommentHover={mockOnCommentHover}
          onCommentClick={mockOnCommentClick}
        />
      </div>
    );

    // Should not show loading spinner after highlights are detected
    await waitFor(() => {
      expect(screen.queryByText('Loading comments...')).not.toBeInTheDocument();
    }, { timeout: 2000 });

    // Should render all comments
    expect(screen.getByText('Agent 1 comment on first highlight')).toBeInTheDocument();
    expect(screen.getByText('Agent 2 comment on same highlight')).toBeInTheDocument();
    expect(screen.getByText('Agent 1 comment on second highlight')).toBeInTheDocument();
  });

  it('should show loading state when highlights are not ready', () => {
    const contentRef = React.createRef<HTMLDivElement>();
    
    const comments: (Comment & { agentName?: string })[] = [
      {
        highlight: { startOffset: 0, endOffset: 10 },
        description: 'Comment 1',
        agentName: 'Agent 1',
      },
    ] as any[];

    render(
      <div ref={contentRef}>
        {/* No highlights rendered yet */}
        <CommentsColumn
          comments={comments}
          contentRef={contentRef}
          selectedCommentId={null}
          hoveredCommentId={null}
          onCommentHover={mockOnCommentHover}
          onCommentClick={mockOnCommentClick}
        />
      </div>
    );

    // Should show loading spinner when highlights aren't ready
    expect(screen.getByText('Loading comments...')).toBeInTheDocument();
  });

  it('should handle the bug scenario: 11 comments with 6 unique highlight positions', async () => {
    const contentRef = React.createRef<HTMLDivElement>();
    
    // Simulate the exact scenario from the bug report
    const comments: (Comment & { agentName?: string })[] = [
      // 5 comments from EA Epistemic Auditor
      { highlight: { startOffset: 0, endOffset: 10 }, description: 'EA Comment 1', agentName: 'EA Epistemic Auditor' },
      { highlight: { startOffset: 0, endOffset: 10 }, description: 'EA Comment 2', agentName: 'EA Epistemic Auditor' },
      { highlight: { startOffset: 0, endOffset: 10 }, description: 'EA Comment 3', agentName: 'EA Epistemic Auditor' },
      { highlight: { startOffset: 20, endOffset: 30 }, description: 'EA Comment 4', agentName: 'EA Epistemic Auditor' },
      { highlight: { startOffset: 300, endOffset: 310 }, description: 'EA Comment 5', agentName: 'EA Epistemic Auditor' },
      
      // 6 comments from Simple Link Validator  
      { highlight: { startOffset: 310, endOffset: 320 }, description: 'Link Comment 1', agentName: 'Simple Link Validator' },
      { highlight: { startOffset: 310, endOffset: 320 }, description: 'Link Comment 2', agentName: 'Simple Link Validator' },
      { highlight: { startOffset: 400, endOffset: 410 }, description: 'Link Comment 3', agentName: 'Simple Link Validator' },
      { highlight: { startOffset: 450, endOffset: 460 }, description: 'Link Comment 4', agentName: 'Simple Link Validator' },
      { highlight: { startOffset: 450, endOffset: 460 }, description: 'Link Comment 5', agentName: 'Simple Link Validator' },
      { highlight: { startOffset: 500, endOffset: 510 }, description: 'Link Comment 6', agentName: 'Simple Link Validator' },
    ] as any[];

    const { container } = render(
      <div ref={contentRef} style={{ height: '1000px', position: 'relative' }}>
        {/* Simulate 9 highlight elements with 6 unique tags */}
        <div data-tag="0">Tag 0 - 1st</div>
        <div data-tag="0">Tag 0 - 2nd</div>
        <div data-tag="0">Tag 0 - 3rd</div>
        <div data-tag="1">Tag 1</div>
        <div data-tag="7">Tag 7</div>
        <div data-tag="8">Tag 8 - 1st</div>
        <div data-tag="8">Tag 8 - 2nd</div>
        <div data-tag="9">Tag 9</div>
        <div data-tag="10">Tag 10</div>
        <CommentsColumn
          comments={comments}
          contentRef={contentRef}
          selectedCommentId={null}
          hoveredCommentId={null}
          onCommentHover={mockOnCommentHover}
          onCommentClick={mockOnCommentClick}
        />
      </div>
    );

    // Should not get stuck in loading state
    await waitFor(() => {
      expect(screen.queryByText('Loading comments...')).not.toBeInTheDocument();
    }, { timeout: 2000 });

    // Should render comments from both agents
    expect(screen.getByText('EA Comment 1')).toBeInTheDocument();
    expect(screen.getByText('Link Comment 1')).toBeInTheDocument();
  });

  it('should handle empty comments array', async () => {
    const contentRef = React.createRef<HTMLDivElement>();
    
    render(
      <div ref={contentRef}>
        <CommentsColumn
          comments={[]}
          contentRef={contentRef}
          selectedCommentId={null}
          hoveredCommentId={null}
          onCommentHover={mockOnCommentHover}
          onCommentClick={mockOnCommentClick}
        />
      </div>
    );

    // Should not show loading state for empty comments
    expect(screen.queryByText('Loading comments...')).not.toBeInTheDocument();
  });
});