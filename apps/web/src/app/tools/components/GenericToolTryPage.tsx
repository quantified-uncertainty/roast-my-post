'use client';

import { useState, FormEvent, ReactNode } from 'react';
import { toolSchemas } from '@roast/ai';
import { ToolPageLayout } from './ToolPageLayout';
import { ErrorDisplay, SubmitButton, TextAreaField } from './common';
import { useToolExecution } from '../hooks/useToolExecution';
import { AuthenticatedToolPage } from './AuthenticatedToolPage';
import { FieldConfig } from './types';

export interface GenericToolTryPageProps<TInput = Record<string, any>, TOutput = unknown> {
  toolId: keyof typeof toolSchemas;
  title: string;
  description: string;
  icon: ReactNode;
  fields: FieldConfig[];
  renderResult: (result: TOutput) => ReactNode;
  exampleInputs?: Array<{ label: string; value: Partial<TInput> }>;
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
 * Generic try page for tools
 * Requires authentication to use
 */
export function GenericToolTryPage<TInput extends Record<string, any>, TOutput>({
  toolId,
  title,
  description,
  icon,
  fields,
  renderResult,
  exampleInputs,
  submitButtonText = 'Submit',
  loadingText = 'Processing...',
  submitButtonClassName,
  validateInput,
  formatError,
  onExecuteComplete,
  onBeforeSubmit,
  warning
}: GenericToolTryPageProps<TInput, TOutput>) {
  // Initialize form state
  const getInitialValues = (): TInput => {
    const values: Record<string, string | number | boolean | string[]> = {};
    fields.forEach(field => {
      if (field.type === 'checkbox') {
        values[field.name] = field.defaultValue ?? false;
      } else if (field.type === 'checkbox-group') {
        values[field.name] = field.defaultValue ?? [];
      } else {
        values[field.name] = field.defaultValue ?? '';
      }
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
  
  const handleFieldChange = (name: string, value: string | number | boolean | string[]) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const loadExample = (example: Partial<TInput>) => {
    setFormData(prev => ({ ...prev, ...example }));
  };
  
  // Check if form is valid for submission
  const isFormValid = () => {
    for (const field of fields) {
      if (field.required) {
        const value = formData[field.name];
        if (field.type === 'checkbox') {
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

      case 'checkbox-group':
        return (
          <div key={field.name}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <div className="space-y-2 border border-gray-200 rounded-md p-4 bg-gray-50">
              {field.options?.map(option => {
                const isChecked = Array.isArray(value) ? value.includes(option.value) : false;
                return (
                  <div key={option.value} className="flex items-center">
                    <input
                      id={`${field.name}-${option.value}`}
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        const currentValues = Array.isArray(value) ? value : [];
                        const newValues = e.target.checked
                          ? [...currentValues, option.value]
                          : currentValues.filter(v => v !== option.value);
                        handleFieldChange(field.name, newValues);
                      }}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded disabled:bg-gray-100"
                      disabled={isLoading}
                    />
                    <label htmlFor={`${field.name}-${option.value}`} className="ml-2 block text-sm text-gray-700">
                      {option.label}
                    </label>
                  </div>
                );
              })}
            </div>
            {field.helperText && (
              <p className="mt-1 text-sm text-gray-500">{field.helperText}</p>
            )}
          </div>
        );

      default:
        return null;
    }
  };
  
  return (
    <AuthenticatedToolPage toolName={title}>
      <ToolPageLayout
        title={title}
        description={description}
        icon={icon}
        warning={warning}
        toolId={toolId as string}
      >
        <div className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-sm border">
            {fields.map(renderField)}
            
            {/* Multiple examples with labels */}
            {exampleInputs && exampleInputs.length > 0 && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-3">Load an example:</p>
                <div className="space-y-2">
                  {exampleInputs.map((example, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => loadExample(example.value)}
                      disabled={isLoading}
                      className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 disabled:bg-gray-200 disabled:cursor-not-allowed rounded-lg border border-gray-200 transition-colors group"
                      title={`Fills: ${Object.keys(example.value).join(', ')}`}
                    >
                      <div className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                        {example.label}
                      </div>
                      {(example as any).hint && (
                        <div className="text-sm text-gray-600 mt-1">
                          {(example as any).hint}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-1">
                        <span>Fills:</span>
                        {Object.keys(example.value).map((field, idx) => (
                          <span key={field} className="bg-gray-200 px-1 rounded">
                            {field}{idx < Object.keys(example.value).length - 1 ? ',' : ''}
                          </span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
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
            <div className="mt-8" data-testid="tool-result">
              {renderResult(result)}
            </div>
          )}
        </div>
      </ToolPageLayout>
    </AuthenticatedToolPage>
  );
}