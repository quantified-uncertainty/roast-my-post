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
  preserveContext?: boolean;
  targetWords?: number; // Target word count for recursive chunking
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
  preserveContext: z
    .boolean()
    .optional()
    .default(true)
    .describe("Try to preserve semantic context when chunking"),
  targetWords: z
    .number()
    .min(50)
    .max(2000)
    .optional()
    .default(500)
    .describe("Target word count for recursive chunking (markdown strategy)"),
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
    const targetWords = options.targetWords || 500;
    const sections = this.parseMarkdownHierarchy(text);
    const chunks = this.recursivelyChunkSections(sections, targetWords, options);
    
    // Add metadata and convert to final chunk format
    return chunks.map((chunk, index) => ({
      id: `chunk-${index}`,
      ...chunk,
      metadata: {
        ...chunk.metadata,
        confidence: 0.95,
      },
    }));
  }

  // Parse markdown into hierarchical sections
  private parseMarkdownHierarchy(text: string): MarkdownSection[] {
    const lines = text.split('\n');
    const sections: MarkdownSection[] = [];
    let currentSection: MarkdownSection | null = null;
    let currentOffset = 0;
    let currentLineNum = 0;
    let insideCodeBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineLength = line.length + 1; // +1 for newline
      
      // Track code block boundaries
      if (line.trim().startsWith('```')) {
        insideCodeBlock = !insideCodeBlock;
      }
      
      // Only parse headings when not inside code blocks
      const headingMatch = !insideCodeBlock ? line.match(/^(#{1,6})\s+(.+)$/) : null;

      if (headingMatch) {
        const level = headingMatch[1].length;
        const title = headingMatch[2];

        // Save previous section if exists
        if (currentSection) {
          currentSection.endOffset = currentOffset - 1;
          currentSection.endLine = i;
          sections.push(currentSection);
        }

        // Start new section
        currentSection = {
          level,
          title,
          content: [],
          startOffset: currentOffset,
          startLine: i + 1,
          endOffset: text.length,
          endLine: lines.length,
          subsections: [],
        };
      } else if (currentSection) {
        currentSection.content.push(line);
      } else {
        // Content before first heading
        if (!sections.length || sections[sections.length - 1].level > 0) {
          currentSection = {
            level: 0,
            title: '',
            content: [line],
            startOffset: currentOffset,
            startLine: currentLineNum + 1,
            endOffset: text.length,
            endLine: lines.length,
            subsections: [],
          };
        }
      }

      currentOffset += lineLength;
      currentLineNum++;
    }

    // Save final section
    if (currentSection) {
      currentSection.endOffset = text.length;
      currentSection.endLine = lines.length;
      sections.push(currentSection);
    }

    // Build hierarchy
    return this.buildSectionHierarchy(sections);
  }

  // Build hierarchical structure from flat sections
  private buildSectionHierarchy(sections: MarkdownSection[]): MarkdownSection[] {
    const root: MarkdownSection[] = [];
    const stack: MarkdownSection[] = [];

    for (const section of sections) {
      // Find parent - the closest section with lower level
      while (stack.length > 0 && stack[stack.length - 1].level >= section.level) {
        stack.pop();
      }

      if (stack.length === 0) {
        root.push(section);
      } else {
        stack[stack.length - 1].subsections.push(section);
      }

      stack.push(section);
    }

    return root;
  }

  // Recursively chunk sections based on word count
  private recursivelyChunkSections(
    sections: MarkdownSection[],
    targetWords: number,
    options: DocumentChunkerInput,
    parentContext: string[] = []
  ): Omit<DocumentChunk, 'id'>[] {
    const chunks: Omit<DocumentChunk, 'id'>[] = [];

    for (const section of sections) {
      const sectionText = this.getSectionFullText(section);
      const wordCount = this.countWords(sectionText);
      const currentContext = section.title ? [...parentContext, section.title] : parentContext;

      if (wordCount <= targetWords) {
        // Section is small enough, create a single chunk
        chunks.push(this.createChunkFromSection(section, currentContext, sectionText));
      } else if (section.subsections.length > 0) {
        // Section is too large but has subsections, recurse into them
        const headerText = section.title ? `${'#'.repeat(section.level)} ${section.title}\n\n` : '';
        const contentBeforeSubsections = section.content.join('\n').trim();
        
        // Add content before subsections as a separate chunk if significant
        if (contentBeforeSubsections && this.countWords(contentBeforeSubsections) > 50) {
          const introChunk = this.createChunkFromContent(
            headerText + contentBeforeSubsections,
            section.startOffset,
            section.startLine,
            currentContext,
            'section'
          );
          chunks.push(introChunk);
        }

        // Recursively chunk subsections
        const subChunks = this.recursivelyChunkSections(
          section.subsections,
          targetWords,
          options,
          currentContext
        );
        chunks.push(...subChunks);
      } else {
        // Section is too large with no subsections, split by content
        const sectionChunks = this.splitLargeSection(section, targetWords, currentContext, options);
        chunks.push(...sectionChunks);
      }
    }

    return chunks;
  }

  // Split a large section without subsections
  private splitLargeSection(
    section: MarkdownSection,
    targetWords: number,
    context: string[],
    options: DocumentChunkerInput
  ): Omit<DocumentChunk, 'id'>[] {
    const chunks: Omit<DocumentChunk, 'id'>[] = [];
    const headerText = section.title ? `${'#'.repeat(section.level)} ${section.title}\n\n` : '';
    const lines = section.content;
    
    let currentChunk: string[] = [];
    let currentWordCount = 0;
    let chunkStartLine = section.startLine;
    let chunkStartOffset = section.startOffset;
    
    // Count words in header
    const headerWords = this.countWords(headerText);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineWords = this.countWords(line);
      
      // Check if this is a code block
      if (line.trim().startsWith('```')) {
        // Find the end of the code block
        let codeBlockLines = [line];
        let j = i + 1;
        while (j < lines.length && !lines[j].trim().startsWith('```')) {
          codeBlockLines.push(lines[j]);
          j++;
        }
        if (j < lines.length) {
          codeBlockLines.push(lines[j]);
        }
        
        const codeBlockText = codeBlockLines.join('\n');
        const codeBlockWords = this.countWords(codeBlockText);
        
        // If adding code block exceeds target, flush current chunk first
        if (currentWordCount + codeBlockWords > targetWords && currentChunk.length > 0) {
          const chunkText = (currentChunk.length === 0 ? headerText : '') + currentChunk.join('\n');
          chunks.push(this.createChunkFromContent(
            chunkText,
            chunkStartOffset,
            chunkStartLine,
            context,
            'mixed'
          ));
          currentChunk = [];
          currentWordCount = headerWords;
          chunkStartLine = section.startLine + i;
          chunkStartOffset = this.calculateOffset(section, i);
        }
        
        // Add entire code block
        currentChunk.push(...codeBlockLines);
        currentWordCount += codeBlockWords;
        i = j;
        continue;
      }
      
      // Check if adding this line exceeds target
      if (currentWordCount + lineWords > targetWords && currentChunk.length > 0) {
        // Flush current chunk
        const chunkText = (chunks.length === 0 ? headerText : '') + currentChunk.join('\n');
        chunks.push(this.createChunkFromContent(
          chunkText,
          chunkStartOffset,
          chunkStartLine,
          context,
          'mixed'
        ));
        currentChunk = [];
        currentWordCount = 0;
        chunkStartLine = section.startLine + i;
        chunkStartOffset = this.calculateOffset(section, i);
      }
      
      currentChunk.push(line);
      currentWordCount += lineWords;
    }
    
    // Flush final chunk
    if (currentChunk.length > 0) {
      const chunkText = (chunks.length === 0 ? headerText : '') + currentChunk.join('\n');
      chunks.push(this.createChunkFromContent(
        chunkText,
        chunkStartOffset,
        chunkStartLine,
        context,
        'mixed'
      ));
    }
    
    return chunks;
  }

  // Helper methods for recursive chunking
  private getSectionFullText(section: MarkdownSection): string {
    const header = section.title ? `${'#'.repeat(section.level)} ${section.title}\n\n` : '';
    const content = section.content.join('\n');
    const subsectionTexts = section.subsections.map(s => this.getSectionFullText(s)).join('\n\n');
    return header + content + (subsectionTexts ? '\n\n' + subsectionTexts : '');
  }

  private createChunkFromSection(
    section: MarkdownSection,
    context: string[],
    text?: string
  ): Omit<DocumentChunk, 'id'> {
    const chunkText = text || this.getSectionFullText(section);
    return {
      text: chunkText.trim(),
      startOffset: section.startOffset,
      endOffset: section.endOffset,
      startLine: section.startLine,
      endLine: section.endLine,
      metadata: {
        type: section.level === 0 ? 'mixed' : 'section',
        headingContext: context,
        isComplete: true,
        confidence: 0.95,
      },
    };
  }

  private createChunkFromContent(
    text: string,
    startOffset: number,
    startLine: number,
    context: string[],
    type: 'paragraph' | 'section' | 'code' | 'list' | 'heading' | 'mixed'
  ): Omit<DocumentChunk, 'id'> {
    const lines = text.split('\n');
    const endOffset = startOffset + text.length;
    const endLine = startLine + lines.length - 1;
    
    return {
      text: text.trim(),
      startOffset,
      endOffset,
      startLine,
      endLine,
      metadata: {
        type,
        headingContext: context,
        isComplete: true,
        confidence: 0.95,
      },
    };
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  private calculateOffset(section: MarkdownSection, lineIndex: number): number {
    let offset = section.startOffset;
    for (let i = 0; i < lineIndex; i++) {
      offset += section.content[i].length + 1; // +1 for newline
    }
    return offset;
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
          
          currentChunk = [];
          chunkStartOffset = currentOffset + 1;
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
          isComplete: end === text.length,
          confidence: 0.7,
        },
      });

      position = end;
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

}

// Type for markdown sections
interface MarkdownSection {
  level: number;
  title: string;
  content: string[];
  startOffset: number;
  endOffset: number;
  startLine: number;
  endLine: number;
  subsections: MarkdownSection[];
}

// Export singleton instance
export const documentChunkerTool = new DocumentChunkerTool();
export default documentChunkerTool;