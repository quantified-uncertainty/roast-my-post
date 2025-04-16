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
  isValid: boolean;
  error?: string;
}

export interface DocumentReview {
  agentId: string;
  costInCents: number;
  createdAt: Date;
  runDetails?: string;
  summary?: string;
  comments: Comment[];
}
