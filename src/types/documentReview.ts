import type { ForwardRefExoticComponent, SVGProps } from "react";

type IconType = ForwardRefExoticComponent<
  Omit<SVGProps<SVGSVGElement>, "ref"> & {
    title?: string;
    titleId?: string;
  }
>;

export interface Comment {
  title: string;
  description: string;
  icon: IconType;
  color: {
    base: string;
  };
}

export interface DocumentReview {
  markdown: string;
  comments: Record<string, Comment>;
  agentId: string; // Reference to the evaluationAgent that created this review
}
