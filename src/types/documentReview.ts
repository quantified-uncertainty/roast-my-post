export interface Highlight {
  startOffset: number;
  endOffset: number;
  prefix?: string; // E.g., 30 characters before
  quotedText: string;
}

export interface Comment {
  title: string;
  description: string;
  highlight: Highlight;
}

export interface DocumentReview {
  agentId: string;
  costInCents: number;
  createdAt: Date;
  runDetails?: string;
  summary?: string;
  comments: Record<string, Comment>;
}
