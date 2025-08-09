'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';

interface ToolPageLayoutProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  warning?: {
    message: string;
    type?: 'info' | 'warning' | 'error';
  };
}

export function ToolPageLayout({
  title,
  description,
  icon,
  children,
  warning
}: ToolPageLayoutProps) {
  const warningColors = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    error: 'bg-red-50 border-red-200 text-red-800',
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Back to Tools Link */}
      <Link 
        href="/tools" 
        className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6 transition-colors"
      >
        <ChevronLeftIcon className="h-4 w-4 mr-1" />
        Back to Tools
      </Link>

      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          {icon}
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        </div>
        {description && (
          <p className="text-gray-600 mb-4">{description}</p>
        )}
        {warning && (
          <div className={`p-4 border rounded-lg ${warningColors[warning.type || 'info']}`}>
            <p className="text-sm">
              <strong>Note:</strong> {warning.message}
            </p>
          </div>
        )}
      </div>

      {/* Main Content */}
      {children}
    </div>
  );
}

// ============================================================================
// Tool Form Section Component - For consistent form styling
// ============================================================================

interface ToolFormSectionProps {
  children: ReactNode;
  onSubmit: (e: React.FormEvent) => void;
}

export function ToolFormSection({ children, onSubmit }: ToolFormSectionProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6 mb-8">
      {children}
    </form>
  );
}

// ============================================================================
// Tool Input Field Component - For consistent input styling
// ============================================================================

interface ToolInputFieldProps {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  rows?: number;
  type?: 'text' | 'textarea';
  helperText?: string;
}

export function ToolInputField({
  label,
  id,
  value,
  onChange,
  placeholder,
  required = false,
  rows = 3,
  type = 'textarea',
  helperText
}: ToolInputFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {type === 'textarea' ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          rows={rows}
          required={required}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required={required}
        />
      )}
      {helperText && (
        <p className="mt-1 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
}

// ============================================================================
// Tool Submit Button Component - For consistent button styling
// ============================================================================

interface ToolSubmitButtonProps {
  isLoading: boolean;
  disabled?: boolean;
  loadingText?: string;
  text?: string;
}

export function ToolSubmitButton({
  isLoading,
  disabled = false,
  loadingText = 'Processing...',
  text = 'Submit'
}: ToolSubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={isLoading || disabled}
      className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
    >
      {isLoading ? loadingText : text}
    </button>
  );
}

// ============================================================================
// Tool Examples Component - For showing example inputs
// ============================================================================

interface ToolExamplesProps {
  examples: string[];
  onSelect: (example: string) => void;
  label?: string;
}

export function ToolExamples({ 
  examples, 
  onSelect, 
  label = "Try these examples:" 
}: ToolExamplesProps) {
  return (
    <div className="mb-8">
      <h3 className="text-sm font-medium text-gray-700 mb-3">{label}</h3>
      <div className="flex flex-wrap gap-2">
        {examples.map((example, index) => (
          <button
            key={index}
            type="button"
            onClick={() => onSelect(example)}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Tool Error Display Component - For showing errors
// ============================================================================

interface ToolErrorProps {
  error: string;
}

export function ToolError({ error }: ToolErrorProps) {
  return (
    <div className="rounded-md bg-red-50 p-4 mb-6">
      <p className="text-sm text-red-800">{error}</p>
    </div>
  );
}

// ============================================================================
// Tool Result Section Component - For consistent result display
// ============================================================================

interface ToolResultSectionProps {
  children: ReactNode;
  className?: string;
}

export function ToolResultSection({ 
  children, 
  className = '' 
}: ToolResultSectionProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      {children}
    </div>
  );
}