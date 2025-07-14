/**
 * Domain objects for document-related concepts
 */

/**
 * Document conventions detected in the text
 */
export class DocumentConventions {
  constructor(
    public readonly language: 'US' | 'UK' | 'mixed' | 'unknown',
    public readonly documentType: 'academic' | 'blog' | 'technical' | 'casual' | 'unknown',
    public readonly formality: 'formal' | 'informal' | 'mixed'
  ) {
    Object.freeze(this);
  }

  /**
   * Check if document uses US English conventions
   */
  isUSEnglish(): boolean {
    return this.language === 'US';
  }

  /**
   * Check if document uses UK English conventions
   */
  isUKEnglish(): boolean {
    return this.language === 'UK';
  }

  /**
   * Check if document has mixed conventions (potential issue)
   */
  hasMixedConventions(): boolean {
    return this.language === 'mixed';
  }
}

/**
 * A chunk of document content with line information
 */
export class DocumentChunk {
  constructor(
    public readonly content: string,
    public readonly startLineNumber: number,
    public readonly lines: readonly string[]
  ) {
    Object.freeze(this);
    Object.freeze(this.lines);
  }

  /**
   * Get the ending line number
   */
  get endLineNumber(): number {
    return this.startLineNumber + this.lines.length - 1;
  }

  /**
   * Get character count
   */
  get characterCount(): number {
    return this.content.length;
  }

  /**
   * Get a preview of the chunk content
   */
  getPreview(maxLength: number = 100): string {
    const preview = this.content.substring(0, maxLength).replace(/\n/g, ' ');
    return this.content.length > maxLength ? preview + '...' : preview;
  }

  /**
   * Get content with line numbers for LLM processing
   */
  getNumberedContent(): string {
    return this.lines
      .map((line, index) => `Line ${this.startLineNumber + index}: ${line}`)
      .join('\n');
  }
}

/**
 * Text location within a document
 */
export class TextLocation {
  constructor(
    public readonly startOffset: number,
    public readonly endOffset: number,
    public readonly lineStart: number,
    public readonly lineEnd: number
  ) {
    Object.freeze(this);
  }

  /**
   * Check if this location overlaps with another
   */
  overlaps(other: TextLocation): boolean {
    return (
      this.startOffset < other.endOffset &&
      this.endOffset > other.startOffset
    );
  }
}

/**
 * Analysis context for a document
 */
export class AnalysisContext {
  constructor(
    public readonly agentName: string,
    public readonly primaryInstructions: string,
    public readonly conventions: DocumentConventions
  ) {
    Object.freeze(this);
  }
}