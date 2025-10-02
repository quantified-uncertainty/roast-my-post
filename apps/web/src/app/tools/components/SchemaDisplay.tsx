'use client';

import { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface SchemaField {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  constraints?: string;
}

interface SchemaDisplayProps {
  title: string;
  schema: object;
  defaultOpen?: boolean;
}

/**
 * Parse JSON Schema to extract field information in a readable format
 */
function parseJsonSchema(schema: any): SchemaField[] {
  const fields: SchemaField[] = [];
  const properties = schema.properties || {};
  const required = schema.required || [];

  for (const [name, prop] of Object.entries<any>(properties)) {
    const constraints: string[] = [];

    // Type information
    let type = prop.type || 'any';
    if (prop.enum) {
      type = prop.enum.map((v: string) => `"${v}"`).join(' | ');
    }

    // Constraints
    if (prop.minLength !== undefined) constraints.push(`min: ${prop.minLength}`);
    if (prop.maxLength !== undefined) constraints.push(`max: ${prop.maxLength}`);
    if (prop.minimum !== undefined) constraints.push(`min: ${prop.minimum}`);
    if (prop.maximum !== undefined) constraints.push(`max: ${prop.maximum}`);
    if (prop.default !== undefined) constraints.push(`default: ${JSON.stringify(prop.default)}`);

    fields.push({
      name,
      type,
      required: required.includes(name),
      description: prop.description,
      constraints: constraints.length > 0 ? constraints.join(', ') : undefined,
    });
  }

  return fields;
}

export function SchemaDisplay({ title, schema, defaultOpen = false }: SchemaDisplayProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const fields = parseJsonSchema(schema);

  return (
    <div className="border-t">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
      >
        <span className="font-medium text-gray-700">{title}</span>
        {isOpen ? (
          <ChevronDownIcon className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronRightIcon className="h-5 w-5 text-gray-400" />
        )}
      </button>
      {isOpen && (
        <div className="px-6 pb-4">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-semibold text-gray-700">Field</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-700">Type</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-700">Required</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-700">Description</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field) => (
                  <tr key={field.name} className="border-b border-gray-100">
                    <td className="py-3 px-3">
                      <code className="text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs font-mono">
                        {field.name}
                      </code>
                    </td>
                    <td className="py-3 px-3">
                      <code className="text-purple-600 bg-purple-50 px-2 py-1 rounded text-xs font-mono">
                        {field.type}
                      </code>
                      {field.constraints && (
                        <div className="text-xs text-gray-500 mt-1">{field.constraints}</div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {field.required ? (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                          Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                          No
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-gray-600">
                      {field.description || <span className="text-gray-400 italic">No description</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
