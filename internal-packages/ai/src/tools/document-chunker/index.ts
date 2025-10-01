import { z } from "zod";

import {
  Tool,
  ToolContext,
} from "../base/Tool";

// Configuration constants
export const DEFAULT_TARGET_WORDS = 500;
export const DEFAULT_MAX_CHUNK_SIZE = 1500;
export const DEFAULT_MIN_CHUNK_SIZE = 200;

// Define types for the tool
export interface DocumentChunkerInput {
  text: string;
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
  maxChunkSize: z
    .number()
    .min(100)
    .max(10000)
    .optional()
    .default(DEFAULT_MAX_CHUNK_SIZE)
    .describe("Maximum size of each chunk in characters"),
  minChunkSize: z
    .number()
    .min(50)
    .max(1000)
    .optional()
    .default(DEFAULT_MIN_CHUNK_SIZE)
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
    .default(DEFAULT_TARGET_WORDS)
    .describe("Target word count for recursive markdown chunking"),
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
    context.logger.info(`[DocumentChunker] Starting markdown-aware chunking`);

    const warnings: string[] = [];
    
    // Handle empty input
    if (!input.text || input.text.length === 0) {
      return {
        chunks: [],
        metadata: {
          totalChunks: 0,
          averageChunkSize: 0,
          strategy: 'markdown',
          warnings: warnings.length > 0 ? warnings : undefined,
        },
      };
    }
    
    // Always use markdown-aware chunking
    const chunks = this.markdownAwareChunking(input.text, input, warnings);

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
        strategy: 'markdown',
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
    const targetWords = options.targetWords || DEFAULT_TARGET_WORDS;
    const sections = this.parseMarkdownHierarchy(text);
    const chunks = this.recursivelyChunkSections(sections, targetWords, options, [], text);
    
    // Sort chunks by start offset
    chunks.sort((a, b) => a.startOffset - b.startOffset);
    
    // Adjust chunk boundaries to eliminate small gaps (e.g., missing newlines between sections)
    const MAX_GAP_TO_MERGE = 5; // Only merge gaps of 5 characters or less (handles newlines, spaces)
    
    for (let i = 0; i < chunks.length - 1; i++) {
      const currentChunk = chunks[i];
      const nextChunk = chunks[i + 1];
      
      const gap = nextChunk.startOffset - currentChunk.endOffset;
      
      // Only merge small gaps to avoid breaking intentional chunk boundaries
      if (gap > 0 && gap <= MAX_GAP_TO_MERGE) {
        currentChunk.endOffset = nextChunk.startOffset;
        currentChunk.text = text.substring(currentChunk.startOffset, currentChunk.endOffset);
      } else if (gap > MAX_GAP_TO_MERGE) {
        // For larger gaps, create a small filler chunk to ensure no text is lost
        const gapChunk = {
          text: text.substring(currentChunk.endOffset, nextChunk.startOffset),
          startOffset: currentChunk.endOffset,
          endOffset: nextChunk.startOffset,
          startLine: currentChunk.endLine,
          endLine: nextChunk.startLine,
          metadata: {
            type: 'mixed' as const,
            headingContext: [],
            isComplete: true,
            confidence: 0.95,
          },
        };
        chunks.splice(i + 1, 0, gapChunk);
        i++; // Skip the newly inserted chunk
      }
    }
    
    // Ensure first chunk starts at 0
    if (chunks.length > 0 && chunks[0].startOffset > 0) {
      const firstChunk = chunks[0];
      firstChunk.text = text.substring(0, firstChunk.endOffset);
      firstChunk.startOffset = 0;
    }
    
    // Ensure last chunk ends at text length
    if (chunks.length > 0) {
      const lastChunk = chunks[chunks.length - 1];
      if (lastChunk.endOffset < text.length) {
        lastChunk.text = text.substring(lastChunk.startOffset, text.length);
        lastChunk.endOffset = text.length;
      }
    }
    
