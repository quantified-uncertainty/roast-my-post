# Tool Form Autogeneration Implementation Guide

*Created: July 15, 2025*

## Executive Summary

This guide provides a comprehensive plan to automate ~70% of tool form generation in the RoastMyPost platform. By leveraging existing Zod schemas and creating reusable form components, we can dramatically reduce code duplication while maintaining type safety and customization flexibility.

## Current State Analysis

### Existing Tool Architecture ✅
The platform already has excellent foundations:
- **Zod Schemas**: All tools have well-defined input/output schemas
- **Standardized API Routes**: `createToolRoute()` provides consistent backend handling
- **Type Safety**: Full TypeScript integration throughout

### Current Pain Points 🔴
- **200-300 lines of boilerplate** per tool page
- **Repeated form patterns** across all tools
- **Manual state management** for each input field
- **Inconsistent UX patterns** between tools
- **Maintenance overhead** when updating common functionality

### Form Code Analysis
**Automatable (70%+):**
- Basic form fields (text, textarea, number, select, checkbox)
- State management for form inputs
- Loading states and error handling
- API submission logic
- Basic form validation from Zod schemas
- Standard layout patterns

**Tool-Specific (30%):**
- Complex results rendering
- Tool-specific example data
- Custom validation messages
- Specialized input components
- Unique UX requirements

## Architecture Design

### Core Components

#### 1. `AutoToolForm<T>` Component
```typescript
interface AutoToolFormProps<T> {
  schema: z.ZodSchema<T>;
  onSubmit: (data: T) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  config?: FormConfig<T>;
  defaultValues?: Partial<T>;
}

interface FormConfig<T> {
  fieldOrder?: (keyof T)[];
  fieldGroups?: FieldGroup<T>[];
  customComponents?: Partial<Record<keyof T, React.ComponentType<any>>>;
  submitButtonText?: string;
  submitButtonColor?: string;
  examples?: Partial<T>;
}
```

#### 2. `ToolPageTemplate` Component
```typescript
interface ToolPageTemplateProps<TInput, TOutput> {
  tool: Tool<TInput, TOutput>;
  renderResults?: (result: TOutput) => React.ReactNode;
  formConfig?: FormConfig<TInput>;
  examples?: ExampleConfig<TInput>;
}
```

#### 3. Schema Enhancement System
```typescript
// Extend Zod schemas with UI hints
const enhancedSchema = z.object({
  text: z.string()
    .min(1)
    .max(10000)
    .describe('The text to analyze')
    .ui({
      component: 'textarea',
      rows: 10,
      placeholder: 'Paste your text here...',
      example: 'Sample text for analysis'
    }),
  agentInstructions: z.string()
    .optional()
    .describe('Special instructions for the AI agent')
    .ui({
      component: 'textarea',
      rows: 3,
      group: 'advanced'
    })
});
```

## Implementation Plan

### Phase 1: Foundation Components (Week 1-2)

#### Step 1.1: Create Form Field Mappers
```typescript
// src/components/tools/form-generators/FieldMapper.ts
export const mapZodToFormField = (
  key: string,
  zodDef: z.ZodTypeDef,
  value: any,
  onChange: (value: any) => void,
  config?: FieldConfig
) => {
  // Map Zod types to appropriate form components
  switch (zodDef._type) {
    case 'ZodString':
      return config?.component === 'textarea' 
        ? <TextareaField {...props} />
        : <TextInputField {...props} />;
    case 'ZodNumber':
      return <NumberInputField {...props} />;
    case 'ZodBoolean':
      return <CheckboxField {...props} />;
    case 'ZodEnum':
      return <SelectField options={zodDef.values} {...props} />;
    default:
      return <TextInputField {...props} />;
  }
};
```

#### Step 1.2: Build Core Form Components
```typescript
// src/components/tools/form-generators/AutoToolForm.tsx
export function AutoToolForm<T>({ 
  schema, 
  onSubmit, 
  isLoading, 
  error,
  config,
  defaultValues 
}: AutoToolFormProps<T>) {
  const [formData, setFormData] = useState<Partial<T>>(defaultValues || {});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedData = schema.parse(formData);
      await onSubmit(validatedData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Convert Zod errors to form field errors
        setValidationErrors(mapZodErrorsToFields(error));
      }
    }
  };

  const renderFields = () => {
    const shape = schema._def.shape();
    const fieldOrder = config?.fieldOrder || Object.keys(shape);
    
    return fieldOrder.map(key => {
      const zodDef = shape[key];
      const fieldConfig = config?.fieldConfigs?.[key];
      
      return (
        <div key={key} className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            {getFieldLabel(key, zodDef)}
            {!zodDef.isOptional() && <span className="text-red-500">*</span>}
          </label>
          
          {mapZodToFormField(
            key,
            zodDef,
            formData[key],
            (value) => setFormData(prev => ({ ...prev, [key]: value })),
            fieldConfig
          )}
          
          {validationErrors[key] && (
            <p className="text-sm text-red-600">{validationErrors[key]}</p>
          )}
        </div>
      );
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-sm border">
      {renderFields()}
      
      {config?.examples && (
        <ExampleSelector 
          examples={config.examples}
          onSelect={(example) => setFormData(example)}
        />
      )}
      
      <button
        type="submit"
        disabled={isLoading}
        className={`w-full py-2 px-4 rounded-md transition-colors ${
          config?.submitButtonColor || 'bg-blue-600 hover:bg-blue-700'
        } text-white disabled:bg-gray-400`}
      >
        {isLoading ? 'Processing...' : (config?.submitButtonText || 'Submit')}
      </button>
      
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">Error: {error}</p>
        </div>
      )}
    </form>
  );
}
```

