import { TextChunk } from '../TextChunk';

describe('TextChunk', () => {
  describe('initialization', () => {
    it('should create a chunk with all properties', () => {
      const metadata = { 
        section: 'introduction',
        position: { start: 0, end: 11 }
      };
      const chunk = new TextChunk('chunk1', 'Hello world', metadata);

      expect(chunk.id).toBe('chunk1');
      expect(chunk.text).toBe('Hello world');
      expect(chunk.metadata).toEqual(metadata);
    });

    it('should handle empty text', () => {
      const chunk = new TextChunk('empty', '');

      expect(chunk.text).toBe('');
      expect(chunk.metadata).toBeUndefined();
    });

    it('should handle undefined metadata', () => {
      const chunk = new TextChunk('test', 'text');

      expect(chunk.metadata).toBeUndefined();
    });
  });

  describe('text length', () => {
    it('should have correct text length', () => {
      const chunk = new TextChunk('test', 'Hello world');
      
      expect(chunk.text.length).toBe(11);
    });

    it('should handle zero length chunks', () => {
      const chunk = new TextChunk('test', '');
      
      expect(chunk.text.length).toBe(0);
    });
  });

  describe('content validation', () => {
    it('should handle various text content types', () => {
      const testCases = [
        'Simple text',
        'Text with numbers: 123',
        'Text with symbols: @#$%',
        'Multi-line\ntext\ncontent',
        'Unicode text: 你好世界',
        'Mixed content: Hello 世界 123 @#$'
      ];

      testCases.forEach((text, index) => {
        const chunk = new TextChunk(`test${index}`, text, 0, text.length, {});
        expect(chunk.text).toBe(text);
        expect(chunk.length).toBe(text.length);
      });
    });
  });

  describe('metadata handling', () => {
    it('should preserve complex metadata', () => {
      const metadata = {
        section: 'methodology',
        tags: ['important', 'analysis'],
        confidence: 0.95,
        nested: {
          subsection: 'data-analysis',
          author: 'researcher'
        }
      };

      const chunk = new TextChunk('complex', 'Content', 0, 7, metadata);

      expect(chunk.metadata).toEqual(metadata);
      expect(chunk.metadata.nested.subsection).toBe('data-analysis');
    });

    it('should handle null and undefined metadata values', () => {
      const metadata = {
        nullValue: null,
        undefinedValue: undefined,
        emptyString: '',
        zeroNumber: 0,
        falseBoolean: false
      };

      const chunk = new TextChunk('mixed', 'Content', 0, 7, metadata);

      expect(chunk.metadata.nullValue).toBeNull();
      expect(chunk.metadata.undefinedValue).toBeUndefined();
      expect(chunk.metadata.emptyString).toBe('');
      expect(chunk.metadata.zeroNumber).toBe(0);
      expect(chunk.metadata.falseBoolean).toBe(false);
    });
  });

  describe('immutability', () => {
    it('should not allow modification of core properties', () => {
      const chunk = new TextChunk('test', 'Original text', 0, 13, {});

      // These should not affect the chunk (if properties are readonly)
      expect(() => {
        (chunk as any).id = 'modified';
      }).toThrow();
    });

    it('should allow metadata to be modified by reference', () => {
      const metadata = { count: 1 };
      const chunk = new TextChunk('test', 'Text', 0, 4, metadata);

      // Modifying the original metadata object should affect the chunk
      metadata.count = 2;
      expect(chunk.metadata.count).toBe(2);
    });
  });
});