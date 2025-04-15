"use client";

import React, { useState } from "react";

import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

import SlateEditor from "../../components/SlateEditor";

// A simple component to directly test if the markdown is rendering correctly
const SimpleMarkdownComponent = ({ content }: { content: string }) => {
  return (
    <ReactMarkdown rehypePlugins={[rehypeRaw]} remarkPlugins={[remarkGfm]}>
      {content}
    </ReactMarkdown>
  );
};

export default function TestBasicPage() {
  // Add essential CSS for slate editor formatting
  React.useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      [data-testid="slate-editable"] strong { 
        font-weight: bold !important; 
      }
      [data-testid="slate-editable"] em { 
        font-style: italic !important; 
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const content = `# Simple Test

This is a basic test for the highlighting functionality.

This is a link: [Simple Test](https://www.google.com)

This is bold: **Bolded text** and _Italicized text_. 

This is also italic: *Italicized with asterisks* and __Double-underscore bold__.

This is mixed formatting: **Bold with _nested italic_** and *Italic with **nested bold***.

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
      <h1 className="mb-4 text-2xl font-bold">Basic Highlight Test</h1>

      <div className="mb-10">
        <h2 className="mb-4 text-xl font-bold">SlateEditor Component</h2>
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

      <div className="mb-10">
        <h2 className="mb-4 text-xl font-bold">
          ReactMarkdown Component (Reference)
        </h2>
        <article className="prose prose-slate prose-lg max-w-none">
          <SimpleMarkdownComponent content={content} />
        </article>
      </div>
    </div>
  );
}
