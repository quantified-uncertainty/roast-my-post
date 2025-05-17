import { type FieldError } from "react-hook-form";

interface FormFieldProps {
  label: string;
  name: string;
  required?: boolean;
  error?: FieldError;
  children: React.ReactNode;
}

export function FormField({
  label,
  name,
  required,
  error,
  children,
}: FormFieldProps) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-sm text-red-600">{error.message}</p>}
    </div>
  );
}
