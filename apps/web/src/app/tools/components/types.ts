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
  defaultValue?: string | number | boolean;
  helperText?: string;
  examples?: string[];
  className?: string;
}