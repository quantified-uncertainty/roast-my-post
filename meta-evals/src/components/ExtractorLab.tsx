/**
 * Extractor Lab - Test extraction in isolation
 *
 * Allows running the fallacy extractor directly without the full pipeline,
 * for quick iteration on extractor config and prompts.
 */

import React, { useState, useEffect, useRef } from "react";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import Spinner from "ink-spinner";
import { prisma, type DocumentChoice } from "@roast/db";
import { runMultiExtractor, getMultiExtractorConfig, type ExtractorConfig, type MultiExtractorResult, type ExtractorResult } from "@roast/ai/fallacy-extraction";
import { truncate, formatDate } from "./helpers";
import { ModelSelector } from "./ModelSelector";

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
  | { type: "add-extractor" }
  | { type: "running" }
  | { type: "results"; result: MultiExtractorResult }
  | { type: "issue-detail"; result: MultiExtractorResult; extractorIdx: number; issueIdx: number };

// Load extractor configs from FALLACY_EXTRACTORS env var, fallback to default
function getInitialExtractorConfigs(): ExtractorConfig[] {
  try {
    const config = getMultiExtractorConfig();
    return config.extractors;
  } catch {
    return [{ model: "claude-sonnet-4-5-20250929", temperature: "default", thinking: false }];
  }
}

// Temperature presets for cycling
const TEMP_PRESETS = ["default", 0, 0.3, 0.5, 0.7, 1.0] as const;

