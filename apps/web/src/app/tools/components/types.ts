export interface FieldConfig {
  type: 'text' | 'textarea' | 'select' | 'number' | 'checkbox' | 'checkbox-group';
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  rows?: number;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ value: string; label: string }>;
  defaultValue?: string | number | boolean | string[];
  helperText?: string;
  examples?: string[];
  className?: string;
  valueType?: 'string' | 'number'; // For select fields: convert value to number if 'number'
}