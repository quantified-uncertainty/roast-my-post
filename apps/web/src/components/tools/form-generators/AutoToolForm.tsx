/**
 * AutoToolForm - Automatically generates forms from Zod schemas
 */
import React, { useState } from 'react';
import { z } from 'zod';
import { AutoToolFormProps } from './types';
import {
  TextInputField,
  TextareaField,
  NumberInputField,
  CheckboxField,
  SelectField,
  ArrayField,
  ObjectField
} from './FormFields';

// Map Zod types to form field components
function getFieldComponent(schema: z.ZodTypeAny, fieldConfig?: any): React.ComponentType<any> | null {
  if (schema instanceof z.ZodString) {
    // Check for multiline strings based on fieldConfig rows, min length, or description
    const description = (schema as any).description;
    if (fieldConfig?.rows || description?.includes('multiline') || (schema as any)._def.checks?.some((check: any) => check.kind === 'min' && check.value > 100)) {
      return TextareaField;
    }
    return TextInputField;
  }
  
  if (schema instanceof z.ZodNumber) {
    return NumberInputField;
  }
  
  if (schema instanceof z.ZodBoolean) {
    return CheckboxField;
  }
  
  if (schema instanceof z.ZodEnum || schema instanceof z.ZodNativeEnum) {
    return SelectField;
  }
  
  if (schema instanceof z.ZodArray) {
    return ArrayField;
  }
  
  if (schema instanceof z.ZodObject) {
    return ObjectField;
  }
  
  if (schema instanceof z.ZodLiteral) {
    return TextInputField;
  }
  
  // Handle optional types
  if (schema instanceof z.ZodOptional) {
    return getFieldComponent(schema._def.innerType, fieldConfig);
  }
  
  // Handle default types
  if (schema instanceof z.ZodDefault) {
    return getFieldComponent(schema._def.innerType, fieldConfig);
  }
  
  // Handle nullable types
  if (schema instanceof z.ZodNullable) {
    return getFieldComponent(schema._def.innerType, fieldConfig);
  }
  
  return null;
}

// Extract enum values from Zod schema
function getEnumValues(schema: z.ZodTypeAny): string[] | null {
  if (schema instanceof z.ZodEnum) {
    return schema._def.values;
  }
  
  if (schema instanceof z.ZodNativeEnum) {
    return Object.values(schema._def.values).filter(v => typeof v === 'string') as string[];
  }
  
  // Handle optional/default/nullable wrappers
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodDefault || schema instanceof z.ZodNullable) {
    return getEnumValues(schema._def.innerType);
  }
  
  return null;
}

// Check if field is required
function isFieldRequired(schema: z.ZodTypeAny): boolean {
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    return false;
  }
  
  if (schema instanceof z.ZodDefault) {
    return false;
  }
  
  return true;
}

export function AutoToolForm<T extends Record<string, any>>({
  schema,
  onSubmit,
  isLoading = false,
  error = null,
  config = {},
  defaultValues = {}
}: AutoToolFormProps<T>) {
  const [formData, setFormData] = useState<Partial<T>>(defaultValues);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [selectedExample, setSelectedExample] = useState<string | null>(null);
  
  // Parse schema to get field information
  const schemaShape = schema instanceof z.ZodObject ? schema.shape : {};
  const fields = Object.entries(schemaShape);
  
  // Order fields based on config
  const orderedFields = config.fieldOrder 
    ? fields.sort((a, b) => {
        const aIndex = config.fieldOrder!.indexOf(a[0] as keyof T);
        const bIndex = config.fieldOrder!.indexOf(b[0] as keyof T);
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      })
    : fields;
  
  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    // Clear validation error for this field
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  };
  
  const handleExampleSelect = (exampleName: string) => {
    const example = config.examples?.find(e => e.name === exampleName);
    if (example) {
      setFormData(example.data);
      setSelectedExample(exampleName);
      setValidationErrors({});
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    
    try {
      // Validate form data
      const validatedData = schema.parse(formData);
      await onSubmit(validatedData);
    } catch (err) {
      if (err instanceof z.ZodError) {
        // Convert Zod errors to field-specific errors
        const errors: Record<string, string> = {};
        err.errors.forEach(error => {
          const path = error.path.join('.');
          errors[path] = error.message;
        });
        setValidationErrors(errors);
      } else {
        throw err;
      }
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Example selector */}
      {config.examples && config.examples.length > 0 && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Try an example:
          </label>
          <select
            value={selectedExample || ''}
            onChange={(e) => handleExampleSelect(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select an example...</option>
            {config.examples.map(example => (
              <option key={example.name} value={example.name}>
                {example.name}
                {example.description && ` - ${example.description}`}
              </option>
            ))}
          </select>
        </div>
      )}
      
      {/* General error display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">{error}</p>
        </div>
      )}
      
      {/* Form fields */}
      {orderedFields.map(([fieldName, fieldSchema]) => {
        const fieldConfig = config.fieldConfigs?.[fieldName as keyof T];
        const FieldComponent = getFieldComponent(fieldSchema as z.ZodTypeAny, fieldConfig);
        if (!FieldComponent) {
          // Skip unsupported field types
          return null;
        }
        const enumValues = getEnumValues(fieldSchema as z.ZodTypeAny);
        const required = isFieldRequired(fieldSchema as z.ZodTypeAny);
        
        // For enum fields, use SelectField
        if (enumValues) {
          return (
            <SelectField
              key={fieldName}
              name={fieldName}
              value={formData[fieldName]}
              onChange={(value) => handleFieldChange(fieldName, value)}
              error={validationErrors[fieldName]}
              required={required}
              config={fieldConfig}
              options={enumValues}
            />
          );
        }
        
        // For select fields with options in config
        if (FieldComponent === SelectField && fieldConfig?.options) {
          return (
            <SelectField
              key={fieldName}
              name={fieldName}
              value={formData[fieldName]}
              onChange={(value) => handleFieldChange(fieldName, value)}
              error={validationErrors[fieldName]}
              required={required}
              config={fieldConfig}
              options={fieldConfig.options}
            />
          );
        }
        
        return (
          <FieldComponent
            key={fieldName}
            name={fieldName}
            value={formData[fieldName]}
            onChange={(value: any) => handleFieldChange(fieldName, value)}
            error={validationErrors[fieldName]}
            required={required}
            config={fieldConfig}
          />
        );
      })}
      
      {/* Submit button */}
      <button
        type="submit"
        disabled={isLoading}
        className={`w-full py-2 px-4 rounded-md text-white font-medium transition-colors
          ${config.submitButtonColor === 'green' 
            ? 'bg-green-600 hover:bg-green-700 disabled:bg-gray-400' 
            : 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400'
          } disabled:cursor-not-allowed`}
      >
        {isLoading 
          ? 'Processing...' 
          : config.submitButtonText || 'Submit'
        }
      </button>
    </form>
  );
}