/**
 * Test the math location finding
 */

import { findMathLocation, normalizeMathExpression } from '../locationFinder';

describe('Math location finding', () => {
  it('should find matches in document', () => {
    const document = "The equation 2 + 2 = 4 is correct.";
    const search = "2 + 2 = 4";
    const result = findMathLocation(search, document);
    expect(result).not.toBeNull();
    expect(result?.quotedText).toContain("2 + 2 = 4");
  });
});

