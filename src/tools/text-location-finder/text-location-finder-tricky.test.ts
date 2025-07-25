import { describe, it, expect } from '@jest/globals';
import { exactSearch } from './exactSearch';
import { uFuzzySearch } from './uFuzzySearch';
import { llmSearch } from './llmSearch';

interface TrickyTestCase {
  name: string;
  document: string;
  query: string;
  expectedStart: number;
  expectedEnd: number;
  expectedText: string;
  searchesThatShouldPass: ('exact' | 'ufuzzy' | 'llm')[];
  note?: string;
}

describe('Text Location Finder - Tricky Cases', () => {
  describe('Punctuation and special characters', () => {
    it('should handle ellipsis variations', () => {
      const doc = 'The journey continues... but where will it lead?';
      const query = 'continues...';
      
      const exactResult = exactSearch(query, doc);
      expect(exactResult).toBeTruthy();
      expect(exactResult?.startOffset).toBe(12);
      expect(exactResult?.endOffset).toBe(24);
      
      const fuzzyResult = uFuzzySearch(query, doc);
      expect(fuzzyResult).toBeTruthy();
      // Note: uFuzzy might not include all dots
      
      // LLM test would go here but requires async
    });

    it('should handle smart quotes vs straight quotes', () => {
      const doc = 'She said, "Hello world!" and smiled.';
      const query = 'She said, "Hello world!"';
      
      const exactResult = exactSearch(query, doc);
      expect(exactResult).toBeTruthy(); // This might pass if quotes match
      
      const fuzzyResult = uFuzzySearch(query, doc);
      expect(fuzzyResult).toBeFalsy(); // uFuzzy struggles with quote differences
    });

    it('should handle em dash vs hyphen', () => {
      const doc = 'The result—unexpected as it was—changed everything.';
      const query = 'result--unexpected';
      
      const exactResult = exactSearch(query, doc);
      expect(exactResult).toBeFalsy();
      
      const fuzzyResult = uFuzzySearch(query, doc);
      // uFuzzy might find partial match
    });
  });

  describe('Whitespace variations', () => {
    it('should handle multiple spaces collapsed', () => {
      const doc = 'The   quick    brown   fox jumps.';
      const query = 'The quick brown fox';
      
      const exactResult = exactSearch(query, doc);
      expect(exactResult).toBeFalsy();
      
      const fuzzyResult = uFuzzySearch(query, doc);
      expect(fuzzyResult).toBeTruthy(); // uFuzzy handles whitespace well
    });

    it('should handle line breaks as spaces', () => {
      const doc = 'The quick\nbrown fox\njumps over.';
      const query = 'quick brown fox jumps';
      
      const exactResult = exactSearch(query, doc);
      expect(exactResult).toBeFalsy();
      
      const fuzzyResult = uFuzzySearch(query, doc);
      expect(fuzzyResult).toBeFalsy(); // Line breaks are harder
    });

    it('should handle non-breaking spaces', () => {
      const doc = 'Price: $50\u00A0USD per unit';
      const query = 'Price: $50 USD';
      
      const exactResult = exactSearch(query, doc);
      expect(exactResult).toBeFalsy();
      
      const fuzzyResult = uFuzzySearch(query, doc);
      expect(fuzzyResult).toBeTruthy(); // uFuzzy normalizes spaces
    });
  });

  describe('Case variations', () => {
    it('should handle Title Case vs lowercase', () => {
      const doc = 'The United States Of America Is A Country.';
      const query = 'united states of america';
      
      const exactResult = exactSearch(query, doc);
      expect(exactResult).toBeFalsy();
      
      const fuzzyResult = uFuzzySearch(query, doc);
      expect(fuzzyResult).toBeTruthy();
      expect(fuzzyResult?.startOffset).toBe(4);
      expect(fuzzyResult?.endOffset).toBe(28);
    });

    it('should handle camelCase matching', () => {
      const doc = 'Use the getElementById method to find elements.';
      const query = 'getelementbyid';
      
      const exactResult = exactSearch(query, doc);
      expect(exactResult).toBeFalsy();
      
      const fuzzyResult = uFuzzySearch(query, doc);
      expect(fuzzyResult).toBeTruthy();
      expect(fuzzyResult?.quotedText).toBe('getElementById');
    });
  });

  describe('Typos and near matches', () => {
    it('should handle common misspellings', () => {
      const doc = 'It is definitely the right answer.';
      const query = 'definately';
      
      const exactResult = exactSearch(query, doc);
      expect(exactResult).toBeFalsy();
      
      const fuzzyResult = uFuzzySearch(query, doc);
      expect(fuzzyResult).toBeTruthy();
      expect(fuzzyResult?.quotedText).toBe('definitely');
    });

    it('should handle transposed words', () => {
      const doc = 'The brown quick fox jumped.';
      const query = 'quick brown fox';
      
      const exactResult = exactSearch(query, doc);
      expect(exactResult).toBeFalsy();
      
      const fuzzyResult = uFuzzySearch(query, doc);
      expect(fuzzyResult).toBeFalsy(); // Word order matters for uFuzzy
    });

    it('should handle missing word in middle', () => {
      const doc = 'The quick and agile brown fox jumps.';
      const query = 'The quick brown fox';
      
      const exactResult = exactSearch(query, doc);
      expect(exactResult).toBeFalsy();
      
      const fuzzyResult = uFuzzySearch(query, doc);
      expect(fuzzyResult).toBeTruthy(); // uFuzzy can skip words
    });
  });

  describe('Unicode and special characters', () => {
    it('should handle emoji in text', () => {
      const doc = 'I love 🍕 pizza and 🍔 burgers!';
      const query = 'love 🍕 pizza';
      
      const exactResult = exactSearch(query, doc);
      expect(exactResult).toBeTruthy();
      // Note: emoji might affect character counting
      
      const fuzzyResult = uFuzzySearch(query, doc);
      expect(fuzzyResult).toBeTruthy();
    });

    it('should handle accented characters', () => {
      const doc = 'The café serves excellent crème brûlée.';
      const query = 'cafe serves excellent creme brulee';
      
      const exactResult = exactSearch(query, doc);
      expect(exactResult).toBeFalsy();
      
      const fuzzyResult = uFuzzySearch(query, doc);
      expect(fuzzyResult).toBeFalsy(); // Accents are challenging
    });

    it('should handle mathematical symbols', () => {
      const doc = 'The formula is: x² + y² = r²';
      const query = 'x^2 + y^2 = r^2';
      
      const exactResult = exactSearch(query, doc);
      expect(exactResult).toBeFalsy();
      
      const fuzzyResult = uFuzzySearch(query, doc);
      expect(fuzzyResult).toBeFalsy();
    });
  });

  describe('Partial matches and boundaries', () => {
    it('should match word boundaries correctly', () => {
      const doc = 'The bicycle shop sells bicycles and tricycles.';
      const query = 'bicycle';
      
      const exactResult = exactSearch(query, doc);
      expect(exactResult).toBeTruthy();
      expect(exactResult?.startOffset).toBe(4);
      expect(exactResult?.endOffset).toBe(11);
      expect(exactResult?.quotedText).toBe('bicycle');
    });

    it('should handle hyphenated word variations', () => {
      const doc = 'This is a state-of-the-art solution.';
      const query = 'state of the art';
      
      const exactResult = exactSearch(query, doc);
      expect(exactResult).toBeFalsy();
      
      const fuzzyResult = uFuzzySearch(query, doc);
      // Might find partial match
    });

    it('should handle contractions expanded', () => {
      const doc = "Don't forget that it's important.";
      const query = 'Do not forget that it is';
      
      const exactResult = exactSearch(query, doc);
      expect(exactResult).toBeFalsy();
      
      const fuzzyResult = uFuzzySearch(query, doc);
      expect(fuzzyResult).toBeFalsy();
    });
  });

  describe('HTML/Markdown artifacts', () => {
    it('should handle HTML entities', () => {
      const doc = 'The price is &lt; $100 &amp; includes shipping.';
      const query = 'price is < $100 & includes';
      
      const exactResult = exactSearch(query, doc);
      expect(exactResult).toBeFalsy();
      
      const fuzzyResult = uFuzzySearch(query, doc);
      expect(fuzzyResult).toBeFalsy();
    });

    it('should handle Markdown emphasis markers', () => {
      const doc = 'This is *very* important and **critical**.';
      const query = 'very important and critical';
      
      const exactResult = exactSearch(query, doc);
      expect(exactResult).toBeFalsy();
      
      const fuzzyResult = uFuzzySearch(query, doc);
      // Might find partial matches
    });
  });

  describe('Number formats', () => {
    it('should handle numbers with commas', () => {
      const doc = 'The population is 1,234,567 people.';
      const query = 'population is 1234567';
      
      const exactResult = exactSearch(query, doc);
      expect(exactResult).toBeFalsy();
      
      const fuzzyResult = uFuzzySearch(query, doc);
      expect(fuzzyResult).toBeFalsy();
    });

    it('should handle scientific notation', () => {
      const doc = 'The distance is 3.84e8 meters to the moon.';
      const query = 'distance is 384000000 meters';
      
      const exactResult = exactSearch(query, doc);
      expect(exactResult).toBeFalsy();
      
      const fuzzyResult = uFuzzySearch(query, doc);
      expect(fuzzyResult).toBeFalsy();
    });
  });

  describe('Edge cases', () => {
    it('should find text at document start', () => {
      const doc = 'Beginning of the document here.';
      const query = 'Beginning';
      
      const exactResult = exactSearch(query, doc);
      expect(exactResult).toBeTruthy();
      expect(exactResult?.startOffset).toBe(0);
      expect(exactResult?.endOffset).toBe(9);
    });

    it('should find text at document end', () => {
      const doc = 'This is the document end.';
      const query = 'end.';
      
      const exactResult = exactSearch(query, doc);
      expect(exactResult).toBeTruthy();
      expect(exactResult?.startOffset).toBe(21);
      expect(exactResult?.endOffset).toBe(25);
      
      const fuzzyResult = uFuzzySearch(query, doc);
      expect(fuzzyResult).toBeTruthy();
      // Note: might be off by one due to period handling
    });

    it('should find correct occurrence among similar passages', () => {
      const doc = 'The cat sat on the mat. The cat sat on the chair. The cat sat on the floor.';
      const query = 'cat sat on the chair';
      
      const exactResult = exactSearch(query, doc);
      expect(exactResult).toBeTruthy();
      expect(exactResult?.startOffset).toBe(28);
      expect(exactResult?.endOffset).toBe(48);
    });

    it('should handle nested parentheses', () => {
      const doc = 'The function (calculate(x, y) + adjust(z)) returns a value.';
      const query = 'function (calculate(x, y)';
      
      const exactResult = exactSearch(query, doc);
      expect(exactResult).toBeTruthy();
      expect(exactResult?.startOffset).toBe(4);
      expect(exactResult?.endOffset).toBe(29);
    });
  });

  describe('Really challenging cases', () => {
    it('should handle OCR-style errors', () => {
      const doc = 'The rn0dern c0mputer is p0werfu1.';
      const query = 'The modern computer is powerful';
      
      const exactResult = exactSearch(query, doc);
      expect(exactResult).toBeFalsy();
      
      const fuzzyResult = uFuzzySearch(query, doc);
      expect(fuzzyResult).toBeFalsy(); // Too many differences
    });

    it('should handle homophone substitution', () => {
      const doc = 'Their going to there house over they\'re.';
      const query = "They're going to their house over there";
      
      const exactResult = exactSearch(query, doc);
      expect(exactResult).toBeFalsy();
      
      const fuzzyResult = uFuzzySearch(query, doc);
      expect(fuzzyResult).toBeFalsy();
    });

    it('should handle British vs American spelling', () => {
      const doc = 'The colour of the aluminium centre is grey.';
      const query = 'color of the aluminum center is gray';
      
      const exactResult = exactSearch(query, doc);
      expect(exactResult).toBeFalsy();
      
      const fuzzyResult = uFuzzySearch(query, doc);
      expect(fuzzyResult).toBeFalsy();
    });

    it('should handle line-wrapped URLs', () => {
      const doc = 'Visit https://example.\ncom/path/to/page for more info.';
      const query = 'https://example.com/path/to/page';
      
      const exactResult = exactSearch(query, doc);
      expect(exactResult).toBeFalsy();
      
      const fuzzyResult = uFuzzySearch(query, doc);
      expect(fuzzyResult).toBeFalsy();
    });

    it('should handle Roman numerals vs numbers', () => {
      const doc = 'Chapter III discusses the topic in detail.';
      const query = 'Chapter 3 discusses';
      
      const exactResult = exactSearch(query, doc);
      expect(exactResult).toBeFalsy();
      
      const fuzzyResult = uFuzzySearch(query, doc);
      expect(fuzzyResult).toBeFalsy();
    });

    it('should handle fraction variations', () => {
      const doc = 'Add ½ cup of sugar.';
      const query = 'Add 1/2 cup';
      
      const exactResult = exactSearch(query, doc);
      expect(exactResult).toBeFalsy();
      
      const fuzzyResult = uFuzzySearch(query, doc);
      expect(fuzzyResult).toBeFalsy();
    });

    it('should handle ligatures', () => {
      const doc = 'The ﬁnal ﬂight was efﬁcient.';
      const query = 'The final flight was efficient';
      
      const exactResult = exactSearch(query, doc);
      expect(exactResult).toBeFalsy();
      
      const fuzzyResult = uFuzzySearch(query, doc);
      expect(fuzzyResult).toBeFalsy();
    });
  });
});