#### Step 1.3: Create Tool Page Template
```typescript
// src/components/tools/ToolPageTemplate.tsx
export function ToolPageTemplate<TInput, TOutput>({
  tool,
  renderResults,
  formConfig,
  examples
}: ToolPageTemplateProps<TInput, TOutput>) {
  const [result, setResult] = useState<TOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: TInput) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/tools/${tool.config.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed: ${response.statusText}`);
      }

      const responseData = await response.json();
      setResult(responseData.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link href="/tools" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6">
        <ChevronLeftIcon className="h-4 w-4 mr-1" />
        Back to Tools
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{tool.config.name}</h1>
        <p className="text-gray-600">{tool.config.description}</p>
        {tool.config.costEstimate && (
          <p className="text-sm text-gray-500 mt-1">Cost: {tool.config.costEstimate}</p>
        )}
      </div>

      <AutoToolForm
        schema={tool.inputSchema}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        error={error}
        config={formConfig}
      />

      {result && renderResults && (
        <div className="mt-8">
          {renderResults(result)}
        </div>
      )}
    </div>
  );
}
```

### Phase 2: Schema Enhancement (Week 2-3)

#### Step 2.1: Create UI Extension System
```typescript
// src/lib/schema-ui-extensions.ts
declare module 'zod' {
  interface ZodTypeDef {
    ui?: UIConfig;
  }
  
  interface ZodType<Output, Def, Input> {
    ui(config: UIConfig): this;
  }
}

interface UIConfig {
  component?: 'input' | 'textarea' | 'select' | 'checkbox' | 'number' | 'custom';
  placeholder?: string;
  rows?: number;
  group?: string;
  order?: number;
  example?: any;
  helpText?: string;
  customComponent?: React.ComponentType<any>;
}

// Extend Zod prototype
z.ZodType.prototype.ui = function(config: UIConfig) {
  this._def.ui = config;
  return this;
};
```

#### Step 2.2: Update Existing Tool Schemas
```typescript
// Example: Enhanced schema for math-checker
const inputSchema = z.object({
  text: z.string()
    .min(1)
    .max(50000)
    .describe('The text to check for mathematical errors')
    .ui({
      component: 'textarea',
      rows: 10,
      placeholder: 'Paste text containing calculations, statistics, or mathematical claims...',
      example: exampleMathText
    }),
  context: z.string()
    .max(1000)
    .optional()
    .describe('Additional context about the text')
    .ui({
      component: 'textarea',
      rows: 3,
      group: 'advanced',
      placeholder: 'Optional context to help with analysis...'
    }),
  maxErrors: z.number()
    .min(1)
    .max(100)
    .optional()
    .default(50)
    .describe('Maximum number of errors to return')
    .ui({
      component: 'number',
      group: 'advanced'
    })
});
```

### Phase 3: Migration Strategy (Week 3-4)

#### Step 3.1: Create Migration Helper
```typescript
// src/tools/migration/convertToAutoForm.ts
export function convertToolPageToAutoForm(
  toolId: string,
  customResultsRenderer?: React.ComponentType<any>
) {
  return `
'use client';

import { ToolPageTemplate } from '@/components/tools/ToolPageTemplate';
import ${toolId}Tool from '@/tools/${toolId}';

export default function ${pascalCase(toolId)}Page() {
  return (
    <ToolPageTemplate
      tool={${toolId}Tool}
      renderResults={${customResultsRenderer ? 'CustomResults' : 'DefaultResults'}}
      formConfig={{
        submitButtonColor: 'bg-${getToolColor(toolId)}-600 hover:bg-${getToolColor(toolId)}-700',
        examples: {
          // Add tool-specific examples here
        }
      }}
    />
  );
}

${customResultsRenderer ? 'function CustomResults(result: any) { /* Custom rendering */ }' : ''}
function DefaultResults(result: any) {
  return <pre className="bg-gray-100 p-4 rounded">{JSON.stringify(result, null, 2)}</pre>;
}
`;
}
```

#### Step 3.2: Incremental Migration Plan
1. **Start with simplest tools** (math-checker, check-spelling-grammar)
2. **Migrate medium complexity** (extract-forecastable-claims, perplexity-research)
3. **Handle complex tools last** (forecaster-simple with custom results)
4. **Maintain backward compatibility** during transition

### Phase 4: Advanced Features (Week 4-5)

#### Step 4.1: Field Grouping and Conditional Logic
```typescript
interface FieldGroup<T> {
  name: string;
  fields: (keyof T)[];
  collapsible?: boolean;
  defaultExpanded?: boolean;
  conditions?: {
    field: keyof T;
    value: any;
    operator: 'equals' | 'not_equals' | 'greater_than' | 'includes';
  }[];
}

