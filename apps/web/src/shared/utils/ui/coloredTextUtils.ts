/**
 * Utility functions for parsing colored text and XML replacements
 */

/**
 * Unescape XML entities back to their original characters
 */
function unescapeXml(str: string): string {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/**
 * Unescapes common HTML entities
 */
export function unescapeHtml(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'") // Alternative apostrophe encoding
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/**
 * Checks if text contains XML replacement markup (escaped or unescaped)
 */
export function shouldParseXmlReplacements(text: string): boolean {
  // Simply check for the r:replace tag, escaped or not
  return text.includes("<r:replace") || text.includes("&lt;r:replace");
}

export interface XmlReplacement {
  /** The full matched string */
  original: string;
  /** The "from" text */
  from: string;
  /** The "to" text */
  to: string;
  /** Starting index in the original text */
  startIndex: number;
  /** Ending index in the original text */
  endIndex: number;
}

/**
 * Parses XML replacement markup from text
 * Handles both escaped (&lt;r:replace) and unescaped (<r:replace) formats
 * Properly unescapes XML entities in the content
 */
export function parseXmlReplacements(text: string): XmlReplacement[] {
  const replacements: XmlReplacement[] = [];

  // Pattern 1: HTML-escaped XML (when stored in HTML or database)
  const escapedPattern = /&lt;r:replace\s+from="(.*?)"\s+to="(.*?)"\/&gt;/g;

  let match: RegExpExecArray | null;
  while ((match = escapedPattern.exec(text)) !== null) {
    const [fullMatch, from, to] = match;
    replacements.push({
      original: fullMatch,
      from: unescapeXml(from),
      to: unescapeXml(to),
      startIndex: match.index,
      endIndex: match.index + fullMatch.length,
    });
  }

  // Pattern 2: Unescaped XML (when in raw text)
  const unescapedPattern = /<r:replace\s+from="(.*?)"\s+to="(.*?)"\s*\/>/g;

  while ((match = unescapedPattern.exec(text)) !== null) {
    const [fullMatch, from, to] = match;
    const matchIndex = match.index;

    // Check if this wasn't already found by the escaped pattern
    const alreadyFound = replacements.some(
      (r) => r.startIndex <= matchIndex && matchIndex < r.endIndex
    );

    if (!alreadyFound) {
      replacements.push({
        original: fullMatch,
        from: unescapeXml(from),
        to: unescapeXml(to),
        startIndex: matchIndex,
        endIndex: matchIndex + fullMatch.length,
      });
    }
  }

  // Sort by position
  replacements.sort((a, b) => a.startIndex - b.startIndex);

  return replacements;
}
