"use client";

import { useState } from "react";

import { notFound } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { getModelAbbreviation, estimateTokenCount } from "../../constants/modelAbbreviations";

import { ClaimEvaluationDisplay } from "@/lib/OpinionSpectrum2D";
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
  generateClaimEvaluatorPrompt,
} from "@roast/ai";

import { GenericToolDocsPage } from "../../components/GenericToolDocsPage";
import { GenericToolTryPage } from "../../components/GenericToolTryPage";
import { MathCheckDisplay } from "../../components/results/MathCheckDisplay";
import { FieldConfig } from "../../components/types";
import { toolExamples as exampleConfigs } from "../../utils/toolExamples";

const CONTEXT_PREVIEW_LENGTH = 300;

// Claim Evaluator Result Component (separate to use hooks properly)
function ClaimEvaluatorResult({
  result,
  claim,
  context,
}: {
  result: any;
  claim: string;
  context: string;
}) {
  const [showContextModal, setShowContextModal] = useState(false);

  // Use trimmed context to handle empty strings properly
  const trimmedContext = context?.trim() || "";
  const contextTokens = estimateTokenCount(trimmedContext);
  const contextPreview =
    trimmedContext.length > CONTEXT_PREVIEW_LENGTH
      ? trimmedContext.slice(0, CONTEXT_PREVIEW_LENGTH)
      : trimmedContext;
  const hasMore = trimmedContext.length > CONTEXT_PREVIEW_LENGTH;

  return (
    <>
      {claim && (
        <div className="mb-6 rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="mb-3 text-sm font-medium text-gray-600">Claim</h3>
          <p className="text-xl font-medium text-gray-900">
            &ldquo;{claim}&rdquo;
          </p>
        </div>
      )}

      {trimmedContext && (
        <div className="mb-6 rounded-lg border bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-600">Context</h3>
            <span className="text-sm text-gray-400" aria-label={`Estimated ${contextTokens} tokens`}>
              {contextTokens.toLocaleString()} tokens
            </span>
          </div>
          <p className="text-gray-700">
            {contextPreview}
            {hasMore && <span className="text-gray-400">...</span>}
          </p>
          {hasMore && (
            <button
              onClick={() => setShowContextModal(true)}
              className="mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-700"
              aria-label="Show full context"
              aria-expanded={showContextModal}
            >
              Show More
            </button>
          )}
        </div>
      )}

      <Dialog open={showContextModal} onOpenChange={setShowContextModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto" aria-describedby="context-description">
          <DialogHeader>
            <DialogTitle>
              Full Context ({contextTokens.toLocaleString()} tokens)
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4" id="context-description">
            <p className="whitespace-pre-wrap text-gray-700">{trimmedContext}</p>
          </div>
        </DialogContent>
      </Dialog>

      <ClaimEvaluationDisplay result={result} getModelAbbrev={getModelAbbreviation} />
    </>
  );
}

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
  claim?: string;
  context?: string;
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
  "claim-evaluator": (result: any, extra?: ToolResultExtra) => (
    <ClaimEvaluatorResult
      result={result}
      claim={extra?.claim || ""}
      context={extra?.context || ""}
    />
  ),
  // Add more custom renderers as needed
  // Default renderer for tools without custom display
  default: (result) => (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold">Result</h3>
      <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded bg-gray-50 p-4 font-mono text-sm">
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
  const [lastClaim, setLastClaim] = useState("");
  const [lastContext, setLastContext] = useState("");

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
            'Enter the claim to evaluate (e.g., "AGI will be achieved by 2027")',
        },
        context: {
          type: "textarea",
          rows: 3,
          placeholder:
            "Optional: Add context like when/where this claim was made, relevant background information, domain expertise needed, or constraints on interpretation",
        },
        models: {
          type: "checkbox-group",
          options: [
            {
              value: "anthropic/claude-sonnet-4.5",
              label: "Claude Sonnet 4.5",
            },
            { value: "anthropic/claude-sonnet-4", label: "Claude Sonnet 4" },
            {
              value: "anthropic/claude-3.5-haiku-20241022",
              label: "Claude 3.5 Haiku",
            },
            { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
            { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
            { value: "openai/gpt-5", label: "GPT-5" },
            { value: "openai/gpt-5-mini", label: "GPT-5 Mini" },
            { value: "openai/gpt-4.1", label: "GPT-4.1" },
            { value: "openai/gpt-4.1-mini-2025-04-14", label: "GPT-4.1 Mini" },
            {
              value: "deepseek/deepseek-chat-v3.1",
              label: "DeepSeek Chat V3.1",
            },
            { value: "x-ai/grok-4", label: "Grok 4" },
          ],
          defaultValue: [
            "anthropic/claude-sonnet-4.5",
            "openai/gpt-5-mini",
            "deepseek/deepseek-chat-v3.1",
            "x-ai/grok-4",
          ],
        },
        runs: {
          type: "select",
          options: [
            { value: "1", label: "1" },
            { value: "2", label: "2" },
            { value: "3", label: "3" },
            { value: "4", label: "4" },
            { value: "5", label: "5" },
          ],
          defaultValue: 1,
          valueType: "number",
          helperText: "Number of independent runs per model",
        },
        explanationLength: {
          type: "number",
          min: 3,
          max: 200,
          defaultValue: 50,
          valueType: "number",
          helperText: "Maximum words per explanation (3-200)",
        },
        temperature: {
          type: "number",
          min: 0.0,
          max: 1.0,
          step: 0.1,
          defaultValue: 0.7,
          valueType: "number",
          tooltip:
            "Controls response randomness. 0 = very consistent (same answer each time), 1 = maximum variety (diverse perspectives). Automatically scaled per model provider (Anthropic 0-1, OpenAI/Google/xAI 0-2).",
          showPromptLink: true,
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
            | "checkbox"
            | "checkbox-group",
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
          step: (toolSpecific.step as number) || undefined,
          options: toolSpecific.options as
            | Array<{ value: string; label: string }>
            | undefined,
          helperText: (toolSpecific.helperText as string) || undefined,
          tooltip: (toolSpecific.tooltip as string) || undefined,
          valueType: (toolSpecific.valueType as 'string' | 'number') || undefined,
          showPromptLink: (toolSpecific.showPromptLink as boolean) || undefined,
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
          if (toolId === "claim-evaluator") {
            return resultRenderer(result as ToolResult, {
              claim: lastClaim,
              context: lastContext,
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
          // Store claim for claim-evaluator
          if (input.claim) {
            setLastClaim(input.claim as string);
          }
          // Store context for claim-evaluator
          if (input.context) {
            setLastContext(input.context as string);
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
        hideViewToggle={toolId === "claim-evaluator"}
        generatePrompt={
          toolId === "claim-evaluator"
            ? (input: any) => generateClaimEvaluatorPrompt(input)
            : undefined
        }
        onSaveResult={
          toolId === "claim-evaluator"
            ? async (result: any) => {
                const response = await fetch("/api/claim-evaluations", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    claim: lastClaim,
                    context: lastContext || undefined,
                    summaryMean: result.summary?.mean,
                    rawOutput: result,
                  }),
                });

                if (!response.ok) {
                  throw new Error("Failed to save evaluation");
                }

                return response.json();
              }
            : undefined
        }
        saveButtonText="Save Evaluation"
        getSavedResultUrl={
          toolId === "claim-evaluator"
            ? (id: string) => `/claim-evaluations/${id}`
            : undefined
        }
      />
    );
  }

  // Unknown page type
  notFound();
}
