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
  
  // Export data (optional - for export functionality)
  evaluationData?: {
    evaluation: {
      id: string;
      evaluationId?: string;
      documentId: string;
      documentTitle: string;
      agentId: string;
      agentName: string;
      agentVersion?: string;
      evaluationVersion?: number | null;
      grade?: number | null;
      jobStatus?: string;
      createdAt: string | Date;
      summary?: string | null;
      analysis?: string | null;
      selfCritique?: string | null;
      comments?: Array<{
        id: string;
        description: string;
        importance?: number | null;
        grade?: number | null;
      }>;
      job?: {
        llmThinking?: string | null;
        costInCents?: number | null;
        tasks?: Array<{
          id: string;
          name: string;
          modelName: string;
          priceInDollars: number;
          timeInSeconds?: number | null;
          log?: string | null;
          createdAt: Date | string;
          llmInteractions?: {
            messages: Array<{
              role: string;
              content: string;
            }>;
            usage?: {
              input_tokens: number;
              output_tokens: number;
            };
          };
        }>;
      } | null;
      testBatchId?: string | null;
      testBatchName?: string | null;
    };
  };
  
  // Navigation options
  isOnEvalPage?: boolean;
  
  // Security
  isOwner?: boolean;
}