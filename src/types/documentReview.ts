export interface Highlight {
  startOffset: number;
  endOffset: number;
  prefix?: string; // E.g., 30 characters before
}

export interface Comment {
  title: string;
  description: string;
  highlight: Highlight;
}

export interface DocumentReview {
  comments: Record<string, Comment>;
  agentId: string; // Reference to the evaluationAgent that created this review
  analysis?: string;
  costInCents: number;
  createdAt: Date;
}
