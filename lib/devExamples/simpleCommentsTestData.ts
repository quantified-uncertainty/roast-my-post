export interface SimpleComment {
  id: string;
  text: string;
  highlightStart: number;
  highlightEnd: number;
  author: string;
}

// Much simpler test content with just 2 comments
export const simpleMarkdownContent = `# Simple Test Document

This is the first paragraph with some content that we want to highlight and comment on.

Here's a second paragraph with more text.

This is the third paragraph.

1

2

3

4

5

6

7

8

9

10

11

12

13

14

15

16

17

18

19

20


And finally, this is the last paragraph that also needs a comment for testing purposes.`;

export const simpleComments: SimpleComment[] = [
  {
    id: "comment-1",
    text: "This is a much longer comment that goes into great detail about the first paragraph. It discusses various aspects of the content, provides context, raises questions, and offers suggestions for improvement. The comment continues with additional thoughts about the writing style, the structure of the paragraph, and how it relates to the overall document. This extended commentary is designed to test the truncation and expansion functionality of the comment system.",
    highlightStart: 26, // "first paragraph"
    highlightEnd: 41,
    author: "Test User 1",
  },
  {
    id: "comment-2",
    text: "Short comment on number 9.",
    highlightStart: 140, // "9" 
    highlightEnd: 141,
    author: "Test User 2",
  },
  {
    id: "comment-3",
    text: "Another lengthy comment that provides extensive feedback on the last paragraph. This comment includes multiple points: First, it addresses the clarity of the writing. Second, it suggests alternative phrasings that might better convey the intended meaning. Third, it questions whether this paragraph effectively concludes the document. Fourth, it recommends additional resources that readers might find helpful. Finally, it offers encouragement while also providing constructive criticism about areas that could be strengthened.",
    highlightStart: 195, // "last paragraph"
    highlightEnd: 209,
    author: "Test User 2",
  },
];
