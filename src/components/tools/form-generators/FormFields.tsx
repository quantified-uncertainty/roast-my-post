/**
 * Individual form field components
 */
import React from 'react';
import { FormFieldProps } from './types';

export const TextInputField: React.FC<FormFieldProps> = ({
  name,
  value,
  onChange,
  error,
  required,
  config
}) => {
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {config?.label || name}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        id={name}
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={config?.placeholder}
        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? 'border-red-300' : 'border-gray-300'
        }`}
        required={required}
      />
      {config?.helpText && (
        <p className="text-xs text-gray-500">{config.helpText}</p>
      )}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export const TextareaField: React.FC<FormFieldProps> = ({
  name,
  value,
  onChange,
  error,
  required,
  config
}) => {
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {config?.label || name}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <textarea
        id={name}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={config?.placeholder}
        rows={config?.rows || 5}
        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm ${
          error ? 'border-red-300' : 'border-gray-300'
        }`}
        required={required}
      />
      {config?.helpText && (
        <p className="text-xs text-gray-500">{config.helpText}</p>
      )}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export const NumberInputField: React.FC<FormFieldProps> = ({
  name,
  value,
  onChange,
  error,
  required,
  config
}) => {
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {config?.label || name}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        id={name}
        type="number"
        value={value || ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
        placeholder={config?.placeholder}
        min={config?.min}
        max={config?.max}
        step={config?.step}
        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? 'border-red-300' : 'border-gray-300'
        }`}
        required={required}
      />
      {config?.helpText && (
        <p className="text-xs text-gray-500">{config.helpText}</p>
      )}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export const CheckboxField: React.FC<FormFieldProps> = ({
  name,
  value,
  onChange,
  error,
  config
}) => {
  return (
    <div className="space-y-1">
      <label className="flex items-center space-x-2">
        <input
          id={name}
          type="checkbox"
          checked={value || false}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <span className="text-sm font-medium text-gray-700">
          {config?.label || name}
        </span>
      </label>
      {config?.helpText && (
        <p className="text-xs text-gray-500 ml-6">{config.helpText}</p>
      )}
      {error && (
        <p className="text-sm text-red-600 ml-6">{error}</p>
      )}
    </div>
  );
};

export const SelectField: React.FC<FormFieldProps & { options: string[] }> = ({
  name,
  value,
  onChange,
  error,
  required,
  config,
  options
}) => {
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {config?.label || name}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <select
        id={name}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? 'border-red-300' : 'border-gray-300'
        }`}
        required={required}
      >
        <option value="">Select an option</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {config?.helpText && (
        <p className="text-xs text-gray-500">{config.helpText}</p>
      )}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};