import type { Document } from "@/shared/types/databaseTypes";
import type { Comment } from "@roast/ai";

export interface DocumentWithReviewsProps {
  document: Document;
  isOwner?: boolean;
  initialSelectedEvalIds?: string[];
  showDebugComments?: boolean;
}

export interface ModalCommentState {
  comment: Comment;
  agentName: string;
  commentId?: string;
  renderedDescription?: React.ReactElement | null;
}

export interface EvaluationState {
  selectedAgentIds: Set<string>;
  hoveredCommentId: string | null;
  expandedCommentId: string | null;
  modalComment: ModalCommentState | null;
}

export interface EvaluationSelectorProps {
  document: Document;
  activeEvaluationIndex: number | null;
}

export interface EvaluationViewProps {
  evaluationState: EvaluationState;
  onEvaluationStateChange?: (newState: EvaluationState) => void;
  document: Document;
  contentWithMetadataPrepend: string;
  showDebugComments?: boolean;
  isOwner?: boolean;
  onRerun?: (agentId: string) => void;
  runningEvals?: Set<string>;
}

export interface EvaluationSelectorModalProps {
  document: Document;
  activeEvaluationIndex: number | null;
  onClose: () => void;
}
