import { describe, it, expect } from 'vitest';
import {
  unescapeHtml,
  shouldParseXmlReplacements,
  hasLegacyColorMarkers,
  parseXmlReplacements,
  parseLegacyColorMarkers
} from './coloredTextUtils';

describe('coloredTextUtils', () => {
  describe('unescapeHtml', () => {
    it('should unescape HTML entities', () => {
      expect(unescapeHtml('&lt;div&gt;')).toBe('<div>');
      expect(unescapeHtml('&quot;hello&quot;')).toBe('"hello"');
      expect(unescapeHtml('&#39;world&#39;')).toBe("'world'");
      expect(unescapeHtml('&#x27;test&#x27;')).toBe("'test'");
      expect(unescapeHtml('&apos;apostrophe&apos;')).toBe("'apostrophe'");
      expect(unescapeHtml('&amp;&amp;')).toBe('&&');
    });

    it('should handle mixed entities', () => {
      expect(unescapeHtml('&lt;r:replace from=&quot;test&quot; to=&quot;best&quot;/&gt;'))
        .toBe('<r:replace from="test" to="best"/>');
    });

    it('should handle text without entities', () => {
      expect(unescapeHtml('plain text')).toBe('plain text');
    });
  });

  describe('shouldParseXmlReplacements', () => {
    it('should detect unescaped XML replacements', () => {
      expect(shouldParseXmlReplacements('<r:replace from="a" to="b"/>')).toBe(true);
      expect(shouldParseXmlReplacements('prefix <r:replace from="a" to="b"/> suffix')).toBe(true);
    });

    it('should detect escaped XML replacements', () => {
      expect(shouldParseXmlReplacements('&lt;r:replace from="a" to="b"/>')).toBe(true);
      expect(shouldParseXmlReplacements('text &lt;r:replace from="x" to="y"/> more')).toBe(true);
    });

    it('should return false when no XML replacements', () => {
      expect(shouldParseXmlReplacements('plain text')).toBe(false);
      expect(shouldParseXmlReplacements('[[red]]text[[/red]]')).toBe(false);
    });
  });

  describe('hasLegacyColorMarkers', () => {
    it('should detect legacy color markers', () => {
      expect(hasLegacyColorMarkers('[[red]]text[[/red]]')).toBe(true);
      expect(hasLegacyColorMarkers('[[green]]text[[/green]]')).toBe(true);
      expect(hasLegacyColorMarkers('text → more text')).toBe(true);
    });

    it('should return false when no legacy markers', () => {
      expect(hasLegacyColorMarkers('plain text')).toBe(false);
      expect(hasLegacyColorMarkers('<r:replace from="a" to="b"/>')).toBe(false);
    });
  });

  describe('parseXmlReplacements', () => {
    it('should parse XML with Unit Separator delimiters', () => {
      const US = '\x1F';
      const text = `<r:replace from${US}incorrect${US}to${US}correct${US}/>`;
      const result = parseXmlReplacements(text);

      expect(result).toHaveLength(1);
      expect(result[0].from).toBe('incorrect');
      expect(result[0].to).toBe('correct');
    });

    it('should parse escaped XML with Unit Separator delimiters', () => {
      const US = '\x1F';
      const text = `&lt;r:replace from${US}text with "quotes"${US}to${US}fixed text${US}/&gt;`;
      const result = parseXmlReplacements(text);

      expect(result).toHaveLength(1);
      expect(result[0].from).toBe('text with "quotes"');
      expect(result[0].to).toBe('fixed text');
    });

    it('should handle apostrophes without escaping', () => {
      const US = '\x1F';
      const text = `<r:replace from${US}it's${US}to${US}its${US}/>`;
      const result = parseXmlReplacements(text);

      expect(result).toHaveLength(1);
      expect(result[0].from).toBe("it's");
      expect(result[0].to).toBe('its');
    });

    it('should handle quotes without escaping', () => {
      const US = '\x1F';
      const text = `<r:replace from${US}say "hello"${US}to${US}say "hi"${US}/>`;
      const result = parseXmlReplacements(text);

      expect(result).toHaveLength(1);
      expect(result[0].from).toBe('say "hello"');
      expect(result[0].to).toBe('say "hi"');
    });

    it('should handle complex real-world example', () => {
      const US = '\x1F';
      const text = `✏️ [Spelling] &lt;r:replace from${US}shut it all down.'''${US}to${US}shut it all down.'${US}/&gt;`;
      const result = parseXmlReplacements(text);

      expect(result).toHaveLength(1);
      expect(result[0].from).toBe("shut it all down.'''");
      expect(result[0].to).toBe("shut it all down.'");
      expect(result[0].startIndex).toBe(14); // After "✏️ [Spelling] "
    });

    it('should handle multiple replacements', () => {
      const US = '\x1F';
      const text = `First <r:replace from${US}a${US}to${US}b${US}/> and <r:replace from${US}c${US}to${US}d${US}/> end`;
      const result = parseXmlReplacements(text);

      expect(result).toHaveLength(2);
      expect(result[0].from).toBe('a');
      expect(result[0].to).toBe('b');
      expect(result[1].from).toBe('c');
      expect(result[1].to).toBe('d');
    });

    it('should handle mixed escaped and unescaped', () => {
      const US = '\x1F';
      const text = `First &lt;r:replace from${US}a${US}to${US}b${US}/&gt; then <r:replace from${US}c${US}to${US}d${US}/>`;
      const result = parseXmlReplacements(text);

      expect(result).toHaveLength(2);
      expect(result[0].from).toBe('a');
      expect(result[0].original).toBe(`&lt;r:replace from${US}a${US}to${US}b${US}/&gt;`);
      expect(result[1].from).toBe('c');
      expect(result[1].original).toBe(`<r:replace from${US}c${US}to${US}d${US}/>`);
    });
  });

  describe('parseLegacyColorMarkers', () => {
    it('should parse red color markers', () => {
      const text = '[[red]]incorrect[[/red]]';
      const result = parseLegacyColorMarkers(text);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'colored',
        color: 'red',
        content: 'incorrect',
        startIndex: 0,
        endIndex: 24
      });
    });

    it('should parse green color markers', () => {
      const text = '[[green]]correct[[/green]]';
      const result = parseLegacyColorMarkers(text);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'colored',
        color: 'green',
        content: 'correct',
        startIndex: 0,
        endIndex: 26
      });
    });

    it('should parse arrows', () => {
      const text = 'before → after';
      const result = parseLegacyColorMarkers(text);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'arrow',
        startIndex: 7,
        endIndex: 8
      });
    });

    it('should parse mixed markers', () => {
      const text = '[[red]]old[[/red]] → [[green]]new[[/green]]';
      const result = parseLegacyColorMarkers(text);

      expect(result).toHaveLength(3);
      expect(result[0].type).toBe('colored');
      expect(result[0].color).toBe('red');
      expect(result[1].type).toBe('arrow');
      expect(result[2].type).toBe('colored');
      expect(result[2].color).toBe('green');
    });
  });
});