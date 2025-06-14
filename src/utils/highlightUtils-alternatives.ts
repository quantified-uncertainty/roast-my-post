// Alternative implementations for highlight processing
// These are cleaner, more maintainable approaches

import type { Comment } from "../types/documentSchema";

// ============================================================================
// ALTERNATIVE 1: Semantic Chunking + Vector Search
// ============================================================================

interface SemanticChunk {
  text: string;
  startOffset: number;
  endOffset: number;
  embedding?: number[]; // Would be populated by embedding service
}

interface SemanticHighlight {
  concept: string; // Instead of exact text, describe what to highlight
  context?: string; // Optional context for better matching
}

/**
 * Alternative 1: Use semantic similarity instead of exact text matching
 * This is much more robust and handles paraphrasing, formatting differences, etc.
 */
export class SemanticHighlighter {
  private chunks: SemanticChunk[] = [];

  constructor(private content: string) {
    this.chunks = this.chunkContent(content);
  }

  private chunkContent(content: string): SemanticChunk[] {
    // Split content into semantic chunks (sentences, paragraphs, etc.)
    const sentences = content
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 10);
    let offset = 0;

    return sentences.map((sentence) => {
      const trimmed = sentence.trim();
      const startOffset = content.indexOf(trimmed, offset);
      const endOffset = startOffset + trimmed.length;
      offset = endOffset;

      return {
        text: trimmed,
        startOffset,
        endOffset,
      };
    });
  }

  async findBestMatch(
    highlight: SemanticHighlight
  ): Promise<SemanticChunk | null> {
    // In a real implementation, you'd use embeddings here
    // For now, use simple text similarity
    let bestMatch: SemanticChunk | null = null;
    let bestScore = 0;

    for (const chunk of this.chunks) {
      const score = this.calculateSimilarity(highlight.concept, chunk.text);
      if (score > bestScore && score > 0.7) {
        // Threshold for good matches
        bestScore = score;
        bestMatch = chunk;
      }
    }

    return bestMatch;
  }

  private calculateSimilarity(a: string, b: string): number {
    // Simple word overlap similarity - in practice, use embeddings
    const wordsA = new Set(a.toLowerCase().split(/\s+/));
    const wordsB = new Set(b.toLowerCase().split(/\s+/));
    const intersection = new Set([...wordsA].filter((x) => wordsB.has(x)));
    const union = new Set([...wordsA, ...wordsB]);
    return intersection.size / union.size;
  }
}

// ============================================================================
// ALTERNATIVE 2: Position-Based Highlighting
// ============================================================================

interface PositionHighlight {
  paragraphIndex: number;
  sentenceIndex?: number;
  wordRange?: [number, number]; // Start and end word indices
}

/**
 * Alternative 2: Use document structure (paragraphs, sentences) instead of text matching
 * Much more reliable and easier to validate
 */
export class StructuralHighlighter {
  private paragraphs: string[] = [];
  private sentences: string[][] = [];

  constructor(private content: string) {
    this.parseStructure();
  }

  private parseStructure() {
    this.paragraphs = this.content.split(/\n\s*\n/).filter((p) => p.trim());
    this.sentences = this.paragraphs.map((p) =>
      p.split(/[.!?]+/).filter((s) => s.trim().length > 5)
    );
  }

  getHighlight(
    position: PositionHighlight
  ): { startOffset: number; endOffset: number; text: string } | null {
    if (position.paragraphIndex >= this.paragraphs.length) return null;

    const paragraph = this.paragraphs[position.paragraphIndex];
    let targetText = paragraph;

    // If sentence specified, narrow down
    if (position.sentenceIndex !== undefined) {
      const sentences = this.sentences[position.paragraphIndex];
      if (position.sentenceIndex >= sentences.length) return null;
      targetText = sentences[position.sentenceIndex];
    }

    // If word range specified, narrow down further
    if (position.wordRange) {
      const words = targetText.split(/\s+/);
      const [start, end] = position.wordRange;
      if (start >= words.length || end >= words.length) return null;
      targetText = words.slice(start, end + 1).join(" ");
    }

    // Find the actual position in the full content
    const startOffset = this.content.indexOf(targetText);
    if (startOffset === -1) return null;

    return {
      startOffset,
      endOffset: startOffset + targetText.length,
      text: targetText,
    };
  }
}

// ============================================================================
// ALTERNATIVE 3: Template-Based Comments
// ============================================================================

interface CommentTemplate {
  id: string;
  title: string;
  description: string;
  trigger: (content: string) => boolean; // Function to detect if this comment applies
  getHighlight: (
    content: string
  ) => { startOffset: number; endOffset: number; text: string } | null;
  importance: number;
  grade: number;
}

/**
 * Alternative 3: Pre-defined comment templates with smart detection
 * More predictable and easier to maintain than LLM generation
 */
