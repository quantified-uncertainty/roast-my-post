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
  objectSchema?: any; // For object types, store the object schema
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
      objectSchema: prop.type === 'object' && prop.properties ? prop : undefined,
    });
  }

  return fields;
}

/**
 * Format a property type for display
 */
function formatType(prop: any, depth: number = 0): string {
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
    // Always expand objects with properties
    if (prop.properties) {
      return formatObjectInline(prop, depth);
    }
    return 'object';
  }

  return prop.type || 'any';
}

/**
 * Format nested object inline with indentation
 */
function formatObjectInline(schema: any, depth: number): string {
  const properties = schema.properties || {};
  const required = schema.required || [];
  const indent = '  ';
  const currentIndent = indent.repeat(depth + 1);
  const lines: string[] = ['{'];

  for (const [name, prop] of Object.entries<any>(properties)) {
    const isRequired = required.includes(name);
    const questionMark = isRequired ? '' : '?';
    const typeStr = formatType(prop, depth + 1);
    const desc = prop.description ? `  // ${prop.description}` : '';

    // Handle multi-line nested objects
    if (typeStr.includes('\n')) {
      const nestedLines = typeStr.split('\n');
      // First line: property name and opening brace
      lines.push(`${currentIndent}${name}${questionMark}: ${nestedLines[0]}`);
      // Subsequent lines: already have their relative indentation, add current level
      for (let i = 1; i < nestedLines.length; i++) {
        lines.push(currentIndent + nestedLines[i]);
      }
      // Add semicolon and comment after closing brace
      if (desc) {
        lines[lines.length - 1] = lines[lines.length - 1] + ';' + desc;
      } else {
        lines[lines.length - 1] = lines[lines.length - 1] + ';';
      }
    } else {
      lines.push(`${currentIndent}${name}${questionMark}: ${typeStr};${desc}`);
    }
  }

  lines.push(indent.repeat(depth) + '}');
  return lines.join('\n');
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
  hasSchema,
  showSchema,
  onToggleSchema
}: {
  description?: string;
  hasSchema: boolean;
  showSchema: boolean;
  onToggleSchema: () => void;
}) {
  return (
    <td className="py-3 px-3 text-gray-600">
      <div>
        {description || <span className="text-gray-400 italic">No description</span>}
      </div>
      {hasSchema && (
        <SchemaToggleButton isVisible={showSchema} onToggle={onToggleSchema} />
      )}
    </td>
  );
}

/**
 * Expandable schema row with syntax highlighting (for arrays and objects)
 */
function SchemaRow({ schema, schemaType }: { schema: any; schemaType: 'array' | 'object' }) {
  const schemaContent = formatArrayItemSchema(schema);
  const label = schemaType === 'array' ? 'Array Item Schema:' : 'Object Schema:';

  return (
    <tr className="border-b border-gray-100 bg-gray-50">
      <td colSpan={4} className="py-3 px-3">
        <div className="ml-6">
          <div className="text-xs font-semibold text-gray-600 mb-2">{label}</div>
          <pre className="bg-[#1e293b] text-white border border-gray-200 rounded p-3 text-xs font-mono overflow-x-auto">
            <code>{schemaContent}</code>
          </pre>
        </div>
      </td>
    </tr>
  );
}

/**
 * Create an example object from a schema
 */
function createSchemaExample(schema: any): any {
  if (!schema || schema.type !== 'object' || !schema.properties) {
    return {};
  }

  const example: any = {};
  const properties = schema.properties;
  const required = schema.required || [];

  for (const [name, prop] of Object.entries<any>(properties)) {
    const isRequired = required.includes(name);

    // Include all required fields and common optional fields
    const includeField = isRequired ||
      ['responseTimeMs', 'successfulResponse', 'failedResponse', 'tokenUsage'].includes(name);

    if (includeField) {
      example[name] = createExampleValue(prop, name);
    }
  }

  return example;
}

/**
 * Create an example value based on property type
 */
function createExampleValue(prop: any, fieldName?: string): any {
  if (prop.enum) {
    return prop.enum[0];
  }

  if (prop.type === 'string') {
    // Provide meaningful examples based on field name
    if (fieldName === 'model') return 'anthropic/claude-3-haiku';
    if (fieldName === 'provider') return 'anthropic';
    if (fieldName === 'error') return 'Model evaluation timed out after 120s';
    if (fieldName === 'reasoning') return 'Brief reasoning text';
    return prop.description || 'string';
  }

  if (prop.type === 'number' || prop.type === 'integer') {
    // Provide meaningful examples based on field name
    if (fieldName === 'agreement') return 75;
    if (fieldName === 'confidence') return 85;
    if (fieldName === 'responseTimeMs') return 1234;
    if (fieldName === 'promptTokens' || fieldName === 'completionTokens') return 100;
    if (fieldName === 'totalTokens') return 200;
    if (prop.minimum !== undefined) return prop.minimum;
    if (prop.maximum !== undefined) return Math.floor(prop.maximum / 2);
    return 0;
  }

  if (prop.type === 'boolean') {
    // Provide meaningful examples based on field name
    if (fieldName === 'hasError') return false;
    return false;
  }

  if (prop.type === 'array') {
    return [];
  }

  if (prop.type === 'object' && prop.properties) {
    return createSchemaExample(prop);
  }

  return null;
}

/**
 * Field row component with optional expandable schema
 */
function FieldRow({ field }: { field: SchemaField }) {
  const [showSchema, setShowSchema] = useState(false);
  const hasSchema = !!(field.arrayItemSchema || field.objectSchema);

  return (
    <Fragment>
      <tr className="border-b border-gray-100">
        <FieldNameCell name={field.name} />
        <TypeCell type={field.type} constraints={field.constraints} />
        <RequiredBadgeCell required={field.required} />
        <DescriptionCell
          description={field.description}
          hasSchema={hasSchema}
          showSchema={showSchema}
          onToggleSchema={() => setShowSchema(!showSchema)}
        />
      </tr>
      {field.arrayItemSchema && showSchema && (
        <SchemaRow schema={field.arrayItemSchema} schemaType="array" />
      )}
      {field.objectSchema && showSchema && (
        <SchemaRow schema={field.objectSchema} schemaType="object" />
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
