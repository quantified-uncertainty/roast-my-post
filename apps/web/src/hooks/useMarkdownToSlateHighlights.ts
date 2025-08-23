import { useMemo } from "react";

interface Highlight {
  startOffset: number;  // Position in markdown
  endOffset: number;    // Position in markdown
  quotedText: string;
  tag: string;
  color?: string;
}

/**
 * Maps highlights from markdown positions to Slate text positions
 * by extracting context from markdown and finding it in Slate.
 * 
 * This solves the position mismatch when markdown syntax is removed.
 */
export function useMarkdownToSlateHighlights(
  markdown: string,
  slateText: string,
  highlights: Highlight[],
  contextWindow: number = 30
) {
  return useMemo(() => {
    const mappedHighlights = [];
    const failures = [];
    
    // Track which Slate positions have been used to avoid overlaps
    const usedSlatePositions = new Set<string>();
    
    // Process all highlights (don't deduplicate by markdown position)
    for (const highlight of highlights) {
      // Extract context from the MARKDOWN using the stored positions
      const prefix = markdown.substring(
        Math.max(0, highlight.startOffset - contextWindow),
        highlight.startOffset
      );
      const suffix = markdown.substring(
        highlight.endOffset,
        Math.min(markdown.length, highlight.endOffset + contextWindow)
      );
      
      // The actual text in markdown at these positions
      const markdownText = markdown.substring(highlight.startOffset, highlight.endOffset);
      
      // Find this text in the Slate version
      const slatePosition = findTextInSlate(
        slateText,
        highlight.quotedText, // What we're looking for
        markdownText,         // What it looks like in markdown (might include syntax)
        prefix,
        suffix,
        usedSlatePositions   // Pass used positions to avoid duplicates
      );
      
      if (slatePosition) {
        const posKey = `${slatePosition.start}-${slatePosition.end}`;
        
        // Skip if this position has already been used
        if (!usedSlatePositions.has(posKey)) {
          usedSlatePositions.add(posKey);
          mappedHighlights.push({
            ...highlight,
            startOffset: slatePosition.start,
            endOffset: slatePosition.end,
            mappedFrom: 'markdown'
          });
        } else {
          failures.push({
            tag: highlight.tag,
            quotedText: highlight.quotedText,
            reason: 'Position already used by another highlight'
          });
        }
      } else {
        failures.push({
          tag: highlight.tag,
          quotedText: highlight.quotedText,
          reason: 'Could not find in Slate text'
        });
      }
    }
    
    return { mappedHighlights, failures };
  }, [markdown, slateText, highlights, contextWindow]);
}

function findTextInSlate(
  slateText: string,
  quotedText: string,
  markdownText: string,
  prefix: string,
  suffix: string,
  usedSlatePositions: Set<string>
): { start: number; end: number } | null {
  
  // Strategy 1: If markdown has link syntax [text](url), extract just the text
  const linkMatch = markdownText.match(/^\[([^\]]+)\]\([^)]+\)$/);
  const searchText = linkMatch ? linkMatch[1] : quotedText;
  
  // Find ALL occurrences of the text
  const positions = findAllOccurrences(slateText, searchText);
  
  if (positions.length === 0) {
    return null;
  }
  
  // Score each position by context similarity and whether it's already used
  const candidates: Array<{ pos: number; score: number }> = [];
  
  for (const pos of positions) {
    const endPos = pos + searchText.length;
    const posKey = `${pos}-${endPos}`;
    
    // Skip if already used
    if (usedSlatePositions.has(posKey)) {
      continue;
    }
    
    // Extract context from Slate at this position
    const slatePrefix = slateText.substring(Math.max(0, pos - 30), pos);
    const slateSuffix = slateText.substring(endPos, Math.min(slateText.length, endPos + 30));
    
    // Calculate context match score
    const prefixScore = contextSimilarity(prefix, slatePrefix);
    const suffixScore = contextSimilarity(suffix, slateSuffix);
    const totalScore = (prefixScore + suffixScore) / 2;
    
    candidates.push({ pos, score: totalScore });
  }
  
  // Sort by score (best first)
  candidates.sort((a, b) => b.score - a.score);
  
  // Use the best available match
  if (candidates.length > 0 && candidates[0].score > 0.2) {
    return { start: candidates[0].pos, end: candidates[0].pos + searchText.length };
  }
  
  // If no good context match but we have unused positions, use the first unused one
  if (candidates.length > 0) {
    return { start: candidates[0].pos, end: candidates[0].pos + searchText.length };
  }
  
  return null;
}

function findTextWithContext(
  text: string,
  searchText: string,
  prefix: string,
  suffix: string
): { start: number; end: number } | null {
  const positions = findAllOccurrences(text, searchText);
  
  for (const pos of positions) {
    const textPrefix = text.substring(Math.max(0, pos - prefix.length), pos);
    const textSuffix = text.substring(pos + searchText.length, pos + searchText.length + suffix.length);
    
    if (contextMatches(prefix, textPrefix) && contextMatches(suffix, textSuffix)) {
      return { start: pos, end: pos + searchText.length };
    }
  }
  
  // If no exact context match but only one occurrence, use it
  if (positions.length === 1) {
    return { start: positions[0], end: positions[0] + searchText.length };
  }
  
  return null;
}

function findAllOccurrences(text: string, search: string): number[] {
  const positions: number[] = [];
  let index = 0;
  
  while ((index = text.indexOf(search, index)) !== -1) {
    positions.push(index);
    index += search.length;
  }
  
  return positions;
}

function normalizeForSearch(text: string): string {
  // Normalize whitespace and remove markdown syntax for searching
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove link syntax
    .replace(/[#*`_~]/g, '')                  // Remove markdown symbols
    .replace(/\s+/g, ' ')                      // Normalize whitespace
    .toLowerCase()
    .trim();
}

function mapNormalizedToActual(text: string, normalizedPos: number): number {
  // Map a position in normalized text back to actual text position
  const normalized = normalizeForSearch(text);
  
  let actualPos = 0;
  let normPos = 0;
  
  while (normPos < normalizedPos && actualPos < text.length) {
    const actualChar = text[actualPos];
    const normChar = normalized[normPos] || '';
    
    if (normalizeForSearch(actualChar) === normChar) {
      normPos++;
    }
    actualPos++;
  }
  
  return actualPos;
}

function contextSimilarity(context1: string, context2: string): number {
  const norm1 = normalizeForSearch(context1);
  const norm2 = normalizeForSearch(context2);
  
  if (norm1 === norm2) return 1.0;
  if (!norm1 || !norm2) return 0;
  
  // Check for partial matches
  if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.8;
  
  // Calculate character-based similarity
  return calculateSimilarity(norm1, norm2);
}

function contextMatches(context1: string, context2: string, threshold: number = 0.6): boolean {
  const norm1 = normalizeForSearch(context1);
  const norm2 = normalizeForSearch(context2);
  
  if (norm1 === norm2) return true;
  
  // Check if one ends with the start of the other (partial match)
  if (norm1.endsWith(norm2.substring(0, Math.min(10, norm2.length)))) return true;
  if (norm2.endsWith(norm1.substring(0, Math.min(10, norm1.length)))) return true;
  
  // Calculate similarity
  const similarity = calculateSimilarity(norm1, norm2);
  return similarity >= threshold;
}

function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer[i] === shorter[i]) matches++;
  }
  
  return matches / longer.length;
}