import type { Document } from "./documents";

/**
 * Document version information including optional markdownPrepend
 */
export interface DocumentVersion {
  id: string;
  version: number;
  markdownPrepend?: string;
  createdAt: Date;
}

/**
 * Extended Document type that includes version information
 * Used in document analysis workflows where we need access to markdownPrepend
 */
export interface DocumentWithVersions extends Document {
  versions?: DocumentVersion[];
}

/**
 * Type guard to check if a document has versions
 */
export function hasVersions(doc: Document): doc is DocumentWithVersions {
  return 'versions' in doc && Array.isArray((doc as { versions?: unknown }).versions);
}

/**
 * Get markdownPrepend from a document if it exists
 */
export function getMarkdownPrepend(doc: Document): string | undefined {
  if (!hasVersions(doc)) return undefined;
  const versions = (doc as DocumentWithVersions).versions;
  return versions?.[0]?.markdownPrepend;
}