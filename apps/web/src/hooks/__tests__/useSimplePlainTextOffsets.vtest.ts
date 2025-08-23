import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSimplePlainTextOffsets } from '../useSimplePlainTextOffsets';
import { createEditor, Descendant, Text } from 'slate';

describe('useSimplePlainTextOffsets', () => {
  it('should calculate offsets for simple text nodes', () => {
    const editor = createEditor();
    editor.children = [
      {
        type: 'paragraph',
        children: [{ text: 'Hello world' }],
      },
    ] as Descendant[];

    const { result } = renderHook(() => useSimplePlainTextOffsets(editor));

    const offsets = result.current;
    expect(offsets.size).toBe(1);
    expect(offsets.get('0.0')).toEqual({
      start: 0,
      end: 11,
    });
  });

  it('should calculate offsets for multiple paragraphs', () => {
    const editor = createEditor();
    editor.children = [
      {
        type: 'paragraph',
        children: [{ text: 'First paragraph' }],
      },
      {
        type: 'paragraph',
        children: [{ text: 'Second paragraph' }],
      },
    ] as Descendant[];

    const { result } = renderHook(() => useSimplePlainTextOffsets(editor));

    const offsets = result.current;
    expect(offsets.size).toBe(2);
    expect(offsets.get('0.0')).toEqual({
      start: 0,
      end: 15,
    });
    expect(offsets.get('1.0')).toEqual({
      start: 15,
      end: 31,
    });
  });

  it('should handle mixed text nodes within a paragraph', () => {
    const editor = createEditor();
    editor.children = [
      {
        type: 'paragraph',
        children: [
          { text: 'Hello ' },
          { text: 'bold ', bold: true },
          { text: 'world' },
        ],
      },
    ] as Descendant[];

    const { result } = renderHook(() => useSimplePlainTextOffsets(editor));

    const offsets = result.current;
    expect(offsets.size).toBe(3);
    expect(offsets.get('0.0')).toEqual({
      start: 0,
      end: 6,
    });
    expect(offsets.get('0.1')).toEqual({
      start: 6,
      end: 11,
    });
    expect(offsets.get('0.2')).toEqual({
      start: 11,
      end: 16,
    });
  });

  it('should handle nested elements', () => {
    const editor = createEditor();
    editor.children = [
      {
        type: 'paragraph',
        children: [{ text: 'Paragraph text' }],
      },
      {
        type: 'list',
        children: [
          {
            type: 'list-item',
            children: [{ text: 'List item 1' }],
          },
          {
            type: 'list-item',
            children: [{ text: 'List item 2' }],
          },
        ],
      },
    ] as Descendant[];

    const { result } = renderHook(() => useSimplePlainTextOffsets(editor));

    const offsets = result.current;
    // Should have offsets for: paragraph text, and two list items
    expect(offsets.size).toBe(3);
    expect(offsets.get('0.0')).toEqual({
      start: 0,
      end: 14,
    });
    expect(offsets.get('1.0.0')).toEqual({
      start: 14,
      end: 25,
    });
    expect(offsets.get('1.1.0')).toEqual({
      start: 25,
      end: 36,
    });
  });

  it('should handle empty text nodes', () => {
    const editor = createEditor();
    editor.children = [
      {
        type: 'paragraph',
        children: [
          { text: 'Before' },
          { text: '' }, // Empty text node
          { text: 'After' },
        ],
      },
    ] as Descendant[];

    const { result } = renderHook(() => useSimplePlainTextOffsets(editor));

    const offsets = result.current;
    expect(offsets.size).toBe(3);
    expect(offsets.get('0.0')).toEqual({
      start: 0,
      end: 6,
    });
    expect(offsets.get('0.1')).toEqual({
      start: 6,
      end: 6,
    });
    expect(offsets.get('0.2')).toEqual({
      start: 6,
      end: 11,
    });
  });

  it('should handle code blocks', () => {
    const editor = createEditor();
    editor.children = [
      {
        type: 'paragraph',
        children: [{ text: 'Before code' }],
      },
      {
        type: 'code',
        children: [{ text: 'const x = 42;' }],
      },
      {
        type: 'paragraph',
        children: [{ text: 'After code' }],
      },
    ] as Descendant[];

    const { result } = renderHook(() => useSimplePlainTextOffsets(editor));

    const offsets = result.current;
    expect(offsets.size).toBe(3);
    expect(offsets.get('0.0')).toEqual({
      start: 0,
      end: 11,
    });
    expect(offsets.get('1.0')).toEqual({
      start: 11,
      end: 24,
    });
    expect(offsets.get('2.0')).toEqual({
      start: 24,
      end: 34,
    });
  });

  it('should handle deeply nested structures', () => {
    const editor = createEditor();
    editor.children = [
      {
        type: 'blockquote',
        children: [
          {
            type: 'paragraph',
            children: [
              { text: 'Quoted ' },
              {
                type: 'link',
                url: 'https://example.com',
                children: [{ text: 'link text' }],
              },
              { text: ' here' },
            ],
          },
        ],
      },
    ] as Descendant[];

    const { result } = renderHook(() => useSimplePlainTextOffsets(editor));

    const offsets = result.current;
    // Should handle nested text nodes
    expect(offsets.get('0.0.0')).toEqual({
      start: 0,
      end: 7,
    });
    expect(offsets.get('0.0.1.0')).toEqual({
      start: 7,
      end: 16,
    });
    expect(offsets.get('0.0.2')).toEqual({
      start: 16,
      end: 21,
    });
  });

  it('should update when editor content changes', () => {
    const editor = createEditor();
    editor.children = [
      {
        type: 'paragraph',
        children: [{ text: 'Initial text' }],
      },
    ] as Descendant[];

    const { result, rerender } = renderHook(() => useSimplePlainTextOffsets(editor));

    expect(result.current.get('0.0')).toEqual({
      start: 0,
      end: 12,
    });

    // Update editor content
    editor.children = [
      {
        type: 'paragraph',
        children: [{ text: 'Updated text content' }],
      },
    ] as Descendant[];

    rerender();

    expect(result.current.get('0.0')).toEqual({
      start: 0,
      end: 20,
    });
  });
});