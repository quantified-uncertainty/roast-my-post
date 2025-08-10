# Tool Pages DRY Improvements Proposal

## Current State Analysis

After converting all tool pages to the tabbed layout, I've identified significant repetition across the 17 tool pages. Each page averages 200-250 lines of code with ~60-70% being boilerplate.

## Identified Patterns & Repetition

### 1. State Management Pattern (17x repetition)
Every tool page has identical state management:
```tsx
const [input, setInput] = useState('');
const [result, setResult] = useState<ResultType | null>(null);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
```

### 2. Form Submission Logic (17x repetition)
```tsx
const handleSubmit = async () => {
  if (!input.trim()) return;
  setIsLoading(true);
  setError(null);
  setResult(null);
  try {
    const response = await runToolWithAuth<InputType, OutputType>(
      '/api/tools/tool-name',
      { ...inputs }
    );
    setResult(response);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'An error occurred');
  } finally {
    setIsLoading(false);
  }
};
```

### 3. Error Display Component (17x repetition)
```tsx
{error && (
  <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
    <p className="text-red-800">Error: {error}</p>
  </div>
)}
```

### 4. Loading Button State (17x repetition)
```tsx
<button
  type="submit"
  disabled={isLoading || !input.trim()}
  className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
>
  {isLoading ? 'Processing...' : 'Submit'}
</button>
```

## Proposed Solutions

### Solution 1: Custom Hook - `useToolExecution`
Create a reusable hook that encapsulates all state management and execution logic:

```tsx
// hooks/useToolExecution.ts
export function useToolExecution<TInput, TOutput>(
  apiPath: string,
  options?: {
    validateInput?: (input: TInput) => boolean;
    processResponse?: (response: TOutput) => TOutput;
  }
) {
  const [result, setResult] = useState<TOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (input: TInput) => {
    if (options?.validateInput && !options.validateInput(input)) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      let response = await runToolWithAuth<TInput, TOutput>(apiPath, input);
      if (options?.processResponse) {
        response = options.processResponse(response);
      }
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [apiPath, options]);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { result, isLoading, error, execute, reset };
}
```

### Solution 2: Common UI Components

#### ErrorDisplay Component
```tsx
// components/tools/ErrorDisplay.tsx
export function ErrorDisplay({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
      <p className="text-red-800">Error: {error}</p>
    </div>
  );
}
```

#### SubmitButton Component
```tsx
// components/tools/SubmitButton.tsx
export function SubmitButton({ 
  isLoading, 
  disabled, 
  loadingText = 'Processing...', 
  text = 'Submit' 
}: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={isLoading || disabled}
      className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
    >
      {isLoading ? loadingText : text}
    </button>
  );
}
```

#### TextAreaField Component
```tsx
// components/tools/TextAreaField.tsx
export function TextAreaField({
  id,
  label,
  value,
  onChange,
  placeholder,
  rows = 6,
  required = false,
  exampleText,
  onLoadExample
}: TextAreaFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        rows={rows}
        placeholder={placeholder}
        required={required}
      />
      {exampleText && onLoadExample && (
        <button
          type="button"
          onClick={onLoadExample}
          className="mt-2 text-sm text-indigo-600 hover:text-indigo-500"
        >
          Load example text
        </button>
      )}
    </div>
  );
}
```

### Solution 3: Generic Tool Page Component
For simple tools that follow the exact same pattern:

```tsx
// components/tools/GenericToolPage.tsx
export function GenericToolPage<TInput, TOutput>({
  toolId,
  title,
  description,
  icon,
  fields,
  exampleInput,
  renderResult,
  submitButtonText = 'Submit',
  loadingText = 'Processing...'
}: GenericToolPageProps<TInput, TOutput>) {
  const { inputSchema, outputSchema } = toolSchemas[toolId];
  const { result, isLoading, error, execute } = useToolExecution<TInput, TOutput>(
    `/api/tools/${toolId}`
  );
  
  const [formData, setFormData] = useState<TInput>(getDefaultValues(fields));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    execute(formData);
  };

  const tryContent = (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-sm border">
        {fields.map(field => (
          <DynamicField
            key={field.name}
            field={field}
            value={formData[field.name]}
            onChange={(value) => setFormData({...formData, [field.name]: value})}
          />
        ))}
        <SubmitButton 
          isLoading={isLoading}
          disabled={!isFormValid(formData, fields)}
          text={submitButtonText}
          loadingText={loadingText}
        />
      </form>
      <ErrorDisplay error={error} />
      {result && renderResult(result)}
    </div>
  );

  const docsContent = (
    <ToolDocumentation
      toolId={toolId}
      inputSchema={inputSchema}
      outputSchema={outputSchema}
      readmeContent={getToolReadme(toolId)}
    />
  );

  return (
    <TabbedToolPageLayout
      title={title}
      description={description}
      icon={icon}
      tryContent={tryContent}
      docsContent={docsContent}
    />
  );
}
```

### Solution 4: Tool Configuration Pattern
Define tools declaratively:

```tsx
// tools/configurations.ts
export const toolConfigurations = {
  'check-spelling-grammar': {
    title: 'Check Spelling & Grammar',
    icon: SpellCheckIcon,
    fields: [
      {
        type: 'textarea',
        name: 'text',
        label: 'Text to check',
        required: true,
        rows: 8,
        placeholder: 'Enter text to check for spelling and grammar errors...'
      },
      {
        type: 'select',
        name: 'dialect',
        label: 'English Dialect',
        options: [
          { value: 'US', label: 'US English' },
          { value: 'UK', label: 'UK English' }
        ],
        defaultValue: 'US'
      }
    ],
    renderResult: (result: SpellingGrammarOutput) => (
      <SpellingGrammarResult result={result} />
    ),
    exampleInput: {
      text: 'This are a example text with grammer mistake.',
      dialect: 'US'
    }
  }
};

// Then use it:
export default function CheckSpellingGrammarPage() {
  const config = toolConfigurations['check-spelling-grammar'];
  return <GenericToolPage {...config} toolId="check-spelling-grammar" />;
}
```

## Implementation Priority

### Phase 1: Common Components (Quick Win)
- Extract ErrorDisplay, SubmitButton, TextAreaField components
- Estimated effort: 2 hours
- Impact: Remove ~200 lines of duplication

### Phase 2: useToolExecution Hook
- Create and test the hook
- Migrate 2-3 simple tools as proof of concept
- Estimated effort: 3 hours
- Impact: Remove ~400 lines of duplication

### Phase 3: GenericToolPage for Simple Tools
- Implement generic page component
- Migrate simple tools (spelling, language detection, etc.)
- Estimated effort: 4 hours
- Impact: Reduce simple tool pages from 200 lines to ~30 lines each

### Phase 4: Configuration-Based Tools
- Create configuration system
- Migrate all applicable tools
- Estimated effort: 6 hours
- Impact: Most tool pages become ~20 line configuration objects

## Expected Outcomes

### Before
- 17 tool pages × ~220 lines = ~3,740 lines
- 60-70% duplication
- Maintenance burden: High
- New tool creation: Copy-paste prone to errors

### After
- Shared components: ~500 lines
- Tool configurations: 17 × ~30 lines = ~510 lines
- Complex tool pages: 5 × ~100 lines = ~500 lines
- **Total: ~1,510 lines (60% reduction)**
- Maintenance burden: Low
- New tool creation: Define configuration object

## Migration Strategy

1. **Non-Breaking**: All changes can be made incrementally without breaking existing tools
2. **Gradual Adoption**: Tools can be migrated one at a time
3. **Type Safety**: Full TypeScript support maintained throughout
4. **Testing**: Each abstraction can be unit tested independently

## Risks & Mitigations

### Risk: Over-abstraction
**Mitigation**: Keep escape hatches for complex tools that need custom behavior

### Risk: Performance regression
**Mitigation**: Use React.memo and useCallback appropriately

### Risk: Debugging complexity
**Mitigation**: Keep abstractions shallow, use descriptive names, add comprehensive logging

## Next Steps

1. Review and approve proposal
2. Create feature branch
3. Implement Phase 1 (Common Components)
4. Test with 1-2 tools
5. Gather feedback
6. Continue with remaining phases

## Alternative Consideration: Code Generation

Instead of runtime abstractions, we could use code generation:
- Define tools in a schema
- Generate the full page code at build time
- Pros: No runtime overhead, fully customizable
- Cons: More complex build process, generated code needs maintenance

This could be explored as a Phase 5 if the abstraction approach proves limiting.