import { useMemo } from 'react';

/**
 * A simple hook to map between markdown and slate text offsets
 * 
 * Phase 1: Basic implementation for simple cases (headings, paragraphs)
 * Later phases will handle more complex markdown formatting
 */
export function useHighlightMapper(markdown: string, slateText: string) {
  return useMemo(() => {
    // Simple mapping for basic cases
    const mdToSlateOffset = new Map<number, number>();
    const slateToMdOffset = new Map<number, number>();
    
    // Start with simple headers: check for heading markers at beginning
    // This handles cases like "# Heading" → "Heading"
    let mdIndex = 0;
    let slateIndex = 0;
    
    // Skip markdown formatting characters
    while (mdIndex < markdown.length && slateIndex < slateText.length) {
      const mdChar = markdown[mdIndex];
      const slateChar = slateText[slateIndex];
      
      // If characters match, map the offsets
      if (mdChar === slateChar) {
        mdToSlateOffset.set(mdIndex, slateIndex);
        slateToMdOffset.set(slateIndex, mdIndex);
        mdIndex++;
        slateIndex++;
      } else if (mdChar === '#' || mdChar === '*' || mdChar === '_' || 
                 mdChar === '[' || mdChar === ']' || mdChar === '(' || 
                 mdChar === ')' || mdChar === '\n' || mdChar === ' ') {
        // Skip markdown formatting characters in the source
        mdIndex++;
      } else {
        // Skip any extra characters in slate text
        slateIndex++;
      }
    }
    
    return {
      mdToSlateOffset,
      slateToMdOffset,
      // Return original texts for debugging
      debug: { markdown, slateText },
    };
  }, [markdown, slateText]);
}
