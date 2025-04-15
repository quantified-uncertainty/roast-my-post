"use client";

import React from 'react';

import SlateEditor from '../../components/SlateEditor';

export default function TestSlateEditorPage() {
  const content = `## Strongly Bounded AI: Definitions and Strategic Implications

**Ozzie Gooen \\- April 14 2025, Draft. Quick post for the EA Forum / LessWrong.**

**Also, be sure to see this post. I just found [this](https://www.lesswrong.com/posts/Z5YGZwdABLChoAiHs/bounded-ai-might-be-viable), need to update this post.**`;

  const highlights = [
    {
      startOffset: 64,
      endOffset: 308,
      tag: "0",
      color: "amber-100",
      quotedText:
        "**Ozzie Gooen \\- April 14 2025, Draft. Quick post for the EA Forum / LessWrong.**\n\n**Also, be sure to see this post. I just found [this](https://www.lesswrong.com/posts/Z5YGZwdABLChoAiHs/bounded-ai-might-be-viable), need to update this post.**",
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
