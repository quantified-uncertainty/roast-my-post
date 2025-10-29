'use client';

import { useState, FormEvent, ReactNode } from 'react';
import { toolSchemas } from '@roast/ai';
import { ErrorDisplay, SubmitButton, TextAreaField } from './common';
import { useToolExecution } from '../hooks/useToolExecution';
import { AuthenticatedToolPage } from './AuthenticatedToolPage';
import { FieldConfig } from './types';
import { HelpCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export interface GenericToolTryPageProps<TInput = Record<string, any>, TOutput = unknown> {
  toolId: keyof typeof toolSchemas;
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
  hideViewToggle?: boolean;
  generatePrompt?: (input: TInput) => string; // Optional function to generate prompt for preview
  onSaveResult?: (result: TOutput, input: TInput) => Promise<{ id: string }>;
  saveButtonText?: string;
  getSavedResultUrl?: (id: string) => string;
}

/**
 * Generic try page for tools
 * Requires authentication to use
 * Layout is handled by layout.tsx
 */
export function GenericToolTryPage<TInput extends Record<string, any>, TOutput>({
  toolId,
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
  warning,
  hideViewToggle = false,
  generatePrompt,
  onSaveResult,
  saveButtonText = 'Save',
  getSavedResultUrl,
}: GenericToolTryPageProps<TInput, TOutput>) {
  // Initialize form state
  const getInitialValues = (): TInput => {
    const values: Record<string, string | number | boolean | string[]> = {};
    fields.forEach(field => {
      if (field.type === 'checkbox') {
        values[field.name] = field.defaultValue ?? false;
      } else if (field.type === 'checkbox-group') {
        values[field.name] = field.defaultValue ?? [];
      } else if (field.type === 'select' && field.valueType === 'number') {
        // For numeric selects, ensure default value is a number
        values[field.name] = typeof field.defaultValue === 'number'
          ? field.defaultValue
          : (field.defaultValue ? Number(field.defaultValue) : '');
      } else {
        values[field.name] = field.defaultValue ?? '';
      }
    });
    return values as TInput;
  };

  const [formData, setFormData] = useState<TInput>(getInitialValues());
  const [showRawJSON, setShowRawJSON] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [promptContent, setPromptContent] = useState<string>('');
  const [savedId, setSavedId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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
    // Reset saved state when running a new evaluation
    setSavedId(null);
  };

  const handleSave = async () => {
    if (!result || !onSaveResult) return;

    setIsSaving(true);
    try {
      const { id } = await onSaveResult(result, formData);
      setSavedId(id);
    } catch (err) {
      console.error('Failed to save result:', err);
      // Could add error toast here
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleFieldChange = (name: string, value: string | number | boolean | string[]) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const loadExample = (example: Partial<TInput>) => {
    setFormData(prev => ({ ...prev, ...example }));
  };

  const handleShowPrompt = () => {
    if (generatePrompt) {
      const prompt = generatePrompt(formData);
      setPromptContent(prompt);
      setShowPromptModal(true);
    }
  };

  // Check if form is valid for submission
  const isFormValid = () => {
    for (const field of fields) {
      if (field.required) {
        const value = formData[field.name];
        if (field.type === 'checkbox') {
          continue;
        } else if (field.type === 'checkbox-group') {
          // Validate checkbox-group: must have at least one selection
          if (!value || !Array.isArray(value) || value.length === 0) {
            return false;
          }
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
            {field.showPromptLink && generatePrompt && (
              <button
                type="button"
                onClick={handleShowPrompt}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
              >
                See prompt
              </button>
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
            <div className="flex items-center gap-1 mb-1">
              <label htmlFor={field.name} className="block text-sm font-medium text-gray-700">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              {field.tooltip && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label="More information"
                    >
                      <HelpCircle className="h-4 w-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="text-sm" align="start">
                    {field.tooltip}
                  </PopoverContent>
                </Popover>
              )}
            </div>
            <input
              id={field.name}
              type="number"
              value={value === '' ? '' : value}
              onChange={(e) => {
                const val = e.target.value;
                // Convert to number if valueType is number, otherwise keep as is
                const converted = field.valueType === 'number' && val !== ''
                  ? Number(val)
                  : val;
                handleFieldChange(field.name, converted);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
              placeholder={field.placeholder}
              required={field.required}
              disabled={isLoading}
              min={field.min}
              max={field.max}
              step={field.step || 'any'}
            />
            {field.helperText && (
              <p className="mt-1 text-sm text-gray-500">{field.helperText}</p>
            )}
            {field.showPromptLink && generatePrompt && (
              <button
                type="button"
                onClick={handleShowPrompt}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
              >
                See prompt
              </button>
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
              value={String(value || '')}
              onChange={(e) => {
                const val = e.target.value;
                // Convert to number if valueType is 'number'
                const converted = field.valueType === 'number' ? Number(val) : val;
                handleFieldChange(field.name, converted);
              }}
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

      case 'checkbox-group': {
        const isInvalid = field.required && (!value || !Array.isArray(value) || value.length === 0);
        return (
          <div key={field.name}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <div className={`space-y-2 border rounded-md p-4 ${isInvalid ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
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
            {isInvalid && (
              <p className="mt-1 text-sm text-red-600">Please select at least one option</p>
            )}
            {field.helperText && (
              <p className="mt-1 text-sm text-gray-500">{field.helperText}</p>
            )}
          </div>
        );
      }

      default:
        return null;
    }
  };
  
  return (
    <AuthenticatedToolPage>
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
              {/* View Toggle and Save Button */}
              {(!hideViewToggle || onSaveResult) && (
                <div className="mb-4 flex gap-2 justify-between items-center">
                  {!hideViewToggle && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowRawJSON(false)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          !showRawJSON
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Visual View
                      </button>
                      <button
                        onClick={() => setShowRawJSON(true)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          showRawJSON
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Raw JSON
                      </button>
                    </div>
                  )}

                  {/* Spacer when hideViewToggle but have save button */}
                  {hideViewToggle && onSaveResult && <div />}

                  {/* Save Button */}
                  {onSaveResult && (
                    <div className="flex gap-2 items-center">
                      {savedId ? (
                        <>
                          <span className="text-sm text-green-600">✓ Saved</span>
                          {getSavedResultUrl && (
                            <a
                              href={getSavedResultUrl(savedId)}
                              className="px-4 py-2 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                            >
                              View Saved
                            </a>
                          )}
                        </>
                      ) : (
                        <button
                          onClick={handleSave}
                          disabled={isSaving}
                          className="px-4 py-2 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSaving ? 'Saving...' : saveButtonText}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Result Display */}
              {!hideViewToggle && showRawJSON ? (
                <div className="rounded-lg border bg-white p-6 shadow-sm">
                  <h3 className="mb-4 text-lg font-semibold">Full JSON Response</h3>
                  <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded bg-gray-50 p-4 font-mono text-sm">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              ) : (
                renderResult(result)
              )}
            </div>
          )}
        </div>

        {/* Prompt Preview Modal */}
        <Dialog open={showPromptModal} onOpenChange={setShowPromptModal}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Prompt Preview</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <pre className="whitespace-pre-wrap break-words rounded bg-gray-50 p-4 font-mono text-sm border border-gray-200">
                {promptContent}
              </pre>
            </div>
          </DialogContent>
        </Dialog>
    </AuthenticatedToolPage>
  );
}