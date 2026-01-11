/**
 * Extractor Lab - Test extraction in isolation
 *
 * Allows running the fallacy extractor directly without the full pipeline,
 * for quick iteration on extractor config and prompts.
 */

import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import Spinner from "ink-spinner";
import { prisma, type DocumentChoice } from "@roast/db";
import type { ExtractorConfig, MultiExtractorResult } from "@roast/ai/fallacy-extraction";
import { truncate, formatDate } from "./helpers";

interface ExtractorLabProps {
  height: number;
  maxItems: number;
  documents: DocumentChoice[];
  onSearchDocuments: (filter: string) => void;
  onBack: () => void;
}

type LabStep =
  | { type: "select-document" }
  | { type: "configure-extractors" }
  | { type: "running" }
  | { type: "results"; result: MultiExtractorResult };

// Default extractor configs for testing
const DEFAULT_EXTRACTOR_CONFIGS: ExtractorConfig[] = [
  { model: "claude-sonnet-4-5-20250929", temperature: "default", thinking: false },
];

const AVAILABLE_MODELS = [
  { id: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5" },
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { id: "google/gemini-3-flash-preview", label: "Gemini 3 Flash" },
];

export function ExtractorLab({ height, maxItems, documents, onSearchDocuments, onBack }: ExtractorLabProps) {
  const [step, setStep] = useState<LabStep>({ type: "select-document" });
  const [selectedDoc, setSelectedDoc] = useState<DocumentChoice | null>(null);
  const [documentText, setDocumentText] = useState<string>("");
  const [extractorConfigs, setExtractorConfigs] = useState<ExtractorConfig[]>(DEFAULT_EXTRACTOR_CONFIGS);
  const [error, setError] = useState<string | null>(null);

  async function loadDocumentText(docId: string) {
    try {
      // Get latest document version with content
      const doc = await prisma.document.findUnique({
        where: { id: docId },
        include: {
          versions: {
            orderBy: { version: "desc" },
            take: 1,
            select: { content: true },
          },
        },
      });
      const content = doc?.versions[0]?.content;
      if (content) {
        setDocumentText(content);
      } else {
        setError("Document has no content");
      }
    } catch (e) {
      setError(`Failed to load document text: ${e}`);
    }
  }

  async function runExtraction() {
    if (!documentText) {
      setError("No document text loaded");
      return;
    }

    setStep({ type: "running" });

    try {
      // Dynamic import for the multi-extractor
      const { runMultiExtractor } = await import("@roast/ai/fallacy-extraction");

      const result = await runMultiExtractor(documentText, {
        extractors: extractorConfigs,
        judgeEnabled: extractorConfigs.length > 1, // Enable judge if multiple extractors
      });

      setStep({ type: "results", result });
    } catch (e) {
      setError(`Extraction failed: ${e}`);
      setStep({ type: "configure-extractors" });
    }
  }

  // Handle keyboard input
  useInput((input, key) => {
    if (key.escape) {
      if (step.type === "results" || step.type === "configure-extractors") {
        setStep({ type: "select-document" });
      } else {
        onBack();
      }
    }
  });

  if (error) {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="red" padding={1} height={height}>
        <Text color="red">Error: {error}</Text>
        <Text dimColor>Press Escape to go back</Text>
      </Box>
    );
  }

  // Document selection
  if (step.type === "select-document") {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="magenta" padding={1} height={height}>
        <Box justifyContent="center" marginBottom={1}>
          <Text bold color="magenta">Extractor Lab - Select Document</Text>
        </Box>

        <Box borderStyle="single" borderColor="gray" marginBottom={1} paddingX={1}>
          <Text>Select a document ({documents.length} found)</Text>
        </Box>

        <SelectInput
          items={documents.map((d, i) => ({
            label: `${String(i + 1).padStart(2)} | ${truncate(d.title, 50).padEnd(50)} | ${formatDate(new Date(d.createdAt))}`,
            value: d.id,
          }))}
          limit={maxItems - 2}
          onSelect={async (item) => {
            const doc = documents.find((d) => d.id === item.value);
            if (doc) {
              setSelectedDoc(doc);
              await loadDocumentText(doc.id);
              setStep({ type: "configure-extractors" });
            }
          }}
        />

        <Box marginTop={1} justifyContent="center">
          <Text dimColor>Up/Down Navigate | Enter Select | Escape Back</Text>
        </Box>
      </Box>
    );
  }

  // Configure extractors
  if (step.type === "configure-extractors") {
    const items = [
      { label: "▶ Run Extraction", value: "run" },
      { label: "─────────────────", value: "divider" },
      ...extractorConfigs.map((config, idx) => ({
        label: `[${idx + 1}] ${config.model} (t=${config.temperature}, think=${config.thinking})`,
        value: `config-${idx}`,
      })),
      { label: "+ Add Extractor", value: "add" },
      { label: "─────────────────", value: "divider2" },
      { label: "← Back to Documents", value: "back" },
    ];

    return (
      <Box flexDirection="column" borderStyle="round" borderColor="magenta" padding={1} height={height}>
        <Box justifyContent="center" marginBottom={1}>
          <Text bold color="magenta">Extractor Lab - Configure</Text>
        </Box>

        <Box borderStyle="single" borderColor="gray" marginBottom={1} paddingX={1}>
          <Box flexDirection="column">
            <Text>
              <Text bold>Document: </Text>
              <Text color="green">{selectedDoc?.title.slice(0, 40)}</Text>
            </Text>
            <Text>
              <Text bold>Text length: </Text>
              <Text>{documentText.length} chars</Text>
            </Text>
            <Text>
              <Text bold>Extractors: </Text>
              <Text>{extractorConfigs.length}</Text>
            </Text>
          </Box>
        </Box>

        <SelectInput
          items={items.filter(i => !i.value.startsWith("divider"))}
          onSelect={(item) => {
            if (item.value === "back") {
              setStep({ type: "select-document" });
            } else if (item.value === "run") {
              runExtraction();
            } else if (item.value === "add") {
              // Add another extractor with different config
              const nextModel = AVAILABLE_MODELS[extractorConfigs.length % AVAILABLE_MODELS.length];
              setExtractorConfigs([
                ...extractorConfigs,
                { model: nextModel.id, temperature: "default", thinking: false },
              ]);
            } else if (item.value.startsWith("config-")) {
              // Toggle thinking for this extractor
              const idx = parseInt(item.value.replace("config-", ""), 10);
              setExtractorConfigs(configs =>
                configs.map((c, i) => i === idx ? { ...c, thinking: !c.thinking } : c)
              );
            }
          }}
        />

        <Box marginTop={1} justifyContent="center">
          <Text dimColor>Enter on extractor toggles thinking | Escape Back</Text>
        </Box>
      </Box>
    );
  }

  // Running
  if (step.type === "running") {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="yellow" padding={1} height={height}>
        <Box justifyContent="center" marginBottom={1}>
          <Text bold color="yellow">Extractor Lab - Running</Text>
        </Box>

        <Box justifyContent="center" padding={2}>
          <Text>
            <Spinner type="dots" /> Running {extractorConfigs.length} extractor(s)...
          </Text>
        </Box>

        <Box justifyContent="center">
          <Text dimColor>This may take a minute...</Text>
        </Box>
      </Box>
    );
  }

  // Results
  if (step.type === "results") {
    const { result } = step;
    const totalIssues = result.extractorResults.reduce((sum, r) => sum + r.issues.length, 0);

    return (
      <Box flexDirection="column" borderStyle="round" borderColor="green" padding={1} height={height}>
        <Box justifyContent="center" marginBottom={1}>
          <Text bold color="green">Extractor Lab - Results</Text>
        </Box>

        <Box borderStyle="single" borderColor="gray" marginBottom={1} paddingX={1}>
          <Box flexDirection="column">
            <Text>
              <Text bold>Total Duration: </Text>
              <Text>{(result.totalDurationMs / 1000).toFixed(1)}s</Text>
            </Text>
            <Text>
              <Text bold>Total Issues: </Text>
              <Text color="cyan">{totalIssues}</Text>
            </Text>
          </Box>
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          <Text bold underline>Per-Extractor Results:</Text>
          {result.extractorResults.map((r, idx) => (
            <Box key={idx} flexDirection="column" marginTop={1}>
              <Text>
                <Text color="yellow">{r.extractorId}</Text>
                <Text dimColor> ({(r.durationMs / 1000).toFixed(1)}s)</Text>
              </Text>
              {r.error ? (
                <Text color="red">  Error: {r.error}</Text>
              ) : (
                <Text>  Found {r.issues.length} issues</Text>
              )}
              {r.issues.slice(0, 3).map((issue, i) => (
                <Text key={i} dimColor>
                  {"  "}- [{issue.issueType}] {issue.exactText.slice(0, 40)}...
                </Text>
              ))}
              {r.issues.length > 3 && (
                <Text dimColor>  ... and {r.issues.length - 3} more</Text>
              )}
            </Box>
          ))}
        </Box>

        <Box marginTop={1} justifyContent="center">
          <Text dimColor>Press Escape to go back</Text>
        </Box>
      </Box>
    );
  }

  return null;
}
