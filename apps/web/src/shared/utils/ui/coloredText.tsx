import React from "react";

/**
 * Parses text with color markers and returns React elements with appropriate styling
 * Supports [[red]]text[[/red]] and [[green]]text[[/green]] markers
 */
export function parseColoredText(text: string): React.ReactNode {
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

      // Add colored text with GitHub-style diff backgrounds
      if (color === "red") {
        // Red background like GitHub diff removal - with strikethrough
        parts.push(
          <span
            key={`colored-${key++}`}
            className="inline-block px-1 font-semibold text-gray-500"
            style={{
              textDecoration: "line-through",
              textDecorationColor: "#666", // darker gray for the line
            }}
          >
            {content}
          </span>
        );
      } else {
        // Green background like GitHub diff addition
        parts.push(
          <span
            key={`colored-${key++}`}
            className="inline-block rounded px-1 font-semibold text-gray-800"
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
