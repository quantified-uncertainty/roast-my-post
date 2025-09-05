import React from "react";

/**
 * Unescape XML entities
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
 * Parse XML markup format like <r:replace from="x" to="y"/>
 */
function parseXmlMarkup(text: string): React.ReactNode {
  // Match <r:replace from="..." to="..."/>
  const replaceMatch = text.match(/<r:replace\s+from="([^"]*)"\s+to="([^"]*)"\s*\/>/);
  if (replaceMatch) {
    const [, from, to] = replaceMatch;
    const fromText = unescapeXml(from);
    const toText = unescapeXml(to);
    
    return (
      <>
        <span
          className="text-gray-500"
          style={{
            textDecoration: "line-through",
            textDecorationColor: "currentColor",
            textDecorationThickness: "2px",
          }}
        >
          {fromText}
        </span>
        <span className="text-gray-400"> → </span>
        <span className="font-semibold text-gray-900">
          {toText}
        </span>
      </>
    );
  }
  
  // Match <r:delete>...</r:delete>
  const deleteMatch = text.match(/<r:delete>(.*?)<\/r:delete>/);
  if (deleteMatch) {
    const [, content] = deleteMatch;
    return (
      <span
        className="text-gray-500"
        style={{
          textDecoration: "line-through",
          textDecorationColor: "currentColor",
          textDecorationThickness: "2px",
        }}
      >
        {unescapeXml(content)}
      </span>
    );
  }
  
  // Match <r:insert>...</r:insert>
  const insertMatch = text.match(/<r:insert>(.*?)<\/r:insert>/);
  if (insertMatch) {
    const [, content] = insertMatch;
    return (
      <span className="font-semibold text-gray-900">
        {unescapeXml(content)}
      </span>
    );
  }
  
  // If no XML pattern matched, return as is
  return text;
}

/**
 * Parses text with color markers and XML markup, returns React elements with appropriate styling
 * Supports both legacy [[red]]text[[/red]] format and new <r:replace from="x" to="y"/> format
 */
export function parseColoredText(text: string): React.ReactNode {
  // Check if this is XML format
  if (text.startsWith("<r:")) {
    return parseXmlMarkup(text);
  }
  
  // If no color markers or arrows, return plain text
  if (!text.includes("[[") && !text.includes("→")) {
    return text;
  }

  // Regular expression to match color markers and arrows
  const colorPattern = /\[\[(red|green)\]\](.*?)\[\[\/\1\]\]|→/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let key = 0;

  // Find all color markers and arrows
  while ((match = colorPattern.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    // Check if it's an arrow
    if (match[0] === "→") {
      // Style the arrow with lighter gray
      parts.push(
        <span key={`arrow-${key++}`} className="text-gray-400">
          →
        </span>
      );
    } else {
      // It's a color marker
      const color = match[1];
      const content = match[2];

      // Add styled text - strikethrough for incorrect, bold for correct
      if (color === "red") {
        // Strikethrough for incorrect/old text
        parts.push(
          <span
            key={`colored-${key++}`}
            className="text-gray-500"
            style={{
              textDecoration: "line-through",
              textDecorationColor: "currentColor",
              textDecorationThickness: "2px",
            }}
          >
            {content}
          </span>
        );
      } else {
        // Bold/emphasized for correct/new text
        parts.push(
          <span
            key={`colored-${key++}`}
            className="font-semibold text-gray-900"
          >
            {content}
          </span>
        );
      }
    }

    lastIndex = match.index + match[0].length;
  }

  // Add any remaining text after the last match
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  // If we only have one part and it's a string, return it directly
  if (parts.length === 1 && typeof parts[0] === "string") {
    return parts[0];
  }

  return <>{parts}</>;
}

/**
 * Component wrapper for colored text parsing
 */
export function ColoredText({ text }: { text: string }) {
  return <>{parseColoredText(text)}</>;
}
