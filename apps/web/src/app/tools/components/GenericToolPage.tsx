'use client';

import { useState, FormEvent, ReactNode } from 'react';
import { toolSchemas, getToolReadme } from '@roast/ai';
import { TabbedToolPageLayout } from './TabbedToolPageLayout';
import { ToolDocumentation } from './ToolDocumentation';
import { ErrorDisplay, SubmitButton, TextAreaField } from './common';
import { useToolExecution } from '../hooks/useToolExecution';

export interface FieldConfig {
  type: 'text' | 'textarea' | 'select' | 'number' | 'checkbox';
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  rows?: number;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ value: string; label: string }>;
  defaultValue?: any;
  helperText?: string;
  examples?: string[];
  className?: string;
}

export interface GenericToolPageProps<TInput = Record<string, any>, TOutput = unknown> {
  toolId: keyof typeof toolSchemas;
  title: string;
  description: string;
  icon: ReactNode;
  fields: FieldConfig[];
  renderResult: (result: TOutput) => ReactNode;
  exampleInput?: Partial<TInput>;
  exampleText?: string;
  submitButtonText?: string;
  loadingText?: string;
  submitButtonClassName?: string;
  validateInput?: (input: TInput) => boolean | string;
  formatError?: (error: unknown) => string;
  onExecuteComplete?: (result?: TOutput, error?: string) => void;
  onBeforeSubmit?: (input: TInput) => TInput;
  warning?: string;
}

/**
 * Generic tool page component for simple tools that follow a standard pattern
 * 
 * @example
 * ```tsx
 * export default function MyToolPage() {
 *   return (
 *     <GenericToolPage<MyInput, MyOutput>
 *       toolId="my-tool"
 *       title="My Tool"
 *       description="Tool description"
 *       icon={<Icon />}
 *       fields={[
 *         { type: 'textarea', name: 'text', label: 'Input Text', required: true }
 *       ]}
 *       renderResult={(result) => <MyResultComponent result={result} />}
 *     />
 *   );
 * }
 * ```
 */
