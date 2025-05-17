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
  importance?: number; // 0-100: 0=not important, 100=very important
  grade?: number; // 0-100: 0=very negative, 50=neutral, 100=very positive
  isValid: boolean;
  error?: string;
}

export interface DocumentReview {
  agentId: string;
  costInCents: number;
  createdAt: Date;
  runDetails?: string;
  thinking?: string;
  summary?: string;
  comments: Comment[];
  grade?: number; // 0-100: 0=unacceptable, 50=mediocre, 100=exceptional
}
