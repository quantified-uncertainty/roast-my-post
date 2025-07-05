const { checkHighlightsReady, calculateCommentPositions } = require('../commentPositioning');

describe('commentPositioning', () => {
  describe('checkHighlightsReady', () => {
    let container;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    afterEach(() => {
      document.body.removeChild(container);
    });

    test('should return true when expected count is 0', () => {
      expect(checkHighlightsReady(container, 0)).toBe(true);
    });

    test('should return false when no highlights exist', () => {
      expect(checkHighlightsReady(container, 5)).toBe(false);
    });

    test('should return true when unique tags >= half of expected count', () => {
      // Create 6 highlight elements with 5 unique tags for 10 expected comments
      container.innerHTML = `
        <span data-tag="0">Highlight 1</span>
        <span data-tag="0">Highlight 1 duplicate</span>
        <span data-tag="1">Highlight 2</span>
        <span data-tag="2">Highlight 3</span>
        <span data-tag="3">Highlight 4</span>
        <span data-tag="4">Highlight 5</span>
      `;
      
      expect(checkHighlightsReady(container, 10)).toBe(true); // 5 unique >= 5 (half of 10)
    });

    test('should return false when unique tags < half of expected count', () => {
      // Create 3 highlight elements with 3 unique tags for 10 expected comments
      container.innerHTML = `
        <span data-tag="0">Highlight 1</span>
        <span data-tag="1">Highlight 2</span>
        <span data-tag="2">Highlight 3</span>
      `;
      
      expect(checkHighlightsReady(container, 10)).toBe(false); // 3 unique < 5 (half of 10)
    });

    test('should handle duplicate tags correctly (bug scenario)', () => {
      // Create 9 highlight elements but only 6 unique tags for 11 expected comments
      // This simulates the exact bug that was reported
      container.innerHTML = `
        <span data-tag="0">Highlight 1</span>
        <span data-tag="0">Highlight 1 duplicate</span>
        <span data-tag="0">Highlight 1 duplicate 2</span>
        <span data-tag="1">Highlight 2</span>
        <span data-tag="7">Highlight 3</span>
        <span data-tag="8">Highlight 4</span>
        <span data-tag="8">Highlight 4 duplicate</span>
        <span data-tag="9">Highlight 5</span>
        <span data-tag="10">Highlight 6</span>
      `;
      
      expect(checkHighlightsReady(container, 11)).toBe(true); // 6 unique >= 6 (ceil of 11/2)
    });

    test('should handle odd expected counts correctly', () => {
      // Test ceiling behavior for odd numbers
      container.innerHTML = `
        <span data-tag="0">Highlight 1</span>
        <span data-tag="1">Highlight 2</span>
        <span data-tag="2">Highlight 3</span>
      `;
      
      expect(checkHighlightsReady(container, 5)).toBe(true); // 3 unique >= 3 (ceil of 5/2)
      expect(checkHighlightsReady(container, 7)).toBe(false); // 3 unique < 4 (ceil of 7/2)
    });

    test('should ignore elements without data-tag attribute', () => {
      container.innerHTML = `
        <span data-tag="0">Highlight 1</span>
        <span>No data-tag</span>
        <span data-tag="1">Highlight 2</span>
        <div>Other element</div>
      `;
      
      expect(checkHighlightsReady(container, 4)).toBe(true); // 2 unique >= 2 (half of 4)
    });

    test('should handle empty string tags', () => {
      container.innerHTML = `
        <span data-tag="0">Highlight 1</span>
        <span data-tag="">Empty tag</span>
        <span data-tag="1">Highlight 2</span>
      `;
      
      // Empty string is still a valid tag
      expect(checkHighlightsReady(container, 6)).toBe(true); // 3 unique >= 3 (half of 6)
    });
  });
});