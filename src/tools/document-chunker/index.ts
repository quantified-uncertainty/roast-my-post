import { z } from "zod";

import {
  Tool,
  ToolContext,
} from "../base/Tool";

// Define types for the tool
export interface DocumentChunkerInput {
  text: string;
  strategy?: 'semantic' | 'fixed' | 'paragraph' | 'markdown' | 'hybrid';
  maxChunkSize?: number;
  minChunkSize?: number;
  overlap?: number;
  preserveContext?: boolean;
}

export interface DocumentChunk {
  id: string;
  text: string;
  startOffset: number;
  endOffset: number;
  startLine: number;
  endLine: number;
  metadata: {
    type?: 'paragraph' | 'section' | 'code' | 'list' | 'heading' | 'mixed';
    headingContext?: string[];
    isComplete: boolean;
    confidence: number;
  };
}

export interface DocumentChunkerOutput {
  chunks: DocumentChunk[];
  metadata: {
    totalChunks: number;
    averageChunkSize: number;
    strategy: string;
    warnings?: string[];
  };
}

// Input validation schema
const inputSchema = z.object({
  text: z.string().min(1).max(500000).describe("The document text to chunk"),
  strategy: z
    .enum(['semantic', 'fixed', 'paragraph', 'markdown', 'hybrid'])
    .optional()
    .default('hybrid')
    .describe("Chunking strategy to use"),
  maxChunkSize: z
    .number()
    .min(100)
    .max(10000)
    .optional()
    .default(1500)
    .describe("Maximum size of each chunk in characters"),
  minChunkSize: z
    .number()
    .min(50)
    .max(1000)
    .optional()
    .default(200)
    .describe("Minimum size of each chunk in characters"),
  overlap: z
    .number()
    .min(0)
    .max(500)
    .optional()
    .default(100)
    .describe("Number of characters to overlap between chunks"),
  preserveContext: z
    .boolean()
    .optional()
    .default(true)
    .describe("Try to preserve semantic context when chunking"),
});

// Output validation schema
const outputSchema = z.object({
  chunks: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      startOffset: z.number(),
      endOffset: z.number(),
      startLine: z.number(),
      endLine: z.number(),
      metadata: z.object({
        type: z
          .enum(['paragraph', 'section', 'code', 'list', 'heading', 'mixed'])
          .optional(),
        headingContext: z.array(z.string()).optional(),
        isComplete: z.boolean(),
        confidence: z.number().min(0).max(1),
      }),
    })
  ),
  metadata: z.object({
    totalChunks: z.number(),
    averageChunkSize: z.number(),
    strategy: z.string(),
    warnings: z.array(z.string()).optional(),
  }),
});

export class DocumentChunkerTool extends Tool<
  DocumentChunkerInput,
  DocumentChunkerOutput
