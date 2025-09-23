/**
 * Utility functions for parsing colored text and XML replacements
 */

/**
 * Unescapes common HTML entities
 */
export function unescapeHtml(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'") // Alternative apostrophe encoding
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/**
 * Unescapes XML entities (subset of HTML entities)
 */
export function unescapeXml(str: string): string {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/**
 * Checks if text contains XML replacement markup (escaped or unescaped)
 */
export function shouldParseXmlReplacements(text: string): boolean {
  const US = '\x1F';
  // Check for both escaped and unescaped versions, with either quotes or Unit Separator
  return text.includes('<r:replace') ||
         text.includes('&lt;r:replace') ||
         text.includes(`from${US}`) ||
         text.includes(`to${US}`);
}

/**
 * Checks if text contains legacy color markers
 */
export function hasLegacyColorMarkers(text: string): boolean {
  return text.includes('[[') || text.includes('→');
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
 * Uses ASCII Unit Separator (0x1F) as delimiter to avoid quote escaping issues
 * Handles both escaped (&lt;r:replace) and unescaped (<r:replace) formats
 */
export function parseXmlReplacements(text: string): XmlReplacement[] {
  const replacements: XmlReplacement[] = [];
  const US = '\x1F'; // ASCII Unit Separator

  // Pattern 1: HTML-escaped XML with Unit Separator
  const escapedUSPattern = new RegExp(
    `&lt;r:replace\\s+from${US}(.*?)${US}to${US}(.*?)${US}/&gt;`,
    'g'
  );

  let match;
  while ((match = escapedUSPattern.exec(text)) !== null) {
    const [fullMatch, from, to] = match;
    replacements.push({
      original: fullMatch,
      from: from, // No escaping needed with US delimiter
      to: to,
      startIndex: match.index,
      endIndex: match.index + fullMatch.length
    });
  }

  // Pattern 2: Unescaped XML with Unit Separator
  const unescapedUSPattern = new RegExp(
    `<r:replace\\s+from${US}(.*?)${US}to${US}(.*?)${US}/>`,
    'g'
  );

  while ((match = unescapedUSPattern.exec(text)) !== null) {
    const [fullMatch, from, to] = match;

    // Check if this wasn't already found
    const alreadyFound = replacements.some(r =>
      r.startIndex <= match.index && match.index < r.endIndex
    );

    if (!alreadyFound) {
      replacements.push({
        original: fullMatch,
        from: from, // No escaping needed with US delimiter
        to: to,
        startIndex: match.index,
        endIndex: match.index + fullMatch.length
      });
    }
  }

  // Sort by position
  replacements.sort((a, b) => a.startIndex - b.startIndex);

  return replacements;
}

/**
 * Parses legacy color markers from text
 * Format: [[red]]text[[/red]] or [[green]]text[[/green]]
 */
export function parseLegacyColorMarkers(text: string): Array<{
  type: 'colored' | 'arrow';
  color?: 'red' | 'green';
  content?: string;
  startIndex: number;
  endIndex: number;
}> {
  const markers: Array<{
    type: 'colored' | 'arrow';
    color?: 'red' | 'green';
    content?: string;
    startIndex: number;
    endIndex: number;
  }> = [];

  // Pattern to match color markers and arrows
  const colorPattern = /\[\[(red|green)\]\](.*?)\[\[\/\1\]\]|→/g;

  let match;
  while ((match = colorPattern.exec(text)) !== null) {
    if (match[0] === '→') {
      markers.push({
        type: 'arrow',
        startIndex: match.index,
        endIndex: match.index + 1
      });
    } else {
      markers.push({
        type: 'colored',
        color: match[1] as 'red' | 'green',
        content: match[2],
        startIndex: match.index,
        endIndex: match.index + match[0].length
      });
    }
  }

  return markers;
}