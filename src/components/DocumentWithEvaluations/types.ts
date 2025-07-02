import type { Comment, Document, Evaluation } from "@/types/documentSchema";

export interface DocumentWithReviewsProps {
  document: Document;
  isOwner?: boolean;
}

export interface EvaluationState {
  selectedAgentIds: Set<string>;
  hoveredCommentId: string | null;
  expandedCommentId: string | null;
}

export interface CommentsSidebarProps {
  comments: Comment[];
  activeTag: string | null;
  expandedTag: string | null;
  onCommentHover: (tag: string | null) => void;
  onCommentClick: (tag: string | null) => void;
  evaluation: Evaluation;
  commentColorMap: Record<number, { background: string; color: string }>;
}

export interface EvaluationSelectorProps {
  document: Document;
  activeEvaluationIndex: number | null;
}

export interface EvaluationViewProps {
  evaluationState: EvaluationState;
  onEvaluationStateChange: (newState: EvaluationState) => void;
  document: Document;
  contentWithMetadataPrepend: string;
}

export interface EvaluationSelectorModalProps {
  document: Document;
  activeEvaluationIndex: number | null;
  onClose: () => void;
}