    // Add metadata and convert to final chunk format
    const finalChunks = chunks.map((chunk, index) => ({
      id: `chunk-${index}`,
      ...chunk,
      metadata: {
        ...chunk.metadata,
        confidence: 0.95,
      },
    }));
    
    
    return finalChunks;
  }

  // Parse markdown into hierarchical sections
  private parseMarkdownHierarchy(text: string): MarkdownSection[] {
    const lines = text.split('\n');
    const sections: MarkdownSection[] = [];
    let currentSection: MarkdownSection | null = null;
    let currentOffset = 0;
    let insideCodeBlock = false;
    let beforeFirstHeadingContent: string[] = [];
    let beforeFirstHeadingStartOffset = 0;
    let beforeFirstHeadingStartLine = 1;
    let lineStartOffset = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      lineStartOffset = currentOffset;  // Store where this line starts
      const lineLength = line.length + (i < lines.length - 1 ? 1 : 0); // +1 for newline except last line
      
      // Track code block boundaries
      if (line.trim().startsWith('```')) {
        insideCodeBlock = !insideCodeBlock;
      }
      
      // Only parse headings when not inside code blocks
      const headingMatch = !insideCodeBlock ? line.match(/^(#{1,6})\s+(.+)$/) : null;

      if (headingMatch) {
        const level = headingMatch[1].length;
        const title = headingMatch[2];

        // If we have content before first heading, create a section for it
        if (beforeFirstHeadingContent.length > 0 && !currentSection) {
          const beforeHeadingSection: MarkdownSection = {
            level: 0,
            title: '',
            content: beforeFirstHeadingContent,
            startOffset: beforeFirstHeadingStartOffset,
            startLine: beforeFirstHeadingStartLine,
            endOffset: currentOffset - 1,
            endLine: i,
            subsections: [],
          };
          sections.push(beforeHeadingSection);
          beforeFirstHeadingContent = [];
        }

        // Save previous section if exists
        if (currentSection) {
          // End the section just before the current heading line
          currentSection.endOffset = currentOffset - 1;
          currentSection.endLine = i;
          sections.push(currentSection);
        }

        // Start new section - should include the heading line itself
        currentSection = {
          level,
          title,
          content: [],
          startOffset: lineStartOffset,  // Start at the beginning of the heading line
          startLine: i + 1,  // This is the line number (1-based)
          endOffset: text.length,
          endLine: lines.length,
          subsections: [],
        };
        
      } else {
        // Add content to existing section or store as before-first-heading content
        if (currentSection) {
          currentSection.content.push(line);
        } else {
          beforeFirstHeadingContent.push(line);
        }
      }

      currentOffset += lineLength;
    }

    // If we have content before first heading and no sections were created, create one
    if (beforeFirstHeadingContent.length > 0 && !currentSection) {
      const beforeHeadingSection: MarkdownSection = {
        level: 0,
        title: '',
        content: beforeFirstHeadingContent,
        startOffset: beforeFirstHeadingStartOffset,
        startLine: beforeFirstHeadingStartLine,
        endOffset: text.length,
        endLine: lines.length,
        subsections: [],
      };
      sections.push(beforeHeadingSection);
    }

    // Save final section
    if (currentSection) {
      currentSection.endOffset = text.length;
      currentSection.endLine = lines.length;
      sections.push(currentSection);
    }

    // Build hierarchy
    const hierarchicalSections = this.buildSectionHierarchy(sections);
    
    // Update parent section boundaries to include their subsections
    this.updateSectionBoundaries(hierarchicalSections);
    
    return hierarchicalSections;
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

  // Update section boundaries to include all subsections
  private updateSectionBoundaries(sections: MarkdownSection[]): void {
    for (const section of sections) {
      if (section.subsections.length > 0) {
        // First recursively update subsection boundaries
        this.updateSectionBoundaries(section.subsections);
        
        // Then update this section's end boundary to include all subsections
        const lastSubsection = section.subsections[section.subsections.length - 1];
        section.endOffset = lastSubsection.endOffset;
        section.endLine = lastSubsection.endLine;
      }
    }
  }

  // Recursively chunk sections based on word count
  private recursivelyChunkSections(
    sections: MarkdownSection[],
    targetWords: number,
    options: DocumentChunkerInput,
    parentContext: string[] = [],
    documentText?: string
  ): Omit<DocumentChunk, 'id'>[] {
    const chunks: Omit<DocumentChunk, 'id'>[] = [];


    for (const section of sections) {
      const sectionText = this.getSectionFullText(section);
      const wordCount = this.countWords(sectionText);
      const currentContext = section.title ? [...parentContext, section.title] : parentContext;


      if (wordCount <= targetWords) {
        // Section is small enough, create a single chunk
        const chunk = this.createChunkFromSection(section, currentContext, documentText);
        chunks.push(chunk);
        
      } else if (section.subsections.length > 0) {
        // Section is too large but has subsections, recurse into them
        const headerText = section.title ? `${'#'.repeat(section.level)} ${section.title}\n\n` : '';
        const contentBeforeSubsections = section.content.join('\n').trim();
        
        // Add content before subsections as a separate chunk (including header-only sections)
        // Calculate where the content before subsections ends
        let contentEndOffset = section.startOffset;
        
        if (section.subsections.length > 0) {
          // Content ends just before the first subsection starts (inclusive of whitespace)
          contentEndOffset = section.subsections[0].startOffset - 1;
        } else {
          // If no subsections, use the section's end offset
          contentEndOffset = section.endOffset;
        }
        
        // Always create a chunk for sections with titles to ensure complete coverage
        if (section.title && documentText) {
          // Extract the exact text from the document
          const chunkText = documentText.substring(section.startOffset, contentEndOffset);
          if (chunkText.trim()) {
            const introChunk = this.createChunkFromContent(
              chunkText,
              section.startOffset,
              section.startLine,
              currentContext,
              'section'
            );
            chunks.push(introChunk);
          }
        } else if (section.title || contentBeforeSubsections) {
          // Fallback to reconstruction if no documentText
          const introText = headerText + contentBeforeSubsections;
          if (introText.trim()) {
            const introChunk = this.createChunkFromContent(
              introText,
              section.startOffset,
              section.startLine,
              currentContext,
              'section'
            );
            chunks.push(introChunk);
          }
        }

        // Recursively chunk subsections
        const subChunks = this.recursivelyChunkSections(
          section.subsections,
          targetWords,
          options,
          currentContext,
          documentText
        );
        chunks.push(...subChunks);
      } else {
        // Section is too large with no subsections, split by content
        const sectionChunks = this.splitLargeSection(section, targetWords, currentContext, options, documentText);
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
    options: DocumentChunkerInput,
    documentText?: string
  ): Omit<DocumentChunk, 'id'>[] {
    // If we have the document text, extract from it directly
    if (documentText) {
      return this.splitLargeSectionWithDocumentText(section, targetWords, context, options, documentText);
    }
    
    // Fallback to the old method if no document text
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
    documentText?: string
  ): Omit<DocumentChunk, 'id'> {
    // If we have the document text, extract the exact text from boundaries
    let chunkText: string;
    if (documentText) {
      chunkText = documentText.substring(section.startOffset, section.endOffset);
    } else {
      // Fallback: reconstruct just this section's text
      const header = section.title ? `${'#'.repeat(section.level)} ${section.title}\n\n` : '';
      const content = section.content.join('\n');
      chunkText = header + content;
    }
    
    return {
      text: chunkText,  // Don't trim - preserve exact text
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
      text: text,  // Don't trim - preserve exact text
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

  private splitLargeSectionWithDocumentText(
    section: MarkdownSection,
    targetWords: number,
    context: string[],
    options: DocumentChunkerInput,
    documentText: string
  ): Omit<DocumentChunk, 'id'>[] {
    const chunks: Omit<DocumentChunk, 'id'>[] = [];
    const sectionText = documentText.substring(section.startOffset, section.endOffset);
    const lines = sectionText.split('\n');
    
    let currentChunkStartOffset = section.startOffset;
    let currentChunkStartLine = section.startLine;
    let currentChunkLines: string[] = [];
    let currentWordCount = 0;
    let currentOffset = section.startOffset;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineLength = line.length + (i < lines.length - 1 ? 1 : 0); // +1 for newline except last line
      const lineWords = this.countWords(line);
      
      // Handle code blocks
      if (line.trim().startsWith('```')) {
        let codeBlockEndIndex = i;
        let codeBlockWordCount = lineWords;
        let codeBlockLength = lineLength;
        
        // Find the end of the code block
        for (let j = i + 1; j < lines.length; j++) {
          const codeLine = lines[j];
          const codeLineLength = codeLine.length + (j < lines.length - 1 ? 1 : 0);
          codeBlockWordCount += this.countWords(codeLine);
          codeBlockLength += codeLineLength;
          
          if (codeLine.trim().startsWith('```')) {
            codeBlockEndIndex = j;
            break;
          }
        }
        
        // If adding code block exceeds target and we have content, flush current chunk
        if (currentWordCount + codeBlockWordCount > targetWords && currentChunkLines.length > 0) {
          const chunkText = currentChunkLines.join('\n');
          chunks.push(this.createChunkFromContent(
            chunkText,
            currentChunkStartOffset,
            currentChunkStartLine,
            context,
            'mixed'
          ));
          
          // Start new chunk
          currentChunkStartOffset = currentOffset;
          currentChunkStartLine = section.startLine + i;
          currentChunkLines = [];
          currentWordCount = 0;
        }
        
        // Add the entire code block to current chunk
        for (let j = i; j <= codeBlockEndIndex; j++) {
          currentChunkLines.push(lines[j]);
          if (j < lines.length - 1) {
            currentOffset += lines[j].length + 1;
          } else {
            currentOffset += lines[j].length;
          }
        }
        currentWordCount += codeBlockWordCount;
        i = codeBlockEndIndex;
        continue;
      }
      
      // Regular line processing
      if (currentWordCount + lineWords > targetWords && currentChunkLines.length > 0) {
        // Flush current chunk
        const chunkText = currentChunkLines.join('\n');
        chunks.push(this.createChunkFromContent(
          chunkText,
          currentChunkStartOffset,
          currentChunkStartLine,
          context,
          'mixed'
        ));
        
        // Start new chunk at current line
        currentChunkStartOffset = currentOffset;
        currentChunkStartLine = section.startLine + i;
        currentChunkLines = [];
        currentWordCount = 0;
      }
      
      currentChunkLines.push(line);
      currentWordCount += lineWords;
      currentOffset += lineLength;
    }
    
    // Flush final chunk
    if (currentChunkLines.length > 0) {
      const chunkText = currentChunkLines.join('\n');
      chunks.push(this.createChunkFromContent(
        chunkText,
        currentChunkStartOffset,
        currentChunkStartLine,
        context,
        'mixed'
      ));
    }
    
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
      
      if (potentialChunk.length > (options.maxChunkSize || DEFAULT_MAX_CHUNK_SIZE)) {
        // Flush current chunk
        if (currentChunk.length > 0) {
          const chunkText = currentChunk.join(' ');
          // Make sure we end at a sentence boundary to avoid partial words
          const actualEndOffset = chunkStartOffset + chunkText.length;
          const { startLine, endLine } = this.getLineNumbers(text, chunkStartOffset, actualEndOffset);
          
          chunks.push({
            id: `chunk-${chunkId++}`,
            text: chunkText,
            startOffset: chunkStartOffset,
            endOffset: actualEndOffset,
            startLine,
            endLine,
            metadata: {
              type: 'mixed',
              isComplete: true,
              confidence: 0.8,
            },
          });
          
          currentChunk = [];
          // Start the next chunk where this one ended (no gap)
          chunkStartOffset = actualEndOffset; // No gap between chunks
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
      if (paragraph.trim().length >= (options.minChunkSize || DEFAULT_MIN_CHUNK_SIZE)) {
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
    const chunkSize = options.maxChunkSize || DEFAULT_MAX_CHUNK_SIZE;
    let position = 0;
    let chunkId = 0;

    while (position < text.length) {
      let end = Math.min(position + chunkSize, text.length);
      
      // If we're not at the end of the text, try to find a word boundary
      if (end < text.length) {
        // Look backwards for a space or newline
        let wordBoundary = end;
        while (wordBoundary > position + chunkSize * 0.8 && wordBoundary > position) {
          if (text[wordBoundary] === ' ' || text[wordBoundary] === '\n') {
            end = wordBoundary;
            break;
          }
          wordBoundary--;
        }
      }
      
      const chunkText = text.slice(position, end).trim();
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
      // Skip any spaces at the beginning of the next chunk
      while (position < text.length && (text[position] === ' ' || text[position] === '\n')) {
        position++;
      }
    }

    return chunks;
  }

  // Helper methods
  private splitIntoSentences(text: string): string[] {
    // Improved sentence splitting that handles common edge cases
    // First, protect common abbreviations and decimal numbers
    let protectedText = text
      .replace(/\b(Dr|Mr|Mrs|Ms|Prof|Sr|Jr)\./g, '$1<PERIOD>')
      .replace(/\b(\d+)\.(\d+)/g, '$1<PERIOD>$2') // Decimal numbers
      .replace(/\b(i\.e|e\.g|etc|vs|Inc|Ltd|Co)\./gi, '$1<PERIOD>');
    
    // Split on sentence boundaries
    const sentencePattern = /[.!?]+[\s\n]+(?=[A-Z])|[.!?]+$/g;
    const sentences: string[] = [];
    let lastIndex = 0;
    let match;
    
    while ((match = sentencePattern.exec(protectedText)) !== null) {
      const sentence = protectedText.slice(lastIndex, match.index + match[0].length).trim();
      if (sentence) {
        // Restore periods
        sentences.push(sentence.replace(/<PERIOD>/g, '.'));
      }
      lastIndex = match.index + match[0].length;
    }
    
    // Don't forget the last sentence if there's no ending punctuation
    if (lastIndex < protectedText.length) {
      const lastSentence = protectedText.slice(lastIndex).trim();
      if (lastSentence) {
        sentences.push(lastSentence.replace(/<PERIOD>/g, '.'));
      }
    }
    
    return sentences.filter(s => s.length > 0);
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
    const maxSize = options.maxChunkSize || DEFAULT_MAX_CHUNK_SIZE;
    const minSize = options.minChunkSize || DEFAULT_MIN_CHUNK_SIZE;
    
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