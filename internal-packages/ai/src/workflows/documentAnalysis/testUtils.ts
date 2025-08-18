import type { Document } from "../../types/documentSchema";
import { generateMarkdownPrepend, countPrependLines } from '../../../../domain/src/utils/documentMetadata';

/**
 * Creates a test document with optional markdown prepend
 */
export function createTestDocument(
  content: string,
  options: {
    includePrepend?: boolean;
    title?: string;
    author?: string;
    platforms?: string[];
    publishedDate?: string;
    id?: string;
  } = {}
): Document {
  const doc: Document = {
    id: options.id || "test-doc-1",
    slug: "test-doc",
    title: options.title || "Test Document",
    content,
    author: options.author || "Test Author",
    publishedDate: options.publishedDate || "2024-01-01",
    reviews: [],
    intendedAgents: [],
  };

  // Create extended document type if needed
  let extendedDoc: Document & { platforms?: string[]; versions?: Array<{ markdownPrepend: string }> } = doc;

  // Add platforms if provided
  if (options.platforms) {
    extendedDoc.platforms = options.platforms;
  }

  // Add markdownPrepend if requested
  if (options.includePrepend) {
    const prepend = generateMarkdownPrepend({
      title: doc.title,
      author: doc.author,
      platforms: options.platforms,
      publishedDate: doc.publishedDate
    });
    
    // Add prepend to the actual content
    extendedDoc.content = prepend + content;
    
    extendedDoc.versions = [{
      markdownPrepend: prepend
    }];
  }

  return extendedDoc;
}

/**
 * Adjusts line references to account for prepended content
 * e.g., "Line 1" becomes "Line 11" if prepend adds 10 lines
 */
export function adjustLineReference(lineRef: string, prependLineCount: number): string {
  // Match patterns like "Line 1" or "Lines 1-5"
  const singleLineMatch = lineRef.match(/^Line (\d+)$/);
  if (singleLineMatch) {
    const originalLine = parseInt(singleLineMatch[1]);
    const adjustedLine = originalLine + prependLineCount;
    return `Line ${adjustedLine}`;
  }

  const rangeMatch = lineRef.match(/^Lines (\d+)-(\d+)$/);
  if (rangeMatch) {
    const startLine = parseInt(rangeMatch[1]);
    const endLine = parseInt(rangeMatch[2]);
    const adjustedStart = startLine + prependLineCount;
    const adjustedEnd = endLine + prependLineCount;
    return `Lines ${adjustedStart}-${adjustedEnd}`;
  }

  // Return unchanged if pattern doesn't match
  return lineRef;
}

/**
 * Adjusts an array of line references
 */
export function adjustLineReferences(lineRefs: string[], prependLineCount: number): string[] {
  return lineRefs.map(ref => adjustLineReference(ref, prependLineCount));
}

/**
 * Gets the number of lines that would be added by prepend for a document
 */
export function getPrependLineCount(doc: Document): number {
  const extendedDoc = doc as Document & { platforms?: string[]; versions?: Array<{ markdownPrepend?: string }> };
  const prepend = extendedDoc.versions?.[0]?.markdownPrepend;
  if (prepend) {
    return countPrependLines(prepend);
  }
  
  // Generate prepend to count lines
  const generatedPrepend = generateMarkdownPrepend({
    title: doc.title,
    author: doc.author,
    platforms: extendedDoc.platforms,
    publishedDate: doc.publishedDate
  });
  
  return countPrependLines(generatedPrepend);
}