// Separate describe block for async LLM tests
describe('Text Location Finder - LLM Tricky Cases', () => {
  // Skip these tests by default as they require API calls
  describe.skip('LLM search for challenging cases', () => {
    it('should handle smart quotes with LLM', async () => {
      const doc = 'She said, "Hello world!" and smiled.';
      const query = 'She said, "Hello world!"';
      
      const result = await llmSearch(query, doc);
      expect(result).toBeTruthy();
      expect(result?.startOffset).toBe(0);
      expect(result?.endOffset).toBe(24);
    });

    it('should handle em dash with LLM', async () => {
      const doc = 'The result—unexpected as it was—changed everything.';
      const query = 'result--unexpected';
      
      const result = await llmSearch(query, doc);
      expect(result).toBeTruthy();
      expect(result?.quotedText).toContain('result');
      expect(result?.quotedText).toContain('unexpected');
    });

    it('should handle paraphrasing with LLM', async () => {
      const doc = 'The rapid brown fox leaps across the sleepy hound.';
      const query = 'quick fox jumps over dog';
      
      const result = await llmSearch(query, doc);
      expect(result).toBeTruthy();
      expect(result?.quotedText).toContain('fox');
    });

    it('should handle abbreviations with LLM', async () => {
      const doc = 'Dr. Smith works at MIT.';
      const query = 'Doctor Smith works at Massachusetts Institute of Technology';
      
      const result = await llmSearch(query, doc);
      expect(result).toBeTruthy();
      expect(result?.quotedText).toBe('Dr. Smith works at MIT');
    });
  });
});