// Example: Advanced form with grouped fields
const formConfig: FormConfig<PerplexityInput> = {
  fieldGroups: [
    {
      name: 'Basic Settings',
      fields: ['query', 'focusArea'],
      defaultExpanded: true
    },
    {
      name: 'Advanced Options',
      fields: ['maxSources', 'includeForecastingContext'],
      collapsible: true,
      defaultExpanded: false
    }
  ]
};
```

#### Step 4.2: Dynamic Examples System
```typescript
interface ExampleConfig<T> {
  examples: Array<{
    name: string;
    description: string;
    data: Partial<T>;
  }>;
  showExampleButton?: boolean;
  exampleButtonText?: string;
}

// Usage in tool page
const exampleConfig: ExampleConfig<MathCheckerInput> = {
  examples: [
    {
      name: 'Revenue Analysis',
      description: 'Text with calculation errors in financial data',
      data: {
        text: `Our analysis shows that revenue grew by 50% from $2 million to $3.5 million 
last year. With a 15% profit margin, that means we made $525,000 in profit (15% of $3.5 million).`
      }
    }
  ]
};
```

## Implementation Benefits

### Quantified Improvements
- **~70% reduction** in form-related code per tool
- **~200-250 lines saved** per tool page (from ~300 to ~50-75)
- **Consistent UX** across all tool interfaces
- **Type safety maintained** through Zod schema integration
- **50% faster development** for new tools

### Quality Improvements
- **Standardized error handling** across all forms
- **Consistent loading states** and user feedback
- **Automatic form validation** from schemas
- **Better accessibility** through standardized components
- **Easier maintenance** with centralized form logic

## Testing Strategy

### Unit Tests
```typescript
// Test form generation from schemas
describe('AutoToolForm', () => {
  it('generates correct form fields from Zod schema', () => {
    const schema = z.object({
      text: z.string().ui({ component: 'textarea' }),
      count: z.number().min(1).max(10)
    });
    
    render(<AutoToolForm schema={schema} onSubmit={jest.fn()} />);
    
    expect(screen.getByLabelText(/text/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/count/i)).toHaveAttribute('type', 'number');
  });
});
```

### Integration Tests
```typescript
// Test full tool page functionality
describe('ToolPageTemplate Integration', () => {
  it('submits form data to correct API endpoint', async () => {
    const mockTool = {
      config: { id: 'test-tool', name: 'Test Tool' },
      inputSchema: z.object({ text: z.string() })
    };
    
    render(<ToolPageTemplate tool={mockTool} />);
    
    // Test form submission and API call
  });
});
```

### Migration Testing
- **Side-by-side comparison** of old vs new pages
- **Visual regression testing** to ensure UI consistency
- **Performance benchmarks** to verify no degradation
- **User acceptance testing** with existing tool users

## Performance Considerations

### Optimization Strategies
1. **Lazy loading** of complex form components
2. **Memoization** of form field generation
3. **Debounced validation** for real-time feedback
4. **Code splitting** for tool-specific customizations

### Bundle Size Impact
- **Shared components** reduce overall bundle size
- **Tree shaking** removes unused form field types
- **Dynamic imports** for custom components

## Migration Timeline

### Week 1-2: Foundation
- [ ] Build core `AutoToolForm` component
- [ ] Create `ToolPageTemplate` structure
- [ ] Implement basic field mappers
- [ ] Set up testing framework

### Week 2-3: Enhancement System
- [ ] Implement Zod UI extensions
- [ ] Add field grouping and conditional logic
- [ ] Create example system
- [ ] Update 2-3 tool schemas

### Week 3-4: Migration
- [ ] Convert math-checker tool (simplest)
- [ ] Convert extract-forecastable-claims tool
- [ ] Convert perplexity-research tool
- [ ] Document migration patterns

### Week 4-5: Advanced Features
- [ ] Add complex results rendering system
- [ ] Convert forecaster-simple (most complex)
- [ ] Performance optimization
- [ ] Documentation and examples

### Week 5-6: Finalization
- [ ] Convert remaining tools
- [ ] Comprehensive testing
- [ ] Performance benchmarking
- [ ] User acceptance testing

## Future Enhancements

### Potential Additions
1. **Visual form builder** for non-technical users
2. **A/B testing framework** for form variations
3. **Analytics integration** for form completion tracking
4. **Multi-step forms** for complex workflows
5. **Real-time collaboration** on form inputs

### Maintenance Strategy
- **Regular schema updates** as tools evolve
- **Component library expansion** for new field types
- **Performance monitoring** and optimization
- **User feedback integration** for UX improvements

## Conclusion

This autogeneration system will significantly reduce development time for tool interfaces while improving consistency and maintainability. The phased approach ensures minimal disruption during implementation, and the focus on preserving existing type safety and validation makes it a natural evolution of the current architecture.

The 70% automation target is achievable through the systematic approach outlined here, with clear escape hatches for the 30% of functionality that requires custom implementation.