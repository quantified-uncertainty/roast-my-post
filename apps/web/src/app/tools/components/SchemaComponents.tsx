'use client';

import { useState, ReactNode } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

// ============================================================================
// Collapsible Section Component - The main building block
// ============================================================================

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
  icon?: ReactNode;
  badge?: string;
  borderBottom?: boolean;
}

export function CollapsibleSection({
  title,
  defaultOpen = false,
  className = '',
  children,
  icon,
  badge,
  borderBottom = true,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`${borderBottom ? 'border-b' : ''} ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-gray-700">{title}</span>
          {badge && (
            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
              {badge}
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronDownIcon className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronRightIcon className="h-5 w-5 text-gray-400" />
        )}
      </button>
      {isOpen && <div className="px-6 pb-4">{children}</div>}
    </div>
  );
}

// ============================================================================
// Schema Display Component - For showing JSON schemas
// ============================================================================

interface SchemaDisplayProps {
  schema: any;
  className?: string;
}

export function SchemaDisplay({ schema, className = 'bg-gray-50' }: SchemaDisplayProps) {
  return (
    <pre className={`text-xs ${className} p-3 rounded overflow-x-auto`}>
      {JSON.stringify(schema, null, 2)}
    </pre>
  );
}

// ============================================================================
// Example Display Component - For showing example inputs/outputs
// ============================================================================

interface ExampleDisplayProps {
  title: string;
  data: any;
  className?: string;
}

export function ExampleDisplay({ 
  title, 
  data, 
  className = 'bg-blue-50' 
}: ExampleDisplayProps) {
  if (!data) return null;
  
  return (
    <div className="mt-4">
      <h5 className="text-sm font-medium text-gray-700 mb-2">{title}:</h5>
      <pre className={`text-xs ${className} p-3 rounded overflow-x-auto`}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

// ============================================================================
// Code Example Component - For showing code snippets
// ============================================================================

interface CodeExampleProps {
  language: string;
  code: string;
  className?: string;
}

export function CodeExample({ 
  language, 
  code, 
  className = 'bg-gray-50' 
}: CodeExampleProps) {
  return (
    <div>
      <h5 className="text-sm font-medium text-gray-700 mb-2">{language}:</h5>
      <pre className={`text-xs ${className} p-3 rounded overflow-x-auto`}>
        {code}
      </pre>
    </div>
  );
}

// ============================================================================
// API Documentation Container - Wrapper with consistent styling
// ============================================================================

interface ApiDocumentationContainerProps {
  title?: string;
  description?: string;
  endpoint?: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ApiDocumentationContainer({
  title = 'API Documentation',
  description,
  endpoint,
  icon,
  children,
  className = '',
}: ApiDocumentationContainerProps) {
  return (
    <div className={`bg-white shadow rounded-lg ${className}`}>
      {(title || description || endpoint) && (
        <div className="px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          </div>
          {description && (
            <p className="mt-2 text-sm text-gray-600">{description}</p>
          )}
          {endpoint && (
            <div className="mt-2">
              <code className="text-xs bg-gray-100 px-2 py-1 rounded">POST {endpoint}</code>
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

// ============================================================================
// Schema Section - Convenience component for schema + example
// ============================================================================

interface SchemaSectionProps {
  title: string;
  schema: any;
  example?: any;
  exampleTitle?: string;
  exampleClassName?: string;
  defaultOpen?: boolean;
  borderBottom?: boolean;
}

export function SchemaSection({
  title,
  schema,
  example,
  exampleTitle,
  exampleClassName = 'bg-blue-50',
  defaultOpen = false,
  borderBottom = true,
}: SchemaSectionProps) {
  return (
    <CollapsibleSection 
      title={title} 
      defaultOpen={defaultOpen}
      borderBottom={borderBottom}
    >
      <SchemaDisplay schema={schema} />
      {example && exampleTitle && (
        <ExampleDisplay 
          title={exampleTitle} 
          data={example} 
          className={exampleClassName} 
        />
      )}
    </CollapsibleSection>
  );
}

// ============================================================================
// Status Badge Component - For showing status indicators
// ============================================================================

interface StatusBadgeProps {
  status: 'success' | 'error' | 'warning' | 'info';
  text: string;
  className?: string;
}

export function StatusBadge({ status, text, className = '' }: StatusBadgeProps) {
  const statusClasses = {
    success: 'bg-green-100 text-green-800',
    error: 'bg-red-100 text-red-800',
    warning: 'bg-yellow-100 text-yellow-800',
    info: 'bg-blue-100 text-blue-800',
  };

  return (
    <span className={`text-xs px-2 py-1 rounded ${statusClasses[status]} ${className}`}>
      {text}
    </span>
  );
}

// ============================================================================
// Metric Display Component - For showing key metrics
// ============================================================================

interface MetricDisplayProps {
  label: string;
  value: string | number;
  unit?: string;
  className?: string;
}

export function MetricDisplay({ 
  label, 
  value, 
  unit, 
  className = '' 
}: MetricDisplayProps) {
  return (
    <div className={`${className}`}>
      <span className="text-sm text-gray-600">{label}:</span>
      <span className="text-sm font-medium ml-2">
        {value}{unit && ` ${unit}`}
      </span>
    </div>
  );
}