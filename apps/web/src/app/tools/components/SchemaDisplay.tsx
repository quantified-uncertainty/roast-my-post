'use client';

import { useState, Fragment } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface SchemaField {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  constraints?: string;
  arrayItemSchema?: any; // For array types, store the items schema
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
      arrayItemSchema: prop.type === 'array' && prop.items ? prop.items : undefined,
    });
  }

  return fields;
}

/**
 * Format a property type for display
 */
function formatType(prop: any): string {
  if (prop.enum) {
    return prop.enum.map((v: string) => `"${v}"`).join(' | ');
  }

  if (prop.type === 'array') {
    if (prop.items?.type === 'object') {
      return 'Array<object>';
    }
    return `Array<${prop.items?.type || 'any'}>`;
  }

  if (prop.type === 'object') {
    return 'object';
  }

  return prop.type || 'any';
}

/**
 * Format array item schema as a code block
 */
function formatArrayItemSchema(itemSchema: any): string {
  if (!itemSchema || itemSchema.type !== 'object') {
    return JSON.stringify(itemSchema, null, 2);
  }

  // Build a TypeScript-like interface representation
  const properties = itemSchema.properties || {};
  const required = itemSchema.required || [];

  const lines: string[] = ['{'];

  for (const [name, prop] of Object.entries<any>(properties)) {
    const isRequired = required.includes(name);
    const questionMark = isRequired ? '' : '?';
    const typeStr = formatType(prop);
    const desc = prop.description ? `  // ${prop.description}` : '';
    lines.push(`  ${name}${questionMark}: ${typeStr};${desc}`);
  }

  lines.push('}');
  return lines.join('\n');
}

/**
 * Field name cell with code styling
 */
function FieldNameCell({ name }: { name: string }) {
  return (
    <td className="py-3 px-3">
      <code className="text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs font-mono">
        {name}
      </code>
    </td>
  );
}

/**
 * Type cell with optional constraints
 */
function TypeCell({ type, constraints }: { type: string; constraints?: string }) {
  return (
    <td className="py-3 px-3">
      <code className="text-purple-600 bg-purple-50 px-2 py-1 rounded text-xs font-mono">
        {type}
      </code>
      {constraints && (
        <div className="text-xs text-gray-500 mt-1">{constraints}</div>
      )}
    </td>
  );
}

/**
 * Required badge cell
 */
function RequiredBadgeCell({ required }: { required: boolean }) {
  return (
    <td className="py-3 px-3">
      {required ? (
        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
          Yes
        </span>
      ) : (
        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
          No
        </span>
      )}
    </td>
  );
}

/**
 * Toggle button for showing/hiding schema
 */
function SchemaToggleButton({
  isVisible,
  onToggle
}: {
  isVisible: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
    >
      {isVisible ? (
        <>
          <ChevronDownIcon className="h-3 w-3" />
          Hide schema
        </>
      ) : (
        <>
          <ChevronRightIcon className="h-3 w-3" />
          Show schema
        </>
      )}
    </button>
  );
}

/**
 * Description cell with optional schema toggle
 */
function DescriptionCell({
  description,
  hasArraySchema,
  showSchema,
  onToggleSchema
}: {
  description?: string;
  hasArraySchema: boolean;
  showSchema: boolean;
  onToggleSchema: () => void;
}) {
  return (
    <td className="py-3 px-3 text-gray-600">
      <div>
        {description || <span className="text-gray-400 italic">No description</span>}
      </div>
      {hasArraySchema && (
        <SchemaToggleButton isVisible={showSchema} onToggle={onToggleSchema} />
      )}
    </td>
  );
}

/**
 * Expandable array schema row
 */
function ArraySchemaRow({ itemSchema }: { itemSchema: any }) {
  return (
    <tr className="border-b border-gray-100 bg-gray-50">
      <td colSpan={4} className="py-3 px-3">
        <div className="ml-6">
          <div className="text-xs font-semibold text-gray-600 mb-2">Array Item Schema:</div>
          <pre className="bg-white border border-gray-200 rounded p-3 text-xs font-mono overflow-x-auto">
            {formatArrayItemSchema(itemSchema)}
          </pre>
        </div>
      </td>
    </tr>
  );
}

/**
 * Field row component with optional expandable array schema
 */
function FieldRow({ field }: { field: SchemaField }) {
  const [showSchema, setShowSchema] = useState(false);

  return (
    <Fragment>
      <tr className="border-b border-gray-100">
        <FieldNameCell name={field.name} />
        <TypeCell type={field.type} constraints={field.constraints} />
        <RequiredBadgeCell required={field.required} />
        <DescriptionCell
          description={field.description}
          hasArraySchema={!!field.arrayItemSchema}
          showSchema={showSchema}
          onToggleSchema={() => setShowSchema(!showSchema)}
        />
      </tr>
      {field.arrayItemSchema && showSchema && (
        <ArraySchemaRow itemSchema={field.arrayItemSchema} />
      )}
    </Fragment>
  );
}

/**
 * Schema table header
 */
function SchemaTableHeader() {
  return (
    <thead>
      <tr className="border-b border-gray-200">
        <th className="text-left py-2 px-3 font-semibold text-gray-700">Field</th>
        <th className="text-left py-2 px-3 font-semibold text-gray-700">Type</th>
        <th className="text-left py-2 px-3 font-semibold text-gray-700">Required</th>
        <th className="text-left py-2 px-3 font-semibold text-gray-700">Description</th>
      </tr>
    </thead>
  );
}

/**
 * Schema table body
 */
function SchemaTableBody({ fields }: { fields: SchemaField[] }) {
  return (
    <tbody>
      {fields.map((field) => (
        <FieldRow key={field.name} field={field} />
      ))}
    </tbody>
  );
}

/**
 * Complete schema table
 */
function SchemaTable({ fields }: { fields: SchemaField[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <SchemaTableHeader />
        <SchemaTableBody fields={fields} />
      </table>
    </div>
  );
}

/**
 * Collapsible section header
 */
function CollapsibleHeader({
  title,
  isOpen,
  onToggle
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
    >
      <span className="font-medium text-gray-700">{title}</span>
      {isOpen ? (
        <ChevronDownIcon className="h-5 w-5 text-gray-400" />
      ) : (
        <ChevronRightIcon className="h-5 w-5 text-gray-400" />
      )}
    </button>
  );
}

/**
 * Main schema display component with collapsible content
 */
export function SchemaDisplay({ title, schema, defaultOpen = false }: SchemaDisplayProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const fields = parseJsonSchema(schema);

  return (
    <div className="border-t">
      <CollapsibleHeader
        title={title}
        isOpen={isOpen}
        onToggle={() => setIsOpen(!isOpen)}
      />
      {isOpen && (
        <div className="px-6 pb-4">
          <SchemaTable fields={fields} />
        </div>
      )}
    </div>
  );
}
