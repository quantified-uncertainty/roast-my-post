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
        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm resize-y min-h-[120px] ${
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

export const SelectField: React.FC<FormFieldProps & { options: string[] | Array<{ value: string; label: string }> }> = ({
  name,
  value,
  onChange,
  error,
  required,
  config,
  options
}) => {
  // Handle both string arrays and object arrays
  const selectOptions = options.map(option => 
    typeof option === 'string' 
      ? { value: option, label: option }
      : option
  );

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
        {selectOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
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

export const ArrayField: React.FC<FormFieldProps> = ({
  name,
  value,
  onChange,
  error,
  required,
  config
}) => {
  const items = Array.isArray(value) ? value : [];
  
  const addItem = () => {
    const newItem = config?.itemFields ? 
      Object.keys(config.itemFields).reduce((acc, key) => ({ ...acc, [key]: '' }), {}) :
      '';
    onChange([...items, newItem]);
  };
  
  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems);
  };
  
  const updateItem = (index: number, newValue: any) => {
    const newItems = [...items];
    newItems[index] = newValue;
    onChange(newItems);
  };
  
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {config?.label || name}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {config?.helpText && (
        <p className="text-xs text-gray-500">{config.helpText}</p>
      )}
      
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="flex justify-between items-start mb-3">
              <span className="text-sm font-medium text-gray-700">Item {index + 1}</span>
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="text-red-600 hover:text-red-700 text-sm"
              >
                Remove
              </button>
            </div>
            
            {config?.itemFields ? (
              // Object items with multiple fields
              <div className="space-y-3">
                {Object.entries(config.itemFields).map(([fieldName, fieldConfig]) => (
                  <div key={fieldName}>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      {fieldConfig.label || fieldName}
                    </label>
                    <input
                      type="text"
                      value={item[fieldName] || ''}
                      onChange={(e) => updateItem(index, { ...item, [fieldName]: e.target.value })}
                      placeholder={fieldConfig.placeholder}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {fieldConfig.helpText && (
                      <p className="text-xs text-gray-500 mt-1">{fieldConfig.helpText}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              // Simple string items
              <input
                type="text"
                value={item}
                onChange={(e) => updateItem(index, e.target.value)}
                placeholder={config?.placeholder}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>
        ))}
        
        <button
          type="button"
          onClick={addItem}
          className="w-full py-2 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors"
        >
          + Add {config?.placeholder || 'Item'}
        </button>
      </div>
      
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export const ObjectField: React.FC<FormFieldProps> = ({
  name,
  value,
  onChange,
  error,
  required,
  config
}) => {
  const objectValue = value || {};
  
  const updateField = (fieldName: string, fieldValue: any) => {
    onChange({ ...objectValue, [fieldName]: fieldValue });
  };
  
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {config?.label || name}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {config?.helpText && (
        <p className="text-xs text-gray-500">{config.helpText}</p>
      )}
      
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-4">
        {config?.fieldConfigs && Object.entries(config.fieldConfigs).map(([fieldName, fieldConfig]) => (
          <div key={fieldName}>
            {fieldConfig.options ? (
              // Select field
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  {fieldConfig.label || fieldName}
                </label>
                <select
                  value={objectValue[fieldName] || ''}
                  onChange={(e) => updateField(fieldName, e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select an option</option>
                  {fieldConfig.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {fieldConfig.helpText && (
                  <p className="text-xs text-gray-500 mt-1">{fieldConfig.helpText}</p>
                )}
              </div>
            ) : fieldName.includes('min') || fieldName.includes('max') || fieldName.includes('length') ? (
              // Number field
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  {fieldConfig.label || fieldName}
                </label>
                <input
                  type="number"
                  value={objectValue[fieldName] || ''}
                  onChange={(e) => updateField(fieldName, e.target.value ? Number(e.target.value) : undefined)}
                  placeholder={fieldConfig.placeholder}
                  min={fieldConfig.min}
                  max={fieldConfig.max}
                  step={fieldConfig.step}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {fieldConfig.helpText && (
                  <p className="text-xs text-gray-500 mt-1">{fieldConfig.helpText}</p>
                )}
              </div>
            ) : (
              // Checkbox or text field
              <div>
                {typeof objectValue[fieldName] === 'boolean' || fieldName.startsWith('allow') || fieldName.startsWith('enable') || fieldName.startsWith('normalize') || fieldName.startsWith('use') ? (
                  // Checkbox
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={objectValue[fieldName] || false}
                      onChange={(e) => updateField(fieldName, e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-gray-600">
                      {fieldConfig.label || fieldName}
                    </span>
                  </label>
                ) : (
                  // Text field
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      {fieldConfig.label || fieldName}
                    </label>
                    <input
                      type="text"
                      value={objectValue[fieldName] || ''}
                      onChange={(e) => updateField(fieldName, e.target.value)}
                      placeholder={fieldConfig.placeholder}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
                {fieldConfig.helpText && (
                  <p className="text-xs text-gray-500 mt-1">{fieldConfig.helpText}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};