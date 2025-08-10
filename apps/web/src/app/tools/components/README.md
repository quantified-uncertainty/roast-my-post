# Tool Page Components

## Overview

This directory contains reusable components for building tool pages with consistent UI and functionality. All tool pages now use the **GenericToolPage** architecture for maximum consistency and minimal code duplication.

## Architecture

### GenericToolPage (Recommended)

The primary component for building tool pages. Provides a complete tabbed interface with form handling, validation, and result display.

```typescript
import { GenericToolPage } from '../components/GenericToolPage';
import { MyResultDisplay } from '../components/results/MyResultDisplay';

export default function MyToolPage() {
  return (
    <GenericToolPage<MyInput, MyOutput>
      toolId="my-tool"
      title="My Tool"
      description="Description of what this tool does"
      icon={<MyIcon className="h-8 w-8 text-indigo-600" />}
      fields={[
        {
          type: 'textarea',
          name: 'text',
          label: 'Input Text',
          placeholder: 'Enter text here...',
          required: true,
          examples: ['Example 1', 'Example 2']
        }
      ]}
      submitButtonText="Process"
      loadingText="Processing..."
      validateInput={(input) => input.text.length > 0 || 'Please enter some text'}
      renderResult={(result) => <MyResultDisplay result={result} />}
    />
  );
}
```

### Field Configuration

GenericToolPage supports multiple field types:

```typescript
interface FieldConfig {
  type: 'text' | 'textarea' | 'select' | 'number' | 'checkbox';
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  rows?: number; // For textarea
  min?: number; // For number
  max?: number; // For number
  options?: Array<{ value: string; label: string }>; // For select
  examples?: string[]; // For textarea - shows example buttons
  className?: string; // Custom CSS classes
}
```

### Result Display Components

Create dedicated display components for complex results:

```typescript
// components/results/MyResultDisplay.tsx
interface MyResultDisplayProps {
  result: MyOutput;
  className?: string;
}

export function MyResultDisplay({ result, className = '' }: MyResultDisplayProps) {
  return (
    <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
      {/* Render your results */}
    </div>
  );
}
```

## Direct Schema Access - No API Fetching!

Tool pages have direct access to schemas through the `@roast/ai` package - no need to fetch them via API.

### How It Works

1. **Build-time Schema Generation**
   ```bash
   # In @roast/ai package
   pnpm run generate-schemas
   ```
   This script extracts schemas from all tools and generates a static TypeScript module with JSON Schema representations.

2. **Direct Import in Client Components**
   ```typescript
   import { toolSchemas, getToolReadme } from '@roast/ai';
   
   export default function MyToolPage() {
     // Direct access to schemas - no fetching needed!
     const { inputSchema, outputSchema } = toolSchemas['my-tool-id'];
     const readme = getToolReadme('my-tool-id');
     
     return (
       <GenericToolPage
         toolId="my-tool-id"
         // ... other props
       />
     );
   }
   ```

3. **Benefits**
   - ⚡ **Instant Loading** - No loading states for schemas
   - 🔒 **Type Safety** - Full TypeScript support
   - 📦 **Bundle Efficiency** - Only includes schemas you actually use
   - 🚀 **Better UX** - Documentation tab loads immediately

## Component Structure

- **`GenericToolPage.tsx`** - Main tool page component with tabbed interface
- **`TabbedToolPageLayout.tsx`** - Layout wrapper with tabs and navigation
- **`ToolDocumentation.tsx`** - Documentation tab content
- **`common/`** - Shared form components (ErrorDisplay, SubmitButton, etc.)
- **`results/`** - Result display components for different tool types
- **`hooks/`** - Custom hooks like `useToolExecution`

## Migration Notes

All 15 tools have been successfully migrated to use GenericToolPage, achieving:
- **65% average code reduction** per tool
- **Consistent UX patterns** across all tools
- **Centralized error handling and validation**
- **Reusable result display components**

## Adding New Tools

1. Create the tool page using GenericToolPage
2. Create a result display component if needed
3. Add examples to `utils/exampleTexts.ts`
4. Export any new display components from `results/index.ts`

The GenericToolPage handles all common functionality (forms, validation, tabs, documentation), leaving you to focus only on tool-specific logic and result presentation.