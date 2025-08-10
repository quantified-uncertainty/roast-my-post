import React from 'react';

interface ErrorDisplayProps {
  error: string | null;
  className?: string;
}

/**
 * Standardized error display component for tool pages
 * 
 * @example
 * ```tsx
 * <ErrorDisplay error={error} />
 * ```
 */
export function ErrorDisplay({ error, className = '' }: ErrorDisplayProps) {
  if (!error) return null;
  
  return (
    <div className={`mt-6 p-4 bg-red-50 border border-red-200 rounded-md ${className}`}>
      <p className="text-red-800">Error: {error}</p>
    </div>
  );
}