> {
  config = {
    id: "document-chunker",
    name: "Intelligent Document Chunker",
    description:
      "Splits documents into semantic chunks optimized for LLM analysis. Supports multiple strategies including markdown-aware, semantic, and hybrid chunking.",
    version: "1.0.0",
    category: "utility" as const,
    costEstimate: "$0 (no LLM calls)",
    path: "/tools/document-chunker",
    status: "stable" as const,
  };

  inputSchema = inputSchema;
  outputSchema = outputSchema;

  async execute(
    input: DocumentChunkerInput,
    context: ToolContext
  ): Promise<DocumentChunkerOutput> {
    context.logger.info(`[DocumentChunker] Starting chunking with strategy: ${input.strategy}`);

    const warnings: string[] = [];
    let chunks: DocumentChunk[];

    switch (input.strategy) {
      case 'markdown':
        chunks = this.markdownAwareChunking(input.text, input, warnings);
        break;
      case 'semantic':
        chunks = this.semanticChunking(input.text, input, warnings);
        break;
      case 'paragraph':
        chunks = this.paragraphChunking(input.text, input, warnings);
        break;
      case 'fixed':
        chunks = this.fixedSizeChunking(input.text, input, warnings);
        break;
      case 'hybrid':
      default:
        chunks = this.hybridChunking(input.text, input, warnings);
        break;
    }

    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.text.length, 0);
    const avgSize = chunks.length > 0 ? Math.round(totalSize / chunks.length) : 0;

    context.logger.info(
      `[DocumentChunker] Created ${chunks.length} chunks with average size ${avgSize} characters`
    );

    return {
      chunks,
      metadata: {
        totalChunks: chunks.length,
        averageChunkSize: avgSize,
        strategy: input.strategy || 'hybrid',
        warnings: warnings.length > 0 ? warnings : undefined,
      },
    };
  }

  private hybridChunking(
    text: string,
    options: DocumentChunkerInput,
    warnings: string[]
  ): DocumentChunk[] {
    // First try markdown-aware chunking
    const markdownChunks = this.markdownAwareChunking(text, options, []);
    
    // If markdown chunking produces reasonable results, use it
    if (markdownChunks.length > 0 && this.hasGoodDistribution(markdownChunks, options)) {
      return markdownChunks;
    }

    // Otherwise fall back to semantic chunking
    warnings.push("Markdown structure not ideal, using semantic chunking");
    return this.semanticChunking(text, options, warnings);
  }

  private markdownAwareChunking(
    text: string,
    options: DocumentChunkerInput,
    warnings: string[]
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const lines = text.split('\n');
    let currentChunk: string[] = [];
    let currentHeadings: string[] = [];
    let chunkStartLine = 0;
    let chunkStartOffset = 0;
    let currentOffset = 0;
    let chunkId = 0;

    const flushChunk = (endLine: number, endOffset: number, type?: string) => {
      if (currentChunk.length > 0) {
        const chunkText = currentChunk.join('\n');
        if (chunkText.trim().length >= (options.minChunkSize || 200)) {
          chunks.push({
            id: `chunk-${chunkId++}`,
            text: chunkText,
            startOffset: chunkStartOffset,
            endOffset: endOffset,
            startLine: chunkStartLine + 1,
            endLine: endLine + 1,
            metadata: {
              type: (type as any) || 'mixed',
              headingContext: [...currentHeadings],
              isComplete: true,
              confidence: 0.9,
            },
          });
        }
        currentChunk = [];
        chunkStartLine = endLine + 1;
        chunkStartOffset = endOffset + 1;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineLength = line.length + 1; // +1 for newline

      // Detect headings
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const headingText = headingMatch[2];

        // Flush current chunk before heading
        if (currentChunk.length > 0) {
          flushChunk(i - 1, currentOffset - 1);
        }

        // Update heading context
        currentHeadings = currentHeadings.slice(0, level - 1);
        currentHeadings[level - 1] = headingText;
      }

      // Detect code blocks
      const isCodeBlockStart = line.trim().startsWith('```');
      if (isCodeBlockStart) {
        // Find the end of the code block
        let codeBlockEnd = i;
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].trim().startsWith('```')) {
            codeBlockEnd = j;
            break;
          }
        }

        // Include entire code block in current chunk
        for (let j = i; j <= codeBlockEnd && j < lines.length; j++) {
          currentChunk.push(lines[j]);
          currentOffset += lines[j].length + 1;
        }
        i = codeBlockEnd;
        continue;
      }

      currentChunk.push(line);
      currentOffset += lineLength;

      // Check if we should start a new chunk
      const currentChunkSize = currentChunk.join('\n').length;
      if (currentChunkSize >= (options.maxChunkSize || 1500)) {
        // Try to find a good break point
        const breakPoint = this.findBreakPoint(currentChunk);
        if (breakPoint > 0 && breakPoint < currentChunk.length - 1) {
          const remainingLines = currentChunk.slice(breakPoint);
          currentChunk = currentChunk.slice(0, breakPoint);
          flushChunk(i - remainingLines.length, currentOffset - remainingLines.join('\n').length - remainingLines.length);
          currentChunk = remainingLines;
        } else {
          flushChunk(i, currentOffset);
        }
      }
    }

    // Flush final chunk
    flushChunk(lines.length - 1, text.length);

    return chunks;
  }

  private semanticChunking(
    text: string,
    options: DocumentChunkerInput,
    warnings: string[]
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const sentences = this.splitIntoSentences(text);
    let currentChunk: string[] = [];
    let chunkStartOffset = 0;
    let currentOffset = 0;
    let chunkId = 0;

    for (const sentence of sentences) {
      const potentialChunk = [...currentChunk, sentence].join(' ');
      
      if (potentialChunk.length > (options.maxChunkSize || 1500)) {
        // Flush current chunk
        if (currentChunk.length > 0) {
          const chunkText = currentChunk.join(' ');
          const { startLine, endLine } = this.getLineNumbers(text, chunkStartOffset, currentOffset);
          
          chunks.push({
            id: `chunk-${chunkId++}`,
            text: chunkText,
            startOffset: chunkStartOffset,
            endOffset: currentOffset,
            startLine,
            endLine,
            metadata: {
              type: 'mixed',
              isComplete: true,
              confidence: 0.8,
            },
          });
          
          // Add overlap if specified
          if (options.overlap && options.overlap > 0) {
            const overlapSentences = this.getOverlapSentences(currentChunk, options.overlap);
            currentChunk = overlapSentences;
            chunkStartOffset = currentOffset - overlapSentences.join(' ').length;
          } else {
            currentChunk = [];
            chunkStartOffset = currentOffset + 1;
          }
        }
      }
      
      currentChunk.push(sentence);
      currentOffset += sentence.length + 1;
    }

    // Flush final chunk
    if (currentChunk.length > 0) {
      const chunkText = currentChunk.join(' ');
      const { startLine, endLine } = this.getLineNumbers(text, chunkStartOffset, text.length);
      
      chunks.push({
        id: `chunk-${chunkId++}`,
        text: chunkText,
        startOffset: chunkStartOffset,
        endOffset: text.length,
        startLine,
        endLine,
        metadata: {
          type: 'mixed',
          isComplete: true,
          confidence: 0.8,
        },
      });
    }

    return chunks;
  }

  private paragraphChunking(
    text: string,
    options: DocumentChunkerInput,
    warnings: string[]
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const paragraphs = text.split(/\n\n+/);
    let currentOffset = 0;
    let chunkId = 0;

    for (const paragraph of paragraphs) {
      if (paragraph.trim().length >= (options.minChunkSize || 200)) {
        const { startLine, endLine } = this.getLineNumbers(
          text,
          currentOffset,
          currentOffset + paragraph.length
        );

        chunks.push({
          id: `chunk-${chunkId++}`,
          text: paragraph.trim(),
          startOffset: currentOffset,
          endOffset: currentOffset + paragraph.length,
          startLine,
          endLine,
          metadata: {
            type: 'paragraph',
            isComplete: true,
            confidence: 0.95,
          },
        });
      }
      currentOffset += paragraph.length + 2; // +2 for double newline
    }

    if (chunks.length === 0) {
      warnings.push("No suitable paragraphs found, falling back to fixed-size chunking");
      return this.fixedSizeChunking(text, options, warnings);
    }

    return chunks;
  }

  private fixedSizeChunking(
    text: string,
    options: DocumentChunkerInput,
    warnings: string[]
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const chunkSize = options.maxChunkSize || 1500;
    const overlap = options.overlap || 100;
    let position = 0;
    let chunkId = 0;

    while (position < text.length) {
      const end = Math.min(position + chunkSize, text.length);
      const chunkText = text.slice(position, end);
      const { startLine, endLine } = this.getLineNumbers(text, position, end);

      chunks.push({
        id: `chunk-${chunkId++}`,
        text: chunkText,
        startOffset: position,
        endOffset: end,
        startLine,
        endLine,
        metadata: {
          type: 'mixed',
          isComplete: position + chunkSize >= text.length || end === text.length,
          confidence: 0.7,
        },
      });

      position += chunkSize - overlap;
    }

    return chunks;
  }

  // Helper methods
  private splitIntoSentences(text: string): string[] {
    // Simple sentence splitting - could be enhanced with NLP library
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    return sentences.map(s => s.trim()).filter(s => s.length > 0);
  }

  private getLineNumbers(text: string, startOffset: number, endOffset: number): { startLine: number; endLine: number } {
    const beforeStart = text.slice(0, startOffset);
    const beforeEnd = text.slice(0, endOffset);
    const startLine = (beforeStart.match(/\n/g) || []).length + 1;
    const endLine = (beforeEnd.match(/\n/g) || []).length + 1;
    return { startLine, endLine };
  }

  private findBreakPoint(lines: string[]): number {
    // Look for natural break points like empty lines or paragraph boundaries
    for (let i = lines.length - 1; i > lines.length / 2; i--) {
      if (lines[i].trim() === '' || lines[i].match(/^(#{1,6}|---|===)/)) {
        return i;
      }
    }
    return lines.length;
  }

  private hasGoodDistribution(chunks: DocumentChunk[], options: DocumentChunkerInput): boolean {
    const sizes = chunks.map(c => c.text.length);
    const avg = sizes.reduce((a, b) => a + b, 0) / sizes.length;
    const maxSize = options.maxChunkSize || 1500;
    const minSize = options.minChunkSize || 200;
    
    // Check if most chunks are within reasonable bounds
    const goodChunks = sizes.filter(s => s >= minSize && s <= maxSize).length;
    return goodChunks / chunks.length > 0.7;
  }

  private getOverlapSentences(sentences: string[], overlapSize: number): string[] {
    let size = 0;
    const overlap: string[] = [];
    
    for (let i = sentences.length - 1; i >= 0; i--) {
      overlap.unshift(sentences[i]);
      size += sentences[i].length;
      if (size >= overlapSize) break;
    }
    
    return overlap;
  }
}

// Export singleton instance
export const documentChunkerTool = new DocumentChunkerTool();
export default documentChunkerTool;