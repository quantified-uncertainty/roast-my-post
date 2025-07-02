import type { Comment, Document, Evaluation } from "@/types/documentSchema";

export interface DocumentWithReviewsProps {
  document: Document;
  isOwner?: boolean;
}

export interface EvaluationState {
  selectedReviewIndex: number;
  selectedAgentIds: Set<string>;
  hoveredCommentId: string | null;
  expandedCommentId: string | null;
  isMultiAgentMode: boolean;
}

export interface UIState {
  showEvaluationSelector: boolean;
  deleteError: string | null;
  evaluationCreationError: string | null;
  successMessage: string | null;
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
  onEvaluationSelect: (index: number) => void;
}

export interface EvaluationViewProps {
  evaluation: Evaluation;
  evaluationState: EvaluationState;
  onEvaluationStateChange: (newState: EvaluationState) => void;
  onShowEvaluationSelector: () => void;
  commentColorMap: Record<number, { background: string; color: string }>;
  onRerunEvaluation: (agentId: string) => Promise<void>;
  document: Document;
  onEvaluationSelect: (index: number) => void;
  contentWithMetadata: string;
}

export interface EvaluationSelectorModalProps {
  document: Document;
  activeEvaluationIndex: number | null;
  onEvaluationSelect: (index: number) => void;
  onClose: () => void;
}