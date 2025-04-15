"use client";

import React, { useState } from "react";

import SlateEditor from "../../components/SlateEditor";

export default function TestDocsPage() {
  const content = `## Strongly Bounded AI: Definitions and Strategic Implications

**Ozzie Gooen \\- April 14 2025, Draft. Quick post for the EA Forum / LessWrong.**

**Also, be sure to see this post. I just found [this](https://www.lesswrong.com/posts/Z5YGZwdABLChoAiHs/bounded-ai-might-be-viable), need to update this post.**
`;

  // These are the exact quote and prefix from the strongly-bounded-agents.json file
  const highlights = [
    {
      startOffset: 60,
      endOffset: 100,
      tag: "format-test",
      color: "amber-100",
      quotedText:
        "**Ozzie Gooen \\- April 14 2025, Draft. Quick post for the EA Forum / LessWrong.**",
    },
    {
      startOffset: 64,
      endOffset: 100,
      tag: "offset-64",
      color: "blue-100",
      quotedText:
        "**Ozzie Gooen \\- April 14 2025, Draft. Quick post for the EA Forum / LessWrong.**",
    },
    {
      startOffset: 80,
      endOffset: 100,
      tag: "offset-80",
      color: "green-100",
      quotedText:
        "**Ozzie Gooen \\- April 14 2025, Draft. Quick post for the EA Forum / LessWrong.**",
    },
  ];

  const [activeTag, setActiveTag] = useState<string | null>(null);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">
        Test Document with Formatting Highlights
      </h1>
      <article className="prose prose-slate prose-lg max-w-none">
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