export function ExtractorLab({ height, maxItems, documents, onSearchDocuments, onBack }: ExtractorLabProps) {
  const [step, setStep] = useState<LabStep>({ type: "select-document" });
  const [selectedDoc, setSelectedDoc] = useState<DocumentChoice | null>(null);
  const [documentText, setDocumentText] = useState<string>("");
  const [extractorConfigs, setExtractorConfigs] = useState<ExtractorConfig[]>(getInitialExtractorConfigs);
  const [error, setError] = useState<string | null>(null);
  const [highlightedItem, setHighlightedItem] = useState<string>("");

  // Use ref to track current step for useInput (avoids stale closure)
  const stepRef = useRef(step);
  stepRef.current = step;

  // Track highlighted item for keyboard shortcuts
  const highlightedRef = useRef(highlightedItem);
  highlightedRef.current = highlightedItem;

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

  // Handle keyboard input - use ref to avoid stale closure
  useInput((input, key) => {
    if (key.escape) {
      const currentStep = stepRef.current;
      if (currentStep.type === "issue-detail") {
        setStep({ type: "results", result: currentStep.result });
      } else if (currentStep.type === "results") {
        setStep({ type: "configure-extractors" });
      } else if (currentStep.type === "add-extractor") {
        setStep({ type: "configure-extractors" });
      } else if (currentStep.type === "configure-extractors") {
        setStep({ type: "select-document" });
      } else if (currentStep.type === "select-document") {
        onBack();
      }
      // Don't call onBack for running state
    }

    // Handle 'd' to delete extractor and 't' to cycle temperature (only on configure screen)
    if (stepRef.current.type === "configure-extractors") {
      const highlighted = highlightedRef.current;
      if (highlighted.startsWith("config-")) {
        const idx = parseInt(highlighted.replace("config-", ""), 10);

        if (input === "d") {
          // Delete extractor (but keep at least one)
          setExtractorConfigs(configs => {
            if (configs.length <= 1) return configs;
            return configs.filter((_, i) => i !== idx);
          });
        } else if (input === "t") {
          // Cycle temperature
          setExtractorConfigs(configs =>
            configs.map((c, i) => {
              if (i !== idx) return c;
              const currentTemp = c.temperature;
              const currentIdx = TEMP_PRESETS.findIndex(t => t === currentTemp);
              const nextIdx = (currentIdx + 1) % TEMP_PRESETS.length;
              return { ...c, temperature: TEMP_PRESETS[nextIdx] };
            })
          );
        }
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
              <Text color="green">{selectedDoc?.title}</Text>
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
          onHighlight={(item) => setHighlightedItem(item.value)}
          onSelect={(item) => {
            if (item.value === "back") {
              setStep({ type: "select-document" });
            } else if (item.value === "run") {
              runExtraction();
            } else if (item.value === "add") {
              // Go to model selection
              setStep({ type: "add-extractor" });
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
          <Text dimColor>Enter=toggle think | t=cycle temp | d=delete | Esc=back</Text>
        </Box>
      </Box>
    );
  }

  // Add extractor - model selection using reusable ModelSelector
  if (step.type === "add-extractor") {
    return (
      <ModelSelector
        title="Add Extractor - Select Model"
        borderColor="cyan"
        height={height}
        maxItems={maxItems}
        onSelect={(model) => {
          // Add new extractor with selected model
          setExtractorConfigs([
            ...extractorConfigs,
            { model: model.id, temperature: "default", thinking: false },
          ]);
          setStep({ type: "configure-extractors" });
        }}
        onCancel={() => setStep({ type: "configure-extractors" })}
      />
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

  // Results - scrollable list of issues
  if (step.type === "results") {
    const { result } = step;
    const totalIssues = result.extractorResults.reduce((sum, r) => sum + r.issues.length, 0);

    // Build flat list of issues with extractor info
    const issueItems: Array<{ label: string; value: string }> = [];
    result.extractorResults.forEach((r, extractorIdx) => {
      // Add extractor header
      const tempStr = r.config.temperature === 'default' ? 'tDef' : `t${r.config.temperature}`;
      const thinkStr = r.config.thinking ? '' : ' noThink';
      issueItems.push({
        label: `── ${r.extractorId} (${tempStr}${thinkStr}) - ${r.issues.length} issues, ${(r.durationMs / 1000).toFixed(1)}s ──`,
        value: `header-${extractorIdx}`,
      });
      // Add issues for this extractor
      r.issues.forEach((issue, issueIdx) => {
        const severityColor = issue.severityScore >= 70 ? '🔴' : issue.severityScore >= 40 ? '🟡' : '🟢';
        issueItems.push({
          label: `  ${severityColor} [${issue.issueType}] ${truncate(issue.exactText.replace(/\n/g, ' '), 60)}`,
          value: `issue-${extractorIdx}-${issueIdx}`,
        });
      });
    });
    issueItems.push({ label: "← Back to Configure", value: "back" });

    return (
      <Box flexDirection="column" borderStyle="round" borderColor="green" padding={1} height={height}>
        <Box justifyContent="center" marginBottom={1}>
          <Text bold color="green">Extractor Lab - Results</Text>
        </Box>

        <Box borderStyle="single" borderColor="gray" marginBottom={1} paddingX={1}>
          <Text>
            <Text bold>Duration: </Text><Text>{(result.totalDurationMs / 1000).toFixed(1)}s</Text>
            <Text>  |  </Text>
            <Text bold>Issues: </Text><Text color="cyan">{totalIssues}</Text>
            <Text>  |  </Text>
            <Text bold>Extractors: </Text><Text>{result.extractorResults.length}</Text>
          </Text>
        </Box>

        <SelectInput
          items={issueItems}
          limit={maxItems - 3}
          onSelect={(item) => {
            if (item.value === "back") {
              setStep({ type: "configure-extractors" });
            } else if (item.value.startsWith("issue-")) {
              const [, extractorIdx, issueIdx] = item.value.split("-");
              setStep({
                type: "issue-detail",
                result,
                extractorIdx: parseInt(extractorIdx),
                issueIdx: parseInt(issueIdx),
              });
            }
          }}
        />

        <Box marginTop={1} justifyContent="center">
          <Text dimColor>Enter View Detail | Escape Back</Text>
        </Box>
      </Box>
    );
  }

  // Issue detail view
  if (step.type === "issue-detail") {
    const { result, extractorIdx, issueIdx } = step;
    const extractor = result.extractorResults[extractorIdx];
    const issue = extractor.issues[issueIdx];

    return (
      <Box flexDirection="column" borderStyle="round" borderColor="blue" padding={1} height={height}>
        <Box justifyContent="center" marginBottom={1}>
          <Text bold color="blue">Issue Detail</Text>
        </Box>

        <Box borderStyle="single" borderColor="gray" marginBottom={1} paddingX={1} flexDirection="column">
          <Text><Text bold>Extractor: </Text><Text color="yellow">{extractor.extractorId}</Text></Text>
          <Text><Text bold>Type: </Text><Text color="cyan">{issue.issueType}</Text>{issue.fallacyType && <Text dimColor> ({issue.fallacyType})</Text>}</Text>
          <Text><Text bold>Severity: </Text><Text color={issue.severityScore >= 70 ? 'red' : issue.severityScore >= 40 ? 'yellow' : 'green'}>{issue.severityScore}/100</Text></Text>
          <Text><Text bold>Confidence: </Text><Text>{issue.confidenceScore}/100</Text></Text>
          <Text><Text bold>Importance: </Text><Text>{issue.importanceScore}/100</Text></Text>
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          <Text bold underline>Quoted Text:</Text>
          <Box marginLeft={1} marginTop={1}>
            <Text color="gray" wrap="wrap">"{issue.exactText}"</Text>
          </Box>
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          <Text bold underline>Reasoning:</Text>
          <Box marginLeft={1} marginTop={1}>
            <Text wrap="wrap">{issue.reasoning}</Text>
          </Box>
        </Box>

        <Box marginTop={1} justifyContent="center">
          <Text dimColor>Press Escape to go back to results</Text>
        </Box>
      </Box>
    );
  }

  return null;
}
