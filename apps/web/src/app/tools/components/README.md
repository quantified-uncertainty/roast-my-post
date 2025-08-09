# Tool Page Components

## Overview

This directory contains reusable components for building tool pages with consistent UI and functionality.

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
   import { toolSchemas } from '@roast/ai';
   
   export default function MyToolPage() {
     // Direct access to schemas - no fetching needed!
     const { inputSchema, outputSchema } = toolSchemas['my-tool-id'];
     
     return (
       <ToolPageTemplate
         inputSchema={inputSchema}
         outputSchema={outputSchema}
         // ... other props
       />
     );
   }
   ```

## Components

### ToolPageTemplate

The base template component that provides:
- Consistent UI layout for all tool pages
- Input/output handling
- API documentation display using the provided schemas
- Error handling
- Loading states

### ~~ToolPageWithSchemas~~ (Deprecated)

This component that fetched schemas via API is no longer needed since we have direct access to schemas.

## Benefits of Direct Schema Access

1. **No Runtime Fetching**: Schemas are available immediately, no loading states
2. **Build-time Validation**: Schema generation fails at build time if tools are broken
3. **Better Performance**: No extra API calls on page load
4. **Type Safety**: TypeScript knows exactly which tool IDs are available
5. **Single Source of Truth**: Schemas generated directly from tool Zod definitions

## Example: Complete Tool Page

```typescript
'use client';

import { DocumentTextIcon } from '@heroicons/react/24/outline';
import { toolSchemas } from '@roast/ai';
import { ToolPageTemplate } from '../components/ToolPageTemplate';
import type { MyToolOutput } from '@roast/ai';

export default function MyToolPage() {
  // Get schemas directly - no API fetch needed!
  const { inputSchema, outputSchema } = toolSchemas['my-tool-id'];
  
  return (
    <ToolPageTemplate<{ text: string }, MyToolOutput>
      title="My Tool"
      description="Tool description"
      icon={DocumentTextIcon}
      toolId="my-tool-id"
      inputSchema={inputSchema}
      outputSchema={outputSchema}
      renderResult={(result) => <div>{/* render result */}</div>}
      prepareInput={(text) => ({ text })}
    />
  );
}
```

## Adding a New Tool

1. Create the tool in `@roast/ai/src/tools/`
2. Add it to the generation script in `@roast/ai/scripts/generate-schemas.ts`
3. Run `pnpm --filter @roast/ai run generate-schemas`
4. Create the tool page using the generated schemas
5. The schemas will be automatically available via import

## Why Not Fetch?

The original approach of fetching schemas via API was unnecessary complexity:
- The app has direct access to the `@roast/ai` package
- Client components can import the generated schemas directly
- No need for loading states or error handling for schema fetching
- Better developer experience with TypeScript autocomplete for tool IDs