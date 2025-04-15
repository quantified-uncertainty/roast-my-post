"use client";

import React from 'react';

import SlateEditor from '../../components/SlateEditor';

export default function TestSlateEditorPage() {
  const content = `# Strongly Bounded AI

Test 123

## Header 2

**This** is a test document about AI safety. We need to be careful about AI development.`;

  //Remember that offsets are in plain text, not markdown
  const highlights = [
    {
      startOffset: 2, // Start after "# "
      endOffset: 19, // End at the end of "Strongly Bounded AI"
      tag: "title",
      color: "amber-100",
      quotedText: "Strongly Bounded AI",
    },
    {
      startOffset: 21, // Start after the newlines
      endOffset: 85, // End at the end of the paragraph
      tag: "content",
      color: "blue-100",
      quotedText:
        "This is a test document about AI safety. We need to be careful about AI development.",
    },
  ];

  const [activeTag, setActiveTag] = React.useState<string | null>(null);

  return (
    <div className="container mx-auto p-4 ">
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
