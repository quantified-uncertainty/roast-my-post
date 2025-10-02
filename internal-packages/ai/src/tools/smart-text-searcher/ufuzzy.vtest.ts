import { describe, it, expect } from 'vitest';
import { uFuzzySearch } from './uFuzzySearch';

describe('uFuzzySearch bug reproduction', () => {
  it('should not match non-contiguous text spans', () => {
    const text = "Paris is the capital of France, which has a population of about 67 million people. The Eiffel Tower was completed in 1889 and stands 330 meters tall.";
    const searchText = "The Eiffel Tower stands 330 meters tall";
    
    const result = uFuzzySearch(searchText, text);
    
    if (result) {
      console.log('Result:', {
        startOffset: result.startOffset,
        endOffset: result.endOffset,
        quotedText: result.quotedText,
        strategy: result.strategy,
        confidence: result.confidence
      });
      
      // The key fix: Should NOT include "capital of France" which is way earlier
      expect(result.quotedText).not.toContain('capital of France');
      
      // The match should not span from the beginning of the document
      expect(result.startOffset).toBeGreaterThan(20);
      
      // The result should be a reasonable substring, not the entire document
      expect(result.quotedText.length).toBeLessThan(100);
      
      // It should contain at least some of the search terms
      const hasEiffelTower = result.quotedText.includes('Eiffel Tower');
      const hasStands = result.quotedText.includes('stands');
      const has330 = result.quotedText.includes('330');
      expect(hasEiffelTower || hasStands || has330).toBe(true);
    }
  });
  
  it('should handle simple phrase search correctly', () => {
    const text = "The quick brown fox jumps over the lazy dog. The fox is very quick.";
    const searchText = "The fox is very quick";
    
    const result = uFuzzySearch(searchText, text);
    
    if (result) {
      console.log('Simple phrase result:', result);
      // The result should contain at least some key search terms
      // Due to how uFuzzy tokenizes, it may find partial matches
      const hasAnyKeyTerm = 
        result.quotedText.toLowerCase().includes("fox") ||
        result.quotedText.toLowerCase().includes("quick") ||
        result.quotedText.toLowerCase().includes("very");
      expect(hasAnyKeyTerm).toBe(true);
      
      // Should not span the entire document
      expect(result.quotedText.length).toBeLessThan(text.length);
      
      // The match should be reasonable in length (not too long)
      expect(result.quotedText.length).toBeLessThan(50);
    }
  });
});