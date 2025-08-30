'use client';

import { notFound } from 'next/navigation';
import { toolRegistry, toolSchemas, type ToolId } from '@roast/ai';
import { useState } from 'react';
import { 
  CalculatorIcon, 
  DocumentTextIcon, 
  MagnifyingGlassIcon,
  LinkIcon,
  ChartBarIcon,
  BeakerIcon,
  DocumentMagnifyingGlassIcon,
  LanguageIcon,
  ClipboardDocumentCheckIcon,
  ScaleIcon,
  CloudIcon
} from '@heroicons/react/24/outline';
import { GenericToolDocsPage } from '../../components/GenericToolDocsPage';
import { GenericToolTryPage } from '../../components/GenericToolTryPage';
import { MathCheckDisplay } from '../../components/results/MathCheckDisplay';
import { toolExamples as exampleConfigs } from '../../utils/toolExamples';

// Map tool IDs to their icons
const toolIcons: Record<string, React.ReactElement> = {
  'check-math': <CalculatorIcon className="h-8 w-8 text-blue-600" />,
  'check-math-hybrid': <CalculatorIcon className="h-8 w-8 text-purple-600" />,
  'check-math-with-mathjs': <CalculatorIcon className="h-8 w-8 text-green-600" />,
  'check-spelling-grammar': <DocumentTextIcon className="h-8 w-8 text-red-600" />,
  'detect-language-convention': <LanguageIcon className="h-8 w-8 text-indigo-600" />,
  'document-chunker': <DocumentMagnifyingGlassIcon className="h-8 w-8 text-orange-600" />,
  'extract-factual-claims': <ClipboardDocumentCheckIcon className="h-8 w-8 text-teal-600" />,
  'extract-forecasting-claims': <ChartBarIcon className="h-8 w-8 text-yellow-600" />,
  'extract-math-expressions': <CalculatorIcon className="h-8 w-8 text-pink-600" />,
  'fact-checker': <ScaleIcon className="h-8 w-8 text-emerald-600" />,
  'forecaster': <ChartBarIcon className="h-8 w-8 text-blue-600" />,
  'fuzzy-text-locator': <MagnifyingGlassIcon className="h-8 w-8 text-violet-600" />,
  'link-validator': <LinkIcon className="h-8 w-8 text-cyan-600" />,
  'perplexity-research': <CloudIcon className="h-8 w-8 text-slate-600" />,
};

// Tool-specific result renderers
const toolResultRenderers: Record<string, (result: any, extra?: any) => React.ReactElement> = {
  'check-math': (result, extra) => <MathCheckDisplay result={result} statement={extra?.statement} variant="basic" />,
  'check-math-hybrid': (result, extra) => <MathCheckDisplay result={result} statement={extra?.statement} variant="hybrid" />,
  'check-math-with-mathjs': (result, extra) => <MathCheckDisplay result={result} statement={extra?.statement} variant="mathjs" />,
  // Add more custom renderers as needed
  // Default renderer for tools without custom display
  'default': (result) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h3 className="text-lg font-semibold mb-4">Result</h3>
      <pre className="bg-gray-50 p-4 rounded overflow-x-auto">
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  ),
};


interface ToolPageProps {
  params: {
    toolId: string;
    slug: string[];
  };
}

export default function ToolPage({ params }: ToolPageProps) {
  const { toolId, slug } = params;
  const [lastStatement, setLastStatement] = useState('');
  
  // Check if tool exists in registry
  if (toolId === 'getMetadata' || !(toolId in toolRegistry)) {
    notFound();
  }
  const tool = toolRegistry[toolId as keyof Omit<typeof toolRegistry, 'getMetadata'>];
  
  // Get tool schemas
  const schemas = toolSchemas[toolId as ToolId];
  if (!schemas) {
    notFound();
  }
  
  const toolConfig = tool.config;
  const icon = toolIcons[toolId] || <BeakerIcon className="h-8 w-8 text-gray-600" />;
  const examples = exampleConfigs[toolId] || [];
  
  // Determine page type from slug
  const pageType = slug?.[0] || 'docs'; // Default to docs if no slug
  
  // Get the appropriate result renderer
  const resultRenderer = toolResultRenderers[toolId] || toolResultRenderers.default;
  
  // Build fields configuration based on tool input schema
  const buildFields = () => {
    const fields: any[] = [];
    const schema = schemas.inputSchema as any;
    
    if (schema?.properties) {
      Object.entries(schema.properties).forEach(([name, prop]: [string, any]) => {
        fields.push({
          type: prop.type === 'string' && (prop.maxLength > 100 || name.includes('text') || name.includes('Text')) ? 'textarea' : 
                prop.type === 'number' ? 'number' : 'text',
          name,
          label: prop.title || name.charAt(0).toUpperCase() + name.slice(1).replace(/([A-Z])/g, ' $1'),
          placeholder: prop.description || `Enter ${name}...`,
          required: schema.required?.includes(name),
          rows: 3,
        });
      });
    }
    
    return fields;
  };
  
  if (pageType === 'docs') {
    return (
      <GenericToolDocsPage
        toolId={toolId as any}
        title={toolConfig.name}
        description={toolConfig.description}
        icon={icon}
      />
    );
  }
  
  if (pageType === 'try') {
    const fields = buildFields();
    
    return (
      <GenericToolTryPage
        toolId={toolId as any}
        title={toolConfig.name}
        description={toolConfig.description}
        icon={icon}
        fields={fields}
        renderResult={(result) => {
          if (toolId.includes('check-math')) {
            return resultRenderer(result, { statement: lastStatement });
          }
          return resultRenderer(result);
        }}
        exampleInputs={examples.map(ex => ({
          label: ex.label,
          value: ex.values
        }))}
        onBeforeSubmit={(input: any) => {
          // Store statement for math tools
          if (input.statement) {
            setLastStatement(input.statement);
          }
          return input;
        }}
        submitButtonText={toolId.includes('check') ? 'Check' : toolId.includes('extract') ? 'Extract' : 'Process'}
        loadingText={toolId.includes('check') ? 'Checking...' : toolId.includes('extract') ? 'Extracting...' : 'Processing...'}
      />
    );
  }
  
  // Unknown page type
  notFound();
}