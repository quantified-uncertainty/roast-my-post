"use client";

import React from 'react';

import SlateEditor from '../../components/SlateEditor';

export default function TestSlateEditorPage() {
  const content = `This is a test.`;

  const highlights = [
    {
      startOffset: 0,
      endOffset: 14,
      tag: "0",
      color: "amber-100",
      quotedText: "This is a test.",
    },
  ];

  const [activeTag, setActiveTag] = React.useState<string | null>(null);

  return (
    <div className="container mx-auto p-4">
      <SlateEditor
        content={content}
        highlights={highlights}
        onHighlightClick={(tag) => setActiveTag(tag)}
        onHighlightHover={(tag) => console.log("Hover:", tag)}
        activeTag={activeTag}
      />
    </div>
  );
}
