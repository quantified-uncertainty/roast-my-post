"use client";

import React, { useState } from "react";
import { logger } from "@/lib/logger";

import SlateEditor from "./SlateEditor";

interface TestDocsClientProps {
  content: string;
  highlights: {
    startOffset: number;
    endOffset: number;
    tag: string;
    color: string;
    quotedText: string;
  }[];
}

export default function TestDocsClient({
  content,
  highlights,
}: TestDocsClientProps) {
  const [activeTag, setActiveTag] = useState<string | null>(null);

  return (
    <div className="container mx-auto p-4">
      <h1 className="mb-4 text-2xl font-bold">
        Test Document with Formatting Highlights
      </h1>
      <article className="prose prose-lg prose-slate max-w-none">
        <SlateEditor
          content={content}
          highlights={highlights}
          onHighlightClick={(tag) => setActiveTag(tag)}
          onHighlightHover={(tag) => console.log("Hover:", tag)}
          activeTag={activeTag}
        />
      </article>
    </div>
  );
}
