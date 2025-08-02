import type { Document } from "../types/documents";

/**
 * Options for getting document content
 */
export interface DocumentContentOptions {
  /** Whether to include markdownPrepend. Default: true */
  includePrepend?: boolean;
  /** Whether to generate prepend if not stored. Default: true */
  generateIfMissing?: boolean;
}

/**
 * Result of getting document content with metadata
 */
export interface DocumentContentResult {
  /** The full content (with or without prepend based on options) */
  content: string;
  /** The prepend that was used (if any) */
  prepend: string | null;
  /** Number of lines in the prepend */
  prependLineCount: number;
  /** Character length of the prepend */
  prependCharCount: number;
  /** Whether prepend was generated vs stored */
  prependWasGenerated: boolean;
}

/**
 * Generate markdown prepend for document metadata
 */
function generateMarkdownPrepend(metadata: {
  title?: string;
  author?: string;
  platforms?: string[];
  publishedDate?: string;
}): string {
  const lines: string[] = [];
  
  if (metadata.title) {
    lines.push(`# ${metadata.title}`);
  }
  
  if (metadata.author) {
    lines.push(`**Author:** ${metadata.author}`);
  }
  
  if (metadata.platforms && metadata.platforms.length > 0) {
    lines.push(`**Platform:** ${metadata.platforms.join(', ')}`);
  }
  
  if (metadata.publishedDate) {
    lines.push(`**Published:** ${metadata.publishedDate}`);
  }
  
  if (lines.length > 0) {
    lines.push(''); // Empty line separator
  }
  
  return lines.join('\n');
}

/**
 * Count lines in prepend text
 */
function countPrependLines(prepend: string): number {
  return prepend.split('\n').length;
}

/**
 * Get character length of prepend
 */
function getPrependLength(prepend: string): number {
  return prepend.length;
}

/**
 * Get the full content of a document with optional markdownPrepend
 * This is the single source of truth for document content in analysis workflows
 */
export function getDocumentFullContent(
  document: Document,
  options: DocumentContentOptions = {}
): DocumentContentResult {
  const { 
    includePrepend = true, 
    generateIfMissing = true 
  } = options;

  // If we don't want prepend, return just the content
  if (!includePrepend) {
    return {
      content: document.content,
      prepend: null,
      prependLineCount: 0,
      prependCharCount: 0,
      prependWasGenerated: false
    };
  }

  let prepend: string | null = null;
  let prependWasGenerated = false;

  try {
    if (generateIfMissing) {
      // Generate prepend for backward compatibility
      prepend = generateMarkdownPrepend({
        title: document.title,
        author: document.author || undefined,
        platforms: document.platforms,
        publishedDate: document.publishedDate || undefined
      });
      prependWasGenerated = true;
    }

    if (prepend) {
      return {
        content: prepend + document.content,
        prepend,
        prependLineCount: countPrependLines(prepend),
        prependCharCount: getPrependLength(prepend),
        prependWasGenerated
      };
    }
  } catch (error) {
    // Log error but don't fail - return content without prepend
    console.error("Error getting document prepend", {
      documentId: document.id,
      error: error instanceof Error ? error.message : String(error)
    });
  }

  // Fallback: return just the content
  return {
    content: document.content,
    prepend: null,
    prependLineCount: 0,
    prependCharCount: 0,
    prependWasGenerated: false
  };
}