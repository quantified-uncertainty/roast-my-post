/**
 * Standardized evaluation display data structure
 */
export interface EvaluationDisplayData {
  // Core evaluation data
  summary?: string;
  analysis: string;
  thinking?: string;
  selfCritique?: string;
  comments: Array<{
    id: string;
    description: string;
    importance: number | null;
    grade: number | null;
    evaluationVersionId: string;
    highlightId: string;
    highlight: {
      id: string;
      startOffset: number;
      endOffset: number;
      quotedText: string;
      prefix: string | null;
      error: string | null;
      isValid: boolean;
    };
  }>;
  
  // Agent information
  agentName: string;
  agentDescription?: string;
  grade?: number | null;
  ephemeralBatch?: {
    trackingId: string | null;
    isEphemeral: boolean;
  } | null;
  
  // Run stats
  costInCents?: number | null;
  durationInSeconds?: number | null;
  createdAt: Date | string;
  
  // State
  isStale: boolean;
  
  // Context
  documentTitle: string;
  documentId: string;
  agentId: string;
  evaluationId: string;
  version: number;
}

/**
 * Props for EvaluationContent component
 */
export interface EvaluationContentProps {
  // Core evaluation data
  summary?: string;
  analysis: string;
  thinking?: string;
  selfCritique?: string;
  comments?: Array<{
    id: string;
    description: string;
    importance: number | null;
    grade: number | null;
    evaluationVersionId: string;
    highlightId: string;
    highlight: {
      id: string;
      startOffset: number;
      endOffset: number;
      quotedText: string;
      prefix: string | null;
      error: string | null;
      isValid: boolean;
    };
  }>;
  
  // Agent information
  agentName: string;
  agentDescription?: string;
  grade?: number | null;
  ephemeralBatch?: {
    trackingId: string | null;
    isEphemeral: boolean;
  } | null;
  
  // Run stats
  costInCents?: number | null;
  durationInSeconds?: number | null;
  createdAt: Date | string;
  
  // State
  isStale?: boolean;
  
  // Display options
  showNavigation?: boolean;
  compact?: boolean;
  context?: 'document' | 'agent' | 'monitor';
  maxWidth?: 'none' | 'full' | '4xl' | '6xl';
}