"use client";

import { useState } from "react";

import { notFound } from "next/navigation";

import {
  BeakerIcon,
  CalculatorIcon,
  ChartBarIcon,
  ClipboardDocumentCheckIcon,
  CloudIcon,
  DocumentMagnifyingGlassIcon,
  DocumentTextIcon,
  LanguageIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  ScaleIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import {
  type ToolId,
  toolRegistry,
  toolSchemas,
} from "@roast/ai";

import { GenericToolDocsPage } from "../../components/GenericToolDocsPage";
import { GenericToolTryPage } from "../../components/GenericToolTryPage";
import { MathCheckDisplay } from "../../components/results/MathCheckDisplay";
import { OpinionSpectrum } from "../../components/results/OpinionSpectrum";
import { FieldConfig } from "../../components/types";
import { toolExamples as exampleConfigs } from "../../utils/toolExamples";

// Map tool IDs to their icons
const toolIcons: Record<string, React.ReactElement> = {
  "math-validator-llm": <CalculatorIcon className="h-8 w-8 text-blue-600" />,
  "math-validator-hybrid": (
    <CalculatorIcon className="h-8 w-8 text-purple-600" />
  ),
  "math-validator-mathjs": (
    <CalculatorIcon className="h-8 w-8 text-green-600" />
  ),
  "spelling-grammar-checker": (
    <DocumentTextIcon className="h-8 w-8 text-red-600" />
  ),
  "language-convention-detector": (
    <LanguageIcon className="h-8 w-8 text-indigo-600" />
  ),
  "document-chunker": (
    <DocumentMagnifyingGlassIcon className="h-8 w-8 text-orange-600" />
  ),
  "factual-claims-extractor": (
    <ClipboardDocumentCheckIcon className="h-8 w-8 text-teal-600" />
  ),
  "binary-forecasting-claims-extractor": (
    <ChartBarIcon className="h-8 w-8 text-yellow-600" />
  ),
  "math-expressions-extractor": (
    <CalculatorIcon className="h-8 w-8 text-pink-600" />
  ),
  "fact-checker": <ScaleIcon className="h-8 w-8 text-emerald-600" />,
  "binary-forecaster": <ChartBarIcon className="h-8 w-8 text-blue-600" />,
  "smart-text-searcher": (
    <MagnifyingGlassIcon className="h-8 w-8 text-violet-600" />
  ),
  "link-validator": <LinkIcon className="h-8 w-8 text-cyan-600" />,
  "perplexity-researcher": <CloudIcon className="h-8 w-8 text-slate-600" />,
  "claim-evaluator": <UserGroupIcon className="h-8 w-8 text-indigo-600" />,
};

// Types for tool results
interface ToolResultExtra {
  statement?: string;
  [key: string]: unknown;
}

type ToolResult = Record<string, unknown>;

// Tool-specific result renderers
const toolResultRenderers: Record<
  string,
  (result: ToolResult, extra?: ToolResultExtra) => React.ReactElement
> = {
  "math-validator-llm": (result, extra) => (
    <MathCheckDisplay
      result={result}
      statement={extra?.statement || ""}
      variant="basic"
    />
  ),
  "math-validator-hybrid": (result, extra) => (
    <MathCheckDisplay
      result={result}
      statement={extra?.statement || ""}
      variant="hybrid"
    />
  ),
  "math-validator-mathjs": (result, extra) => (
    <MathCheckDisplay
      result={result}
      statement={extra?.statement || ""}
      variant="mathjs"
    />
  ),
  "claim-evaluator": (result: any) => {
    // Helper to get agreement level label and color
    const getAgreementLabelAndColor = (agreement: number) => {
      if (agreement >= 80)
        return {
          label: "Strongly Agree",
          color: "text-green-600 bg-green-50 border-green-200",
        };
      if (agreement >= 60)
        return {
          label: "Agree",
          color: "text-green-500 bg-green-50 border-green-100",
        };
      if (agreement >= 40)
        return {
          label: "Neutral",
          color: "text-gray-600 bg-gray-50 border-gray-200",
        };
      if (agreement >= 20)
        return {
          label: "Disagree",
          color: "text-orange-500 bg-orange-50 border-orange-100",
        };
      return {
        label: "Strongly Disagree",
        color: "text-red-600 bg-red-50 border-red-200",
      };
    };

    return (
      <div className="space-y-6">
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold">Claim Evaluation Results</h3>

          {/* Consensus Summary */}
          <div className="mb-6 rounded-lg bg-blue-50 p-4">
            <h4 className="mb-2 font-semibold">Consensus</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Mean Agreement:</span>
                <span className="ml-2 font-semibold">
                  {result.consensus?.mean}%
                </span>
              </div>
              <div>
                <span className="text-gray-600">Std Dev:</span>
                <span className="ml-2 font-semibold">
                  {result.consensus?.stdDev}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Range:</span>
                <span className="ml-2 font-semibold">
                  {result.consensus?.range?.min}% - {result.consensus?.range?.max}%
                </span>
              </div>
            </div>
          </div>

          {/* Opinion Spectrum Visualization */}
          <OpinionSpectrum results={result.results || []} />

          {/* Individual Model Results - Detailed List View */}
          <div className="mt-8 space-y-3">
            <h4 className="font-semibold">Model Responses</h4>
            {result.results?.map((r: any, i: number) => {
              const { label, color } = getAgreementLabelAndColor(r.agreement);
              return (
                <div key={i} className="rounded-lg border p-4">
                  <div className="mb-2 flex items-start justify-between">
                    <div>
                      <span className="font-medium">{r.model}</span>
                      <span className="ml-2 text-sm text-gray-500">
                        ({r.provider})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full border px-3 py-1 text-sm font-semibold ${color}`}
                      >
                        {label}
                      </span>
                      <span className="text-sm text-gray-500">
                        ({r.agreement}%)
                      </span>
                    </div>
                  </div>
                  <p className="text-sm italic text-gray-700">
                    &ldquo;{r.reasoning}&rdquo;
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  },
  // Add more custom renderers as needed
  // Default renderer for tools without custom display
  default: (result) => (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold">Result</h3>
      <pre className="overflow-x-auto rounded bg-gray-50 p-4">
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  ),
};

interface ToolPageClientProps {
  toolId: string;
  slug: string[];
}

export function ToolPageClient({ toolId, slug }: ToolPageClientProps) {
  const [lastStatement, setLastStatement] = useState("");

  const toolConfig = toolRegistry[toolId];

  // Get tool schemas
  const schemas = toolSchemas[toolId as ToolId];
  if (!schemas) {
    notFound();
  }

  // Type guard to ensure tool exists
  if (!toolConfig) {
    notFound();
  }
  const icon = toolIcons[toolId] || (
    <BeakerIcon className="h-8 w-8 text-gray-600" />
  );
  const examples = exampleConfigs[toolId] || [];

  // Determine page type from slug
  const pageType = slug?.[0] || "docs"; // Default to docs if no slug

  // Get the appropriate result renderer
  const resultRenderer =
    toolResultRenderers[toolId] || toolResultRenderers.default;

  // Tool-specific field configurations
  const getToolSpecificFieldConfig = (
    toolId: string,
    name: string,
    prop: unknown
  ) => {
    const toolSpecificConfigs: Record<string, Record<string, unknown>> = {
      "binary-forecaster": {
        question: {
          type: "textarea",
          rows: 3,
          placeholder: "Enter your forecasting question...",
        },
        context: {
          type: "textarea",
          rows: 4,
          placeholder: "Additional context for the forecast...",
        },
        numForecasts: {
          type: "number",
          defaultValue: 6,
          min: 1,
          max: 20,
        },
        usePerplexity: {
          type: "checkbox",
          defaultValue: false,
        },
      },
      "spelling-grammar-checker": {
        text: {
          type: "textarea",
          rows: 8,
          placeholder: "Enter text to check for spelling and grammar errors...",
        },
        context: {
          type: "textarea",
          rows: 3,
          placeholder:
            "e.g., academic paper, casual email, technical documentation",
        },
        maxErrors: {
          type: "number",
          defaultValue: 50,
          min: 1,
          max: 100,
        },
        convention: {
          type: "select",
          defaultValue: "auto",
          options: [
            { value: "auto", label: "Auto-detect" },
            { value: "US", label: "US English" },
            { value: "UK", label: "UK English" },
          ],
        },
        strictness: {
          type: "select",
          defaultValue: "standard",
          options: [
            { value: "minimal", label: "Minimal (clear errors only)" },
            { value: "standard", label: "Standard (errors + clarity)" },
            { value: "thorough", label: "Thorough (all issues)" },
          ],
        },
      },
      "document-chunker": {
        text: {
          type: "textarea",
          rows: 10,
          placeholder: "Enter document text to chunk...",
        },
        chunkSize: {
          type: "number",
          defaultValue: 100,
          min: 10,
          max: 1000,
        },
        maxChunkSize: {
          type: "number",
          defaultValue: 1500,
          min: 100,
          max: 10000,
        },
        minChunkSize: {
          type: "number",
          defaultValue: 200,
          min: 50,
          max: 1000,
        },
        preserveContext: {
          type: "checkbox",
          defaultValue: true,
        },
        targetWords: {
          type: "number",
          defaultValue: 500,
          min: 50,
          max: 2000,
        },
      },
      "perplexity-researcher": {
        query: {
          type: "textarea",
          rows: 3,
          placeholder: "Enter your research question...",
        },
        focusArea: {
          type: "select",
          defaultValue: "general",
          options: [
            { value: "general", label: "General Research" },
            { value: "academic", label: "Academic Sources" },
            { value: "news", label: "News & Current Events" },
            { value: "technical", label: "Technical Documentation" },
            { value: "market", label: "Market Analysis" },
          ],
        },
        maxSources: {
          type: "number",
          defaultValue: 5,
          min: 1,
          max: 10,
        },
        includeForecastingContext: {
          type: "checkbox",
          defaultValue: false,
        },
      },
      "smart-text-searcher": {
        documentText: {
          type: "textarea",
          rows: 8,
          placeholder: "Enter the document text to search within...",
        },
        searchText: {
          type: "textarea",
          rows: 3,
          placeholder: "Enter the text you want to find...",
        },
        context: {
          type: "text",
          placeholder: "Optional context about the search...",
        },
        lineNumberHint: {
          type: "number",
          min: 1,
          placeholder: "Optional line number hint",
        },
        // Note: The options.* fields need nested object support
        // For now, exclude the nested options until we add proper nested field support
        // 'options.normalizeQuotes': { type: 'checkbox', defaultValue: false },
        // 'options.partialMatch': { type: 'checkbox', defaultValue: false },
        // 'options.useLLMFallback': { type: 'checkbox', defaultValue: false },
      },
      "fact-checker": {
        claim: {
          type: "textarea",
          rows: 3,
          placeholder: "Enter the factual claim to verify...",
        },
        context: {
          type: "textarea",
          rows: 4,
          placeholder: "Additional context about the claim...",
        },
        searchForEvidence: {
          type: "checkbox",
          defaultValue: false,
        },
      },
      "link-validator": {
        text: {
          type: "textarea",
          rows: 8,
          placeholder: "Enter text containing URLs to validate...",
        },
        maxUrls: {
          type: "number",
          defaultValue: 20,
          min: 1,
          max: 50,
        },
      },
      "claim-evaluator": {
        claim: {
          type: "textarea",
          rows: 4,
          placeholder:
            'Enter the claim to evaluate (e.g., "The US economy will grow by 40% in the next 5 years")',
        },
        models: {
          type: "checkbox-group",
          options: [
            {
              value: "anthropic/claude-sonnet-4.5",
              label: "Claude 4.5 Sonnet",
            },
            { value: "anthropic/claude-sonnet-4", label: "Claude Sonnet 4" },
            { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
            { value: "openai/gpt-5", label: "GPT-5" },
            {
              value: "deepseek/deepseek-chat-v3.1:free",
              label: "DeepSeek Chat V3.1",
            },
            { value: "x-ai/grok-4", label: "Grok 4" },
          ],
          defaultValue: [
            "anthropic/claude-sonnet-4.5",
            "anthropic/claude-sonnet-4",
            "google/gemini-2.5-pro",
            "openai/gpt-5",
            "deepseek/deepseek-chat-v3.1:free",
            "x-ai/grok-4",
          ],
        },
      },
      "language-convention-detector": {
        text: {
          type: "textarea",
          rows: 6,
          placeholder:
            "Enter text to analyze for US vs UK English conventions...",
        },
      },
      "factual-claims-extractor": {
        text: {
          type: "textarea",
          rows: 8,
          placeholder: "Enter text to extract factual claims from...",
        },
      },
      "binary-forecasting-claims-extractor": {
        text: {
          type: "textarea",
          rows: 8,
          placeholder: "Enter text to extract forecasting claims from...",
        },
      },
      "math-expressions-extractor": {
        text: {
          type: "textarea",
          rows: 8,
          placeholder: "Enter text to extract math expressions from...",
        },
      },
      "math-validator-llm": {
        statement: {
          type: "textarea",
          rows: 3,
          placeholder: "Enter a mathematical statement to verify...",
        },
      },
      "math-validator-hybrid": {
        statement: {
          type: "textarea",
          rows: 3,
          placeholder: "Enter a mathematical statement to verify...",
        },
      },
      "math-validator-mathjs": {
        statement: {
          type: "textarea",
          rows: 3,
          placeholder: "Enter a mathematical statement to verify...",
        },
      },
    };

    return toolSpecificConfigs[toolId]?.[name] || {};
  };

  // Build fields configuration based on tool input schema with tool-specific overrides
  const buildFields = () => {
    interface SchemaProperty {
      type?: string;
      title?: string;
      description?: string;
      default?: unknown;
      minimum?: number;
      maximum?: number;
      maxLength?: number;
    }

    const fields: FieldConfig[] = [];
    const schema = schemas.inputSchema as Record<string, unknown>;

    if (schema?.properties) {
      Object.entries(
        schema.properties as Record<string, SchemaProperty>
      ).forEach(([name, prop]) => {
        const toolSpecific = getToolSpecificFieldConfig(
          toolId,
          name,
          prop
        ) as Record<string, unknown>;

        // Determine base field type
        let baseType = "text";
        if (prop.type === "number") {
          baseType = "number";
        } else if (prop.type === "boolean") {
          baseType = "checkbox";
        } else if (
          prop.type === "string" &&
          ((prop.maxLength && prop.maxLength > 100) ||
            name.includes("text") ||
            name.includes("Text"))
        ) {
          baseType = "textarea";
        }

        fields.push({
          type: ((toolSpecific.type as string) || baseType) as
            | "text"
            | "textarea"
            | "select"
            | "number"
            | "checkbox",
          name,
          label:
            prop.title ||
            name.charAt(0).toUpperCase() +
              name.slice(1).replace(/([A-Z])/g, " $1"),
          placeholder:
            (toolSpecific.placeholder as string) ||
            prop.description ||
            `Enter ${name}...`,
          required: (schema.required as string[] | undefined)?.includes(name),
          rows: (toolSpecific.rows as number) || 3,
          defaultValue:
            toolSpecific.defaultValue !== undefined
              ? (toolSpecific.defaultValue as string | number | boolean)
              : (prop.default as string | number | boolean | undefined),
          min: (toolSpecific.min as number) || prop.minimum,
          max: (toolSpecific.max as number) || prop.maximum,
          options: toolSpecific.options as
            | Array<{ value: string; label: string }>
            | undefined,
        });
      });
    }

    return fields;
  };

  if (pageType === "docs") {
    return (
      <GenericToolDocsPage
        toolId={toolId as ToolId}
        title={toolConfig.name}
        description={toolConfig.description}
        icon={icon}
      />
    );
  }

  if (pageType === "try") {
    const fields = buildFields();

    return (
      <GenericToolTryPage
        toolId={toolId as ToolId}
        title={toolConfig.name}
        description={toolConfig.description}
        icon={icon}
        fields={fields}
        renderResult={(result) => {
          if (toolId.includes("math-validator")) {
            return resultRenderer(result as ToolResult, {
              statement: lastStatement,
            });
          }
          return resultRenderer(result as ToolResult);
        }}
        exampleInputs={examples.map((ex) => ({
          label: ex.label,
          value: ex.values,
        }))}
        onBeforeSubmit={(input: Record<string, unknown>) => {
          // Store statement for math tools
          if (input.statement) {
            setLastStatement(input.statement as string);
          }
          return input;
        }}
        submitButtonText={
          toolId.includes("checker") || toolId.includes("validator")
            ? "Check"
            : toolId.includes("extractor")
              ? "Extract"
              : "Process"
        }
        loadingText={
          toolId.includes("checker") || toolId.includes("validator")
            ? "Checking..."
            : toolId.includes("extractor")
              ? "Extracting..."
              : "Processing..."
        }
      />
    );
  }

  // Unknown page type
  notFound();
}
