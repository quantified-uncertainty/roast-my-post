"use client";

import React, { useState } from "react";

import SlateEditor from "../../components/SlateEditor";

export default function TestBasicPage() {
  const content = `# Simple Test

This is a basic test for the highlighting functionality.

This is a link: [Simple Test](https://www.google.com)

This is bold: **Bolded text** and _Italicized text_. 

1. This is a list item.
2. This is another list item.
3. This is yet another list item.

## Second heading

Let's see if this works better.`;

  const highlights = [
    {
      startOffset: 2,
      endOffset: 8,
      tag: "basic-test",
      color: "red-100",
      quotedText: "Simple Test",
    },
    {
      startOffset: 40,
      endOffset: 63,
      tag: "basic-test",
      color: "amber-100",
      quotedText: "This is a basic test for the highlighting functionality.",
    },
    {
      startOffset: 80,
      endOffset: 140,
      tag: "basic-test",
      color: "green-100",
      quotedText: "This is a link: [Simple Test](https://www.google.com)",
    },
    {
      startOffset: 160,
      endOffset: 245,
      tag: "basic-test",
      color: "violet-100",
      quotedText: "This is bold: **Bolded text** and _Italicized text_. ",
    },
  ];

  const [activeTag, setActiveTag] = useState<string | null>(null);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Basic Highlight Test</h1>
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
