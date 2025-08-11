/**
 * Standard types for tool examples
 */

// Simple text examples (most common)
export type TextExamples = string[];

// Paired examples (for tools that need multiple inputs)
export interface PairedExample {
  [key: string]: string | number | boolean;
}
export type PairedExamples = PairedExample[];

// Union type for all example formats
export type ToolExamples = TextExamples | PairedExamples;

// Type guard to check if examples are paired
export function isPairedExamples(examples: ToolExamples): examples is PairedExamples {
  return Array.isArray(examples) && 
         examples.length > 0 && 
         typeof examples[0] === 'object';
}

// Helper to convert examples to the format expected by GenericToolPage
export function formatExamplesForUI<T extends Record<string, unknown>>(
  examples: ToolExamples,
  fieldName?: string
): Array<{ label: string; value: Partial<T> }> {
  if (isPairedExamples(examples)) {
    return examples.map((ex, i) => ({
      label: `Example ${i + 1}`,
      value: ex as Partial<T>
    }));
  }
  
  // For text examples, use the provided field name or default to 'text'
  const field = fieldName || 'text';
  return examples.map((ex, i) => ({
    label: `Example ${i + 1}`,
    value: { [field]: ex } as Partial<T>
  }));
}