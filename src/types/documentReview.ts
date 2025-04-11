import type {
  ForwardRefExoticComponent,
  SVGProps,
} from 'react';

type IconType = ForwardRefExoticComponent<
  Omit<SVGProps<SVGSVGElement>, "ref"> & {
    title?: string;
    titleId?: string;
  }
>;

export interface Highlight {
  startOffset: number;
  endOffset: number;
  prefix?: string; // E.g., 30 characters before
}

export interface Comment {
  title: string;
  description: string;
  icon: IconType;
  highlight: Highlight;
}

export interface DocumentReview {
  comments: Record<string, Comment>;
  agentId: string; // Reference to the evaluationAgent that created this review
}