export class TemplateBasedCommenter {
  private templates: CommentTemplate[] = [
    {
      id: "strong-opening",
      title: "💪 Strong Opening",
      description:
        "This opening effectively captures attention and sets up the main argument.",
      trigger: (content) => {
        const firstParagraph = content.split("\n\n")[0];
        return (
          firstParagraph.length > 50 &&
          (firstParagraph.includes("?") ||
            firstParagraph.includes("!") ||
            /^(When|If|Imagine|Consider)/.test(firstParagraph))
        );
      },
      getHighlight: (content) => {
        const firstParagraph = content.split("\n\n")[0];
        return {
          startOffset: 0,
          endOffset: firstParagraph.length,
          text: firstParagraph,
        };
      },
      importance: 75,
      grade: 85,
    },
    {
      id: "evidence-citation",
      title: "📊 Evidence Provided",
      description: "Good use of evidence to support the argument.",
      trigger: (content) => {
        return (
          /\[.*\]\(.*\)/.test(content) || // Markdown links
          /https?:\/\//.test(content) || // URLs
          /".*"/.test(content)
        ); // Quotes
      },
      getHighlight: (content) => {
        // Find first evidence
        const linkMatch = content.match(/\[([^\]]+)\]\([^)]+\)/);
        if (linkMatch) {
          const startOffset = content.indexOf(linkMatch[0]);
          return {
            startOffset,
            endOffset: startOffset + linkMatch[0].length,
            text: linkMatch[0],
          };
        }

        const urlMatch = content.match(/https?:\/\/[^\s]+/);
        if (urlMatch) {
          const startOffset = content.indexOf(urlMatch[0]);
          return {
            startOffset,
            endOffset: startOffset + urlMatch[0].length,
            text: urlMatch[0],
          };
        }

        return null;
      },
      importance: 80,
      grade: 90,
    },
    // Add more templates as needed
  ];

  generateComments(content: string): Comment[] {
    const comments: Comment[] = [];

    for (const template of this.templates) {
      if (template.trigger(content)) {
        const highlight = template.getHighlight(content);
        if (highlight) {
          comments.push({
            title: template.title,
            description: template.description,
            importance: template.importance,
            grade: template.grade,
            isValid: true,
            highlight: {
              startOffset: highlight.startOffset,
              endOffset: highlight.endOffset,
              quotedText: highlight.text,
              isValid: true,
            },
          });
        }
      }
    }

    return comments;
  }
}

// ============================================================================
// ALTERNATIVE 4: Fuzzy Matching with Confidence Scores
// ============================================================================

interface FuzzyMatch {
  startOffset: number;
  endOffset: number;
  text: string;
  confidence: number; // 0-1 score
}

/**
 * Alternative 4: Use fuzzy string matching with confidence scores
 * More forgiving than exact matching, but still deterministic
 */
export class FuzzyHighlighter {
  constructor(private content: string) {}

  findFuzzyMatch(searchText: string, minConfidence = 0.8): FuzzyMatch | null {
    const words = searchText.split(/\s+/);
    const contentWords = this.content.split(/\s+/);

    let bestMatch: FuzzyMatch | null = null;
    let bestConfidence = 0;

    // Sliding window approach
    for (let i = 0; i <= contentWords.length - words.length; i++) {
      const candidate = contentWords.slice(i, i + words.length);
      const confidence = this.calculateWordSimilarity(words, candidate);

      if (confidence > bestConfidence && confidence >= minConfidence) {
        const startOffset = this.getWordOffset(contentWords, i);
        const endOffset = this.getWordOffset(contentWords, i + words.length);

        bestMatch = {
          startOffset,
          endOffset,
          text: this.content.substring(startOffset, endOffset),
          confidence,
        };
        bestConfidence = confidence;
      }
    }

    return bestMatch;
  }

  private calculateWordSimilarity(words1: string[], words2: string[]): number {
    if (words1.length !== words2.length) return 0;

    let matches = 0;
    for (let i = 0; i < words1.length; i++) {
      if (this.wordsAreSimilar(words1[i], words2[i])) {
        matches++;
      }
    }

    return matches / words1.length;
  }

  private wordsAreSimilar(word1: string, word2: string): boolean {
    // Remove punctuation and compare
    const clean1 = word1.replace(/[^\w]/g, "").toLowerCase();
    const clean2 = word2.replace(/[^\w]/g, "").toLowerCase();

    if (clean1 === clean2) return true;

    // Allow for small differences (typos, etc.)
    if (Math.abs(clean1.length - clean2.length) <= 1) {
      const maxLen = Math.max(clean1.length, clean2.length);
      let differences = 0;
      for (let i = 0; i < maxLen; i++) {
        if (clean1[i] !== clean2[i]) differences++;
      }
      return differences <= 1;
    }

    return false;
  }

  private getWordOffset(words: string[], wordIndex: number): number {
    return words.slice(0, wordIndex).join(" ").length + (wordIndex > 0 ? 1 : 0);
  }
}

// ============================================================================
// ALTERNATIVE 5: Simple Range-Based Highlighting
// ============================================================================

/**
 * Alternative 5: Simplest approach - just use character ranges or percentages
 * Most reliable, though less precise
 */
export class RangeHighlighter {
  constructor(private content: string) {}

  // Highlight by percentage of document
  highlightByPercentage(
    startPercent: number,
    endPercent: number
  ): { startOffset: number; endOffset: number; text: string } {
    const startOffset = Math.floor((this.content.length * startPercent) / 100);
    const endOffset = Math.floor((this.content.length * endPercent) / 100);

    return {
      startOffset,
      endOffset,
      text: this.content.substring(startOffset, endOffset),
    };
  }

  // Highlight by line numbers
  highlightByLines(
    startLine: number,
    endLine: number
  ): { startOffset: number; endOffset: number; text: string } | null {
    const lines = this.content.split("\n");
    if (startLine >= lines.length || endLine >= lines.length) return null;

    const beforeLines = lines.slice(0, startLine).join("\n");
    const highlightLines = lines.slice(startLine, endLine + 1).join("\n");

    const startOffset = beforeLines.length + (startLine > 0 ? 1 : 0);
    const endOffset = startOffset + highlightLines.length;

    return {
      startOffset,
      endOffset,
      text: highlightLines,
    };
  }
}
