import type { Document } from "@/shared/types/databaseTypes";

export interface DocumentWithReviewsProps {
  document: Document;
  isOwner?: boolean;
  initialSelectedEvalIds?: string[];
  showDebugComments?: boolean;
}

export interface EvaluationState {
  selectedAgentIds: Set<string>;
  hoveredCommentId: string | null;
  expandedCommentId: string | null;
  modalComment: {
    comment: any;
    agentName: string;
    commentId?: string;
  } | null;
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
