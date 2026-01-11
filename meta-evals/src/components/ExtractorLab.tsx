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
import { runMultiExtractor, getMultiExtractorConfig, type ExtractorConfig, type MultiExtractorResult, type ExtractorResult } from "@roast/ai/fallacy-extraction";
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

const AVAILABLE_MODELS = [
  { id: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5" },
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { id: "google/gemini-3-flash-preview", label: "Gemini 3 Flash" },
];

export function ExtractorLab({ height, maxItems, documents, onSearchDocuments, onBack }: ExtractorLabProps) {
  const [step, setStep] = useState<LabStep>({ type: "select-document" });
  const [selectedDoc, setSelectedDoc] = useState<DocumentChoice | null>(null);
  const [documentText, setDocumentText] = useState<string>("");
  const [extractorConfigs, setExtractorConfigs] = useState<ExtractorConfig[]>(getInitialExtractorConfigs);
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
      if (step.type === "issue-detail") {
        setStep({ type: "results", result: step.result });
      } else if (step.type === "results") {
        setStep({ type: "configure-extractors" });
      } else if (step.type === "configure-extractors") {
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
            <Text color="gray">"{truncate(issue.exactText, 200)}"</Text>
          </Box>
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          <Text bold underline>Reasoning:</Text>
          <Box marginLeft={1} marginTop={1}>
            <Text wrap="wrap">{truncate(issue.reasoning, 300)}</Text>
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
