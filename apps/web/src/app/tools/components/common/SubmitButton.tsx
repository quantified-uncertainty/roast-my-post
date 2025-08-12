import React from 'react';

interface SubmitButtonProps {
  isLoading: boolean;
  disabled?: boolean;
  text?: string;
  loadingText?: string;
  className?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

/**
 * Standardized submit button with loading state for tool pages
 * 
 * @example
 * ```tsx
 * <SubmitButton 
 *   isLoading={isLoading}
 *   disabled={!text.trim()}
 *   text="Analyze Text"
 *   loadingText="Analyzing..."
 * />
 * ```
 */
export function SubmitButton({ 
  isLoading, 
  disabled = false,
  text = 'Submit',
  loadingText = 'Processing...',
  className = '',
  onClick,
  type = 'submit'
}: SubmitButtonProps) {
  return (
    <button
      type={type}
      disabled={isLoading || disabled}
      onClick={onClick}
      className={`w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors ${className}`}
    >
      {isLoading ? loadingText : text}
    </button>
  );
}