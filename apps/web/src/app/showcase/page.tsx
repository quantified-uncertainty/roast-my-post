"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { MARKDOWN_COMPONENTS } from "@/components/DocumentWithEvaluations/config/markdown";

const complexTableExample = `
## Complex Table Example

This example demonstrates tables with nested \`<details>\` blocks, similar to GitHub PR suggestions:

<table>
<thead>
<tr>
<td><strong>Category</strong></td>
<td align="left"><strong>Suggestion&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; </strong></td>
<td align="center"><strong>Impact</strong></td>
</tr>
</thead>
<tbody>
<tr>
<td rowspan="1">High-level</td>
<td>

<details><summary>Preserve mdast positions robustly</summary>

___

**The new mdastToSlateWithOffsets assumes mdast.position.offset is present and accurate for all inline nodes, but remark-parse can omit offsets (e.g., with trim, unusual plugins, or transformed nodes), and inline code backtick trimming may desync mdStart/mdEnd from actual text. Add a defensive fallback to compute offsets from parent ranges/child concatenation and validate that mdStart/mdEnd length matches leaf.text, otherwise skip or recalculate; also consider preserving raw fences separately to avoid off-by-tick errors.**

### Examples:

<details>
<summary>
<a href="#">apps/web/src/components/SlateEditor.tsx [140-204]</a>
</summary>

\`\`\`typescript
const adjustInlineCodeOffsets = (
  start?: number,
  end?: number
): { mdStart?: number; mdEnd?: number } => {
  if (typeof start !== "number" || typeof end !== "number")
    return { mdStart: start, mdEnd: end };
  const raw = markdown.slice(start, end);
  // Count leading and trailing backticks of same length
  const leadingMatch = raw.match(/^\`+/);
  const trailingMatch = raw.match(/\`+$/);
  // ... (clipped 55 lines)
};
\`\`\`
</details>

### Solution Walkthrough:

#### Before:
\`\`\`typescript
const adjustInlineCodeOffsets = (start, end) => {
  // Manually finds and trims backticks
  const raw = markdown.slice(start, end);
  const leadingMatch = raw.match(/^\`+/);
  const trailingMatch = raw.match(/\`+$/);
  const ticks = Math.min(leadingMatch[0].length, trailingMatch[0].length);
  // This manual adjustment can fail on complex cases
  return { mdStart: start + ticks, mdEnd: end - ticks };
};
\`\`\`

#### After:
\`\`\`typescript
const visit = (node, parentOffsets) => {
  let { start, end } = getOffsets(node);
  
  // Fallback if offsets are missing on the node
  if (start === undefined && parentOffsets) {
    // ... logic to infer offsets from parent/siblings
  }
  
  switch (node.type) {
    case "inlineCode": {
      // More robustly find content offsets without manual adjustment
      const rawText = markdown.slice(start, end);
      const contentIndex = rawText.indexOf(node.value);
      if (contentIndex !== -1) {
        const mdStart = start + contentIndex;
        const mdEnd = mdStart + node.value.length;
        return createText(node.value, mdStart, mdEnd);
      }
      // Fallback if value not found, don't add offsets
      return createText(node.value);
    }
    // ...
  }
};
\`\`\`

<details><summary>Suggestion importance[1-10]: 9</summary>

__

Why: The suggestion correctly identifies a critical architectural weakness where the new highlighting feature relies entirely on potentially brittle markdown offsets, proposing robust validation and fallbacks to prevent hard-to-debug errors.

</details>
</details>

</td>
<td align="center">High</td>
</tr>
<tr>
<td rowspan="2">Possible issue</td>
<td>

<details><summary>Guard interactions when tag is absent</summary>

___

**Avoid generating invalid IDs and dataset values when \`leaf.tag\` is missing. Only set \`id\`, \`data-tag\`, and invoke callbacks when a non-empty tag exists to prevent duplicate/blank IDs and unexpected handler calls.**

\`\`\`diff
-const renderLeaf = ({
-  attributes,
-  children,
-  leaf,
-  activeTag,
-  hoveredTag,
-  onHighlightClick,
-  onHighlightHover,
-}: Omit<SlateRenderLeafProps, "leaf"> & {
-  leaf: DecoratedLeaf;
-  activeTag?: string | null;
-  hoveredTag?: string | null;
-  onHighlightClick?: (tag: string) => void;
-  onHighlightHover?: (tag: string | null) => void;
-}) => {
+  const hasTag = typeof leaf.tag === "string" && leaf.tag.length > 0;
+  const isActive = leaf.isActive || (hasTag && leaf.tag === activeTag);
+  const isHovered = hasTag && leaf.tag === hoveredTag;
\`\`\`

<details><summary>Suggestion importance[1-10]: 7</summary>

__

Why: The suggestion correctly identifies that a missing \`leaf.tag\` could lead to invalid HTML attributes (\`id=""\`) and incorrect event handler calls, improving the component's robustness and correctness.

</details>
</details>

</td>
<td align="center">Medium</td>
</tr>
<tr>
<td>

<details><summary>Prevent zero-length inline code ranges</summary>

___

**Ensure the adjusted content range is non-empty. The current \`<=\` allows zero-length ranges, which can cause empty highlights and bad relative offsets. Use a strict \`<\` check and guard against negative results.**

\`\`\`diff
 const adjustInlineCodeOffsets = (
   start?: number,
   end?: number
 ): { mdStart?: number; mdEnd?: number } => {
   if (typeof start !== "number" || typeof end !== "number")
     return { mdStart: start, mdEnd: end };
   const raw = markdown.slice(start, end);
   const leadingMatch = raw.match(/^\`+/);
   const trailingMatch = raw.match(/\`+$/);
   const ticks =
     leadingMatch && trailingMatch
       ? Math.min(leadingMatch[0].length, trailingMatch[0].length)
       : 1;
   const contentStart = start + ticks;
   const contentEnd = end - ticks;
-  if (contentStart <= contentEnd)
+  if (contentStart < contentEnd) {
     return { mdStart: contentStart, mdEnd: contentEnd };
+  }
+  // Fallback to original bounds if trimming collapses range
   return { mdStart: start, mdEnd: end };
 };
\`\`\`

<details><summary>Suggestion importance[1-10]: 6</summary>

__

Why: This is a good catch that prevents an edge case where an inline code block could result in a zero-length range, improving the robustness of the offset calculation.

</details>
</details>

</td>
<td align="center">Low</td>
</tr>
</tbody>
</table>

## Simple Table Examples

### Basic Table
| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |

### Table with Alignment
| Left Aligned | Center Aligned | Right Aligned |
|:-------------|:--------------:|--------------:|
| Left         | Center         | Right         |
| 123          | 456            | 789           |

### Table with Inline Formatting
| Feature | Description | Status |
|---------|-------------|--------|
| **Bold** | Text with *emphasis* | ✅ Done |
| \`Code\` | Inline code blocks | 🚧 WIP |
| [Links](https://example.com) | Clickable links | ❌ TODO |

## Other Markdown Elements

### Details/Summary Blocks

<details>
<summary>Click to expand</summary>

This is the content inside the details block. It can contain:
- Lists
- **Bold text**
- \`code\`
- Even nested details!

<details>
<summary>Nested details</summary>

This is nested content!

</details>

</details>

### Code Blocks

\`\`\`javascript
function example() {
  return "This is a code block";
}
\`\`\`

### Blockquotes

> This is a blockquote
> 
> It can span multiple lines
`;

export default function ShowcasePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Markdown Component Showcase</h1>
          <p className="mt-2 text-gray-600">
            Testing various markdown elements, especially complex tables with nested content
          </p>
        </div>
        
        <div className="rounded-lg bg-white p-8 shadow">
          <div className="prose prose-gray max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              components={MARKDOWN_COMPONENTS}
            >
              {complexTableExample}
            </ReactMarkdown>
          </div>
        </div>
        
        <div className="mt-8 rounded-lg bg-gray-900 p-8 text-white">
          <h2 className="mb-4 text-xl font-bold">Raw Markdown Source</h2>
          <pre className="overflow-x-auto whitespace-pre-wrap text-sm text-gray-300">
            <code>{complexTableExample}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}