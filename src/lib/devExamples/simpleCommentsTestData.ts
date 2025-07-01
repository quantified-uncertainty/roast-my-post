export interface SimpleComment {
  id: string;
  author: string;
  text: string;
  highlightStart: number;
  highlightEnd: number;
}

export const simpleMarkdownContent = `# Simple Test Document

This is a test document with some basic content. We'll use this to test our comment positioning system.

## First Section

This paragraph contains some text that will be highlighted by the first comment. It's important to test how comments align with their corresponding highlights.

## Second Section

Here's another paragraph with different content. This will be used for the second comment to ensure multiple comments can be positioned correctly without overlapping.`;

export const simpleComments: SimpleComment[] = [
  {
    id: 'comment-1',
    author: 'Alice',
    text: 'This is a short comment about the highlighted text.',
    highlightStart: 135,
    highlightEnd: 251
  },
  {
    id: 'comment-2',
    author: 'Bob',
    text: 'This is a longer comment that spans multiple lines. It contains more detailed feedback about the content and should test how the comment positioning system handles different comment sizes. When comments are longer, they need more vertical space and the positioning algorithm should account for this to prevent overlaps.',
    highlightStart: 298,
    highlightEnd: 461
  }
];