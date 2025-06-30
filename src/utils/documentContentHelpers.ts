import type { Document } from "../types/documents";
import type { DocumentWithVersions } from "../types/documentWithVersions";
import { hasVersions, getMarkdownPrepend } from "../types/documentWithVersions";
import { generateMarkdownPrepend, countPrependLines, getPrependLength } from "./documentMetadata";
import { logger } from "@/lib/logger";

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
    // Check if document has stored prepend
    const storedPrepend = getMarkdownPrepend(document);
    
    if (storedPrepend) {
      prepend = storedPrepend;
    } else if (generateIfMissing) {
      // Generate prepend for backward compatibility
      prepend = generateMarkdownPrepend({
        title: document.title,
        author: document.author || undefined,
        platforms: 'platforms' in document ? (document as DocumentWithVersions & { platforms?: string[] }).platforms : undefined,
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
    logger.error("Error getting document prepend", {
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