export function GenericToolPage<TInput extends Record<string, any>, TOutput>({
  toolId,
  title,
  description,
  icon,
  fields,
  renderResult,
  exampleInput,
  exampleText,
  submitButtonText = 'Submit',
  loadingText = 'Processing...',
  submitButtonClassName,
  validateInput,
  formatError,
  onExecuteComplete,
  onBeforeSubmit,
  warning
}: GenericToolPageProps<TInput, TOutput>) {
  // Get schemas from centralized registry
  const { inputSchema, outputSchema } = toolSchemas[toolId];
  
  // Initialize form state
  const getInitialValues = (): TInput => {
    const values: any = {};
    fields.forEach(field => {
      values[field.name] = field.defaultValue ?? (field.type === 'checkbox' ? false : '');
    });
    return values as TInput;
  };
  
  const [formData, setFormData] = useState<TInput>(getInitialValues());
  
  // Use the hook for state management and execution
  const { result, isLoading, error, execute } = useToolExecution<TInput, TOutput>(
    `/api/tools/${toolId}`,
    {
      validateInput,
      formatError,
      onExecuteComplete
    }
  );
  
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const processedData = onBeforeSubmit ? onBeforeSubmit(formData) : formData;
    execute(processedData);
  };
  
  const handleFieldChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const loadExample = () => {
    if (exampleInput) {
      setFormData(prev => ({ ...prev, ...exampleInput }));
    }
  };
  
  // Check if form is valid for submission
  const isFormValid = () => {
    for (const field of fields) {
      if (field.required) {
        const value = formData[field.name];
        if (field.type === 'checkbox') {
          // Checkbox doesn't need validation
          continue;
        } else if (!value || (typeof value === 'string' && !value.trim())) {
          return false;
        }
      }
    }
    return true;
  };
  
  // Render field based on type
  const renderField = (field: FieldConfig) => {
    const value = formData[field.name];
    
    switch (field.type) {
      case 'textarea':
        return (
          <div key={field.name}>
            <TextAreaField
              id={field.name}
              label={field.label}
              value={value || ''}
              onChange={(val) => handleFieldChange(field.name, val)}
              placeholder={field.placeholder}
              rows={field.rows}
              required={field.required}
              disabled={isLoading}
              helperText={field.helperText}
            />
            {field.examples && field.examples.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium text-gray-700 mb-2">Example inputs:</p>
                <div className="space-y-2">
                  {field.examples.map((example, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleFieldChange(field.name, example)}
                      disabled={isLoading}
                      className="block w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 disabled:bg-gray-200 disabled:cursor-not-allowed rounded border text-gray-700 transition-colors"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
        
      case 'text':
        return (
          <div key={field.name}>
            <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-1">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <input
              id={field.name}
              type="text"
              value={value || ''}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 ${field.className || ''}`}
              placeholder={field.placeholder}
              required={field.required}
              disabled={isLoading}
            />
            {field.helperText && (
              <p className="mt-1 text-sm text-gray-500">{field.helperText}</p>
            )}
          </div>
        );
        
      case 'number':
        return (
          <div key={field.name}>
            <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-1">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <input
              id={field.name}
              type="number"
              value={value || ''}
              onChange={(e) => handleFieldChange(field.name, e.target.valueAsNumber || e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
              placeholder={field.placeholder}
              required={field.required}
              disabled={isLoading}
              min={field.min}
              max={field.max}
              step={field.step}
            />
            {field.helperText && (
              <p className="mt-1 text-sm text-gray-500">{field.helperText}</p>
            )}
          </div>
        );
        
      case 'select':
        return (
          <div key={field.name}>
            <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-1">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <select
              id={field.name}
              value={value || ''}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
              required={field.required}
              disabled={isLoading}
            >
              <option value="">Select an option</option>
              {field.options?.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {field.helperText && (
              <p className="mt-1 text-sm text-gray-500">{field.helperText}</p>
            )}
          </div>
        );
        
      case 'checkbox':
        return (
          <div key={field.name} className="flex items-center">
            <input
              id={field.name}
              type="checkbox"
              checked={value || false}
              onChange={(e) => handleFieldChange(field.name, e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded disabled:bg-gray-100"
              disabled={isLoading}
            />
            <label htmlFor={field.name} className="ml-2 block text-sm text-gray-700">
              {field.label}
            </label>
            {field.helperText && (
              <p className="ml-2 text-sm text-gray-500">({field.helperText})</p>
            )}
          </div>
        );
        
      default:
        return null;
    }
  };
  
  // Try tab content
  const tryContent = (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-sm border">
        {fields.map(renderField)}
        
        {exampleInput && exampleText && (
          <div>
            <button
              type="button"
              onClick={loadExample}
              className="text-sm text-indigo-600 hover:text-indigo-500"
              disabled={isLoading}
            >
              {exampleText}
            </button>
          </div>
        )}
        
        <SubmitButton
          isLoading={isLoading}
          disabled={!isFormValid()}
          text={submitButtonText}
          loadingText={loadingText}
          className={submitButtonClassName}
        />
      </form>
      
      <ErrorDisplay error={error} />
      
      {result && (
        <div className="mt-8">
          {renderResult(result)}
        </div>
      )}
    </div>
  );
  
  // README content from generated file
  const readmeContent = getToolReadme(toolId as string);
  
  // Docs tab content
  const docsContent = (
    <ToolDocumentation
      toolId={toolId as string}
      inputSchema={inputSchema}
      outputSchema={outputSchema}
      readmeContent={readmeContent}
    />
  );
  
  return (
    <TabbedToolPageLayout
      title={title}
      description={description}
      icon={icon}
      tryContent={tryContent}
      docsContent={docsContent}
      warning={warning}
    />
  );
}