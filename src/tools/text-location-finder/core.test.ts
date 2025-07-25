import { describe, it, expect } from '@jest/globals';
import { 
  findTextLocation, 
  getLineNumberAtPosition, 
  getLineAtPosition
} from './core';

describe('Text Location Finder Core', () => {
  describe('findTextLocation', () => {
    describe('exact matching', () => {
      it('should find exact text matches', () => {
        const doc = 'This is a test document with some text.';
        const result = findTextLocation('test document', doc);
        
        expect(result).toBeTruthy();
        expect(result?.startOffset).toBe(10);
        expect(result?.endOffset).toBe(23);
        expect(result?.quotedText).toBe('test document');
        expect(result?.strategy).toBe('exact');
        expect(result?.confidence).toBe(1.0);
      });

      it('should return null for non-existent text', () => {
        const doc = 'This is a test document.';
        const result = findTextLocation('missing text', doc);
        
        expect(result).toBeNull();
      });
    });

    describe('quote normalization - critical bug fix', () => {
      it('should preserve correct offsets when normalizing quotes', () => {
        const doc = "The user's data wasn't saved properly.";
        const search = "The user's data wasn't saved properly.";
        
        const result = findTextLocation(search, doc, { normalizeQuotes: true });
        
        expect(result).toBeTruthy();
        expect(result?.startOffset).toBe(0);
        expect(result?.endOffset).toBe(38);
        expect(result?.quotedText).toBe("The user's data wasn't saved properly.");
        expect(result?.strategy).toBe('quotes-normalized');
        
        // Verify the matched text at the returned offsets is correct
        if (result) {
          const extracted = doc.substring(result.startOffset, result.endOffset);
          expect(extracted).toBe("The user's data wasn't saved properly.");
        }
      });

      it('should handle mixed quote types with correct offsets', () => {
        const doc = `He said "I can't believe it's working!"`;
        const search = `He said "I can't believe it's working!"`;
        
        const result = findTextLocation(search, doc, { normalizeQuotes: true });
        
        expect(result).toBeTruthy();
        expect(result?.startOffset).toBe(0);
        expect(result?.endOffset).toBe(39);
        
        // Critical test: verify the actual text at these offsets
        if (result) {
          const extracted = doc.substring(result.startOffset, result.endOffset);
          expect(extracted).toBe(doc);
        }
      });

      it('should find text with quotes in middle of document', () => {
        const doc = `Start text. The user's comment wasn't clear. End text.`;
        const search = `The user's comment wasn't clear`;
        
        const result = findTextLocation(search, doc, { normalizeQuotes: true });
        
        expect(result).toBeTruthy();
        expect(result?.startOffset).toBe(12);
        expect(result?.endOffset).toBe(43);
        
        // Verify offset correctness
        if (result) {
          const extracted = doc.substring(result.startOffset, result.endOffset);
          expect(extracted).toBe(`The user's comment wasn't clear`);
        }
      });

      it('should handle documents with multiple quote variations', () => {
        const doc = 'First "quote". Second 'quote'. Third "quote".';
        const search = 'Second 'quote'';
        
        const result = findTextLocation(search, doc, { normalizeQuotes: true });
        
        expect(result).toBeTruthy();
        expect(result?.quotedText).toBe('Second 'quote'');
        expect(result?.startOffset).toBe(15);
        expect(result?.endOffset).toBe(29);
      });

      it('should not normalize quotes when option is false', () => {
        const doc = "Text with 'smart quotes'";
        const search = "Text with 'regular quotes'";
        
        const result = findTextLocation(search, doc, { normalizeQuotes: false });
        
        expect(result).toBeNull();
      });
    });

    describe('partial matching', () => {
      it('should find partial matches for long text', () => {
        const doc = 'This is a very long piece of text that continues for a while and has more content after.';
        const search = 'This is a very long piece of text that continues for a while and then differs from the original';
        
        const result = findTextLocation(search, doc, { partialMatch: true });
        
        expect(result).toBeTruthy();
        expect(result?.strategy).toBe('partial');
        expect(result?.confidence).toBe(0.7);
        expect(result?.startOffset).toBe(0);
        // Partial match should stop at a reasonable point
        expect(result?.endOffset).toBeGreaterThan(50);
      });

      it('should not use partial match for short text', () => {
        const doc = 'Short text here.';
        const search = 'Short text that does not match';
        
        const result = findTextLocation(search, doc, { partialMatch: true });
        
        expect(result).toBeNull();
      });

      it('should require minimum length for partial matching', () => {
        const doc = 'Document with some content.';
        const search = 'Document with different ending that is long enough'; // 51 chars
        
        const result = findTextLocation(search, doc, { partialMatch: true });
        
        expect(result).toBeTruthy();
        expect(result?.strategy).toBe('partial');
      });
    });

    describe('edge cases', () => {
      it('should handle empty strings', () => {
        expect(findTextLocation('', 'document')).toBeNull();
        expect(findTextLocation('text', '')).toBeNull();
        expect(findTextLocation('', '')).toBeNull();
      });

      it('should handle null/undefined gracefully', () => {
        expect(findTextLocation(null as any, 'doc')).toBeNull();
        expect(findTextLocation('text', null as any)).toBeNull();
      });

      it('should find text at document boundaries', () => {
        const doc = 'Start middle end';
        
        const startResult = findTextLocation('Start', doc);
        expect(startResult?.startOffset).toBe(0);
        expect(startResult?.endOffset).toBe(5);
        
        const endResult = findTextLocation('end', doc);
        expect(endResult?.startOffset).toBe(13);
        expect(endResult?.endOffset).toBe(16);
      });

      it('should handle special characters', () => {
        const doc = 'Math: 2+2=4, also 3*3=9!';
        const result = findTextLocation('2+2=4', doc);
        
        expect(result).toBeTruthy();
        expect(result?.quotedText).toBe('2+2=4');
      });

      it('should handle unicode correctly', () => {
        const doc = 'Text with émojis 🚀 and spëcial chars';
        const result = findTextLocation('émojis 🚀', doc);
        
        expect(result).toBeTruthy();
        expect(result?.quotedText).toBe('émojis 🚀');
      });
    });
  });

  describe('getLineNumberAtPosition', () => {
    it('should return correct line numbers', () => {
      const doc = 'Line 1\nLine 2\nLine 3';
      
      expect(getLineNumberAtPosition(doc, 0)).toBe(1);
      expect(getLineNumberAtPosition(doc, 7)).toBe(2);
      expect(getLineNumberAtPosition(doc, 14)).toBe(3);
    });

    it('should handle empty lines', () => {
      const doc = 'Line 1\n\nLine 3';
      
      expect(getLineNumberAtPosition(doc, 7)).toBe(2);
      expect(getLineNumberAtPosition(doc, 8)).toBe(3);
    });
  });

  describe('getLineAtPosition', () => {
    it('should return correct line text', () => {
      const doc = 'First line\nSecond line\nThird line';
      
      expect(getLineAtPosition(doc, 0)).toBe('First line');
      expect(getLineAtPosition(doc, 12)).toBe('Second line');
      expect(getLineAtPosition(doc, 25)).toBe('Third line');
    });

    it('should handle positions at line boundaries', () => {
      const doc = 'Line 1\nLine 2';
      
      expect(getLineAtPosition(doc, 6)).toBe('Line 1');
      expect(getLineAtPosition(doc, 7)).toBe('Line 2');
    });
  });

  describe('real-world spelling error scenarios', () => {
    it('should find spelling errors with exact text', () => {
      const doc = 'The document contians several spelling errors.';
      const search = 'contians';
      
      const result = findTextLocation(search, doc);
      
      expect(result).toBeTruthy();
      expect(result?.startOffset).toBe(13);
      expect(result?.endOffset).toBe(21);
    });

    it('should find errors with apostrophe variations', () => {
      const doc = "The user's request wasn't processed.";
      const searches = [
        "user's request wasn't",
        "user's request wasn't",
        "user's request wasn't"
      ];
      
      for (const search of searches) {
        const result = findTextLocation(search, doc, { normalizeQuotes: true });
        expect(result).toBeTruthy();
        expect(result?.startOffset).toBe(4);
        expect(result?.endOffset).toBe(25);
      }
    });

    it('should find complex math expressions', () => {
      const doc = 'The equation E=mc² shows the relationship.';
      const search = 'E=mc²';
      
      const result = findTextLocation(search, doc);
      
      expect(result).toBeTruthy();
      expect(result?.quotedText).toBe('E=mc²');
    });

    it('should find forecast text with dates', () => {
      const doc = 'We predict that by 2030, AI will be mainstream.';
      const search = 'by 2030, AI will be mainstream';
      
      const result = findTextLocation(search, doc);
      
      expect(result).toBeTruthy();
      expect(result?.startOffset).toBe(16);
    });
  });
});