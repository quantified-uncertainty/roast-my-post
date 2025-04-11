"use client";

import { HighlightedMarkdown } from "@/components/HighlightedMarkdown";

export function DocumentReview({ title, content }) {
  return (
    <article className="prose prose-slate dark:prose-invert prose-lg max-w-none">
      <h1>{title}</h1>
      <HighlightedMarkdown content={content} />
    </article>
  );
}