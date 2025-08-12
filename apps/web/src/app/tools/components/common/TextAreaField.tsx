import React from 'react';

interface TextAreaFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  maxLength?: number;
  minLength?: number;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  exampleText?: string;
  onLoadExample?: () => void;
  className?: string;
}

/**
 * Reusable textarea field component with label, validation, and example loading
 * 
 * @example
 * ```tsx
 * <TextAreaField
 *   id="text"
 *   label="Text to analyze"
 *   value={text}
 *   onChange={setText}
 *   placeholder="Enter your text here..."
 *   required
 *   exampleText="Load example"
 *   onLoadExample={() => setText(exampleContent)}
 * />
 * ```
 */
export function TextAreaField({
  id,
  label,
  value,
  onChange,
  placeholder,
  rows = 6,
  required = false,
  maxLength,
  minLength,
  disabled = false,
  error,
  helperText,
  exampleText,
  onLoadExample,
  className = ''
}: TextAreaFieldProps) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
          error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
        } ${disabled ? 'bg-gray-50 cursor-not-allowed' : ''}`}
        rows={rows}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
        minLength={minLength}
        disabled={disabled}
      />
      
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helperText}</p>
      )}
      
      {exampleText && onLoadExample && (
        <button
          type="button"
          onClick={onLoadExample}
          className="mt-2 text-sm text-indigo-600 hover:text-indigo-500"
          disabled={disabled}
        >
          {exampleText}
        </button>
      )}
      
      {maxLength && (
        <p className="mt-1 text-xs text-gray-500 text-right">
          {value.length} / {maxLength}
        </p>
      )}
    </div>
  );
}