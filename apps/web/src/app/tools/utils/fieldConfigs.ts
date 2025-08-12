import type { FieldConfig } from '../components/GenericToolPage';

/**
 * Common field configurations for tools
 */

// Standard text input field
export const createTextField = (
  name: string,
  label: string,
  options?: Partial<FieldConfig>
): FieldConfig => ({
  type: 'textarea',
  name,
  label,
  required: true,
  rows: 8,
  placeholder: `Enter ${label.toLowerCase()}...`,
  ...options
});

// Question/query field (common for many tools)
export const createQuestionField = (options?: Partial<FieldConfig>): FieldConfig => ({
  type: 'textarea',
  name: 'question',
  label: 'Question',
  required: true,
  rows: 3,
  placeholder: 'Enter your question...',
  ...options
});

// Context field (optional additional information)
export const createContextField = (options?: Partial<FieldConfig>): FieldConfig => ({
  type: 'textarea',
  name: 'context',
  label: 'Additional Context (Optional)',
  required: false,
  rows: 4,
  placeholder: 'Provide any additional context or constraints...',
  ...options
});

// Number input with common defaults
export const createNumberField = (
  name: string,
  label: string,
  min: number,
  max: number,
  defaultValue: number,
  options?: Partial<FieldConfig>
): FieldConfig => ({
  type: 'number',
  name,
  label,
  min,
  max,
  defaultValue,
  step: 1,
  required: false,
  ...options
});

// Boolean checkbox field
export const createCheckboxField = (
  name: string,
  label: string,
  defaultValue: boolean = false,
  options?: Partial<FieldConfig>
): FieldConfig => ({
  type: 'checkbox',
  name,
  label,
  defaultValue,
  required: false,
  ...options
});

// Common field sets for reuse
export const commonFields = {
  // Standard text analysis fields
  textAnalysis: (fieldName = 'text', label = 'Text to Analyze') => 
    createTextField(fieldName, label, {
      placeholder: 'Enter or paste the text you want to analyze...',
      helperText: 'The tool will analyze this text and provide detailed results'
    }),
  
  // Research/query fields
  researchQuery: () => createQuestionField({
    label: 'Research Query',
    placeholder: 'What would you like to research?',
    helperText: 'Be specific for best results'
  }),
  
  // Forecasting fields
  forecastingQuestion: () => createQuestionField({
    label: 'Forecasting Question', 
    placeholder: 'Enter a specific question about a future event...',
    helperText: 'Make sure the question has a clear, verifiable answer'
  }),
  
  // Common number fields
  maxResults: (defaultValue = 10) => 
    createNumberField('maxResults', 'Maximum Results', 1, 100, defaultValue, {
      helperText: 'Number of results to return'
    }),
  
  // Common boolean fields
  usePerplexity: () => 
    createCheckboxField('usePerplexity', 'Use web search for additional context', false, {
      helperText: 'Enable to search the web for relevant information'
    }),
  
  includeDetails: () =>
    createCheckboxField('includeDetails', 'Include detailed analysis', true, {
      helperText: 'Provides more comprehensive results'
    })
};