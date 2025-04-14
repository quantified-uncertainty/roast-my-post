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
  id?: string; // Optional ID field for backward compatibility
}

export interface DocumentReview {
  agentId: string;
  costInCents: number;
  createdAt: Date;
  runDetails?: string;
  summary?: string;
  comments: Comment[]; // Changed from Record<string, Comment> to array
}
