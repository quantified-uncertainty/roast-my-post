/**
 * Types for the auto-generation form system
 */
import { z } from 'zod';
import React from 'react';

export interface FieldConfig {
  label?: string;
  placeholder?: string;
  helpText?: string;
  rows?: number; // for textarea
  min?: number; // for number inputs
  max?: number; // for number inputs
  step?: number; // for number inputs
}

export interface FormFieldProps {
  name: string;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  required?: boolean;
  config?: FieldConfig;
}

export interface FormConfig<T> {
  fieldOrder?: (keyof T)[];
  fieldConfigs?: Partial<Record<keyof T, FieldConfig>>;
  submitButtonText?: string;
  submitButtonColor?: string;
  examples?: Array<{
    name: string;
    description?: string;
    data: Partial<T>;
  }>;
}

export interface AutoToolFormProps<T> {
  schema: z.ZodSchema<T>;
  onSubmit: (data: T) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  config?: FormConfig<T>;
  defaultValues?: Partial<T>;
}

export interface ToolPageTemplateProps<TInput, TOutput> {
  tool: {
    config: {
      id: string;
      name: string;
      description: string;
      costEstimate?: string;
    };
    inputSchema: z.ZodSchema<TInput>;
  };
  renderResults?: (result: TOutput) => React.ReactNode;
  formConfig?: FormConfig<TInput>;
}