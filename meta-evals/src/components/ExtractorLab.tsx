/**
 * Extractor Lab - Test extraction in isolation
 *
 * Allows running the fallacy extractor directly without the full pipeline,
 * for quick iteration on extractor config and prompts.
 */

import React, { useState, useEffect, useRef } from "react";
import { Box, Text, useInput, useStdout } from "ink";
import SelectInput from "ink-select-input";
import Spinner from "ink-spinner";
import { prisma, type DocumentChoice } from "@roast/db";
import {
  getMultiExtractorConfig,
  type ExtractorConfig,
  type MultiExtractorResult,
  type ExtractorResult,
} from "@roast/ai/fallacy-extraction/lab";
import { runMultiExtractor } from "@roast/ai/fallacy-extraction";
import fallacyJudgeModule from "@roast/ai/fallacy-judge";
// CommonJS/ESM interop: default export is wrapped, named exports need unwrapping too
const fallacyJudgeTool = (fallacyJudgeModule as unknown as { default?: typeof fallacyJudgeModule }).default ?? fallacyJudgeModule;
const { getJudgesConfig, generateJudgeLabel } = fallacyJudgeModule as unknown as {
  getJudgesConfig: () => import("@roast/ai/fallacy-judge/types").JudgeConfig[];
  generateJudgeLabel: (config: import("@roast/ai/fallacy-judge/types").JudgeConfig) => string;
};
import type { FallacyJudgeOutput, JudgeDecision, JudgeConfig } from "@roast/ai/fallacy-judge/types";
import { ModelSelector } from "./ModelSelector";
import { DocumentSelector } from "./DocumentSelector";

/** Truncate string to fit terminal width */
function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + "…";
}

// Simple logger for the judge tool
const simpleLogger = {
  info: (...args: unknown[]) => console.error("[INFO]", ...args),
  warn: (...args: unknown[]) => console.error("[WARN]", ...args),
  error: (...args: unknown[]) => console.error("[ERROR]", ...args),
  debug: (...args: unknown[]) => {},
};

interface ExtractorLabProps {
  height: number;
  maxItems: number;
  documents: DocumentChoice[];
  onSearchDocuments: (filter: string) => void;
  onBack: () => void;
}

/** Result from a single judge run with its config */
interface JudgeRunResult {
  config: JudgeConfig;
  label: string;
  result: FallacyJudgeOutput;
  durationMs: number;
  error?: string;
}

/** Result from deduplication step */
interface DedupResult {
  /** Issues kept after dedup */
  kept: JudgeDecision[];
  /** Issues removed as duplicates */
  duplicates: JudgeDecision[];
  /** Issues removed due to limit */
  limitDropped: JudgeDecision[];
}

type LabStep =
  | { type: "select-document" }
  | { type: "configure-extractors" }
  | { type: "add-extractor" }
  | { type: "running" }
  | { type: "results"; result: MultiExtractorResult }
  | { type: "issue-detail"; result: MultiExtractorResult; extractorIdx: number; issueIdx: number }
  | { type: "running-judge"; result: MultiExtractorResult; judgeConfigs: JudgeConfig[] }
  | { type: "judge-comparison"; result: MultiExtractorResult; judgeResults: JudgeRunResult[] }
  | { type: "judge-results"; result: MultiExtractorResult; judgeResult: FallacyJudgeOutput; judgeLabel: string }
  | { type: "judge-decision-detail"; result: MultiExtractorResult; judgeResult: FallacyJudgeOutput; decision: JudgeDecision; isRejected: boolean; judgeLabel: string }
  | { type: "dedup-results"; result: MultiExtractorResult; judgeResult: FallacyJudgeOutput; judgeLabel: string; dedupResult: DedupResult };

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
  const { stdout } = useStdout();
  const [step, setStep] = useState<LabStep>({ type: "select-document" });
  const [selectedDoc, setSelectedDoc] = useState<DocumentChoice | null>(null);
  const [documentText, setDocumentText] = useState<string>("");

  // Calculate available width for text based on terminal width
  // Border overhead: │ (1) + padding (1) + content + padding (1) + │ (1) = 4
  // SelectInput indicator: "❯ " or "  " = 2
  // Total frame overhead = 6
  const termWidth = stdout?.columns ?? 120;

  // For extraction results: "  🔴 [issueType] text"
  // Overhead: indicator(2) + spaces(2) + emoji(2) + space(1) + [type](~18) + space(1) = ~26
  const issueTextWidth = Math.max(40, termWidth - 6 - 26);

  // For judge decisions: "[+] type.padEnd(18) text [A,B]"
  // Overhead: indicator(2) + [+]space(4) + type(18) + space(1) + space(1) + [A,B](10) = 36
  const judgeTextWidth = Math.max(40, termWidth - 6 - 36);
  const [extractorConfigs, setExtractorConfigs] = useState<ExtractorConfig[]>(getInitialExtractorConfigs);
  const [availableJudges] = useState<JudgeConfig[]>(() => getJudgesConfig());
  const [selectedJudgeIdxs, setSelectedJudgeIdxs] = useState<Set<number>>(() => new Set([0])); // First judge selected by default
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
        judge: { model: "", enabled: false }, // We'll run judge manually for instrumentation
      });

      setStep({ type: "results", result });
    } catch (e) {
      setError(`Extraction failed: ${e}`);
      setStep({ type: "configure-extractors" });
    }
  }

  async function runJudge(extractionResult: MultiExtractorResult, judgeConfig?: JudgeConfig, judgeLabel?: string): Promise<JudgeRunResult> {
    // Flatten all issues from all extractors
    const allIssues = extractionResult.extractorResults.flatMap((r) =>
      r.issues.map((issue) => ({
        extractorId: r.extractorId,
        exactText: issue.exactText,
        issueType: issue.issueType,
        fallacyType: issue.fallacyType,
        severityScore: issue.severityScore,
        confidenceScore: issue.confidenceScore,
        importanceScore: issue.importanceScore,
        reasoning: issue.reasoning,
      }))
    );

    const extractorIds = extractionResult.extractorResults
      .filter((r) => !r.error)
      .map((r) => r.extractorId);

    const startTime = Date.now();
    const label = judgeLabel || (judgeConfig ? generateJudgeLabel(judgeConfig) : "default");

    try {
      const judgeResult = await fallacyJudgeTool.execute(
        {
          documentText,
          issues: allIssues,
          extractorIds,
          judgeConfig,
        },
        { logger: simpleLogger }
      );

      return {
        config: judgeConfig || { model: "default", enabled: true },
        label,
        result: judgeResult,
        durationMs: Date.now() - startTime,
      };
    } catch (e) {
      return {
        config: judgeConfig || { model: "default", enabled: true },
        label,
        result: {
          acceptedDecisions: [],
          rejectedDecisions: [],
          summary: { totalInputIssues: allIssues.length, uniqueGroups: 0, acceptedCount: 0, mergedCount: 0, rejectedCount: 0 },
        },
        durationMs: Date.now() - startTime,
        error: String(e),
      };
    }
  }

  async function runMultipleJudges(extractionResult: MultiExtractorResult, judgeConfigs: JudgeConfig[]) {
    setStep({ type: "running-judge", result: extractionResult, judgeConfigs });

    try {
      // Run all judges in parallel
      const judgePromises = judgeConfigs.map(config =>
        runJudge(extractionResult, config, generateJudgeLabel(config))
      );

      const judgeResults = await Promise.all(judgePromises);

      // Check if any had errors
      const errored = judgeResults.filter(r => r.error);
      if (errored.length === judgeResults.length) {
        throw new Error(`All judges failed: ${errored[0].error}`);
      }

      // If only one judge was selected, go directly to its results
      if (judgeResults.length === 1) {
        const single = judgeResults[0];
        setStep({ type: "judge-results", result: extractionResult, judgeResult: single.result, judgeLabel: single.label });
      } else {
        // Multiple judges - show comparison view
        setStep({ type: "judge-comparison", result: extractionResult, judgeResults });
      }
    } catch (e) {
      setError(`Judges failed: ${e}`);
      setStep({ type: "results", result: extractionResult });
    }
  }

  // Deduplication: remove duplicates, sort by priority, limit count
  // Mirrors the pipeline's Phase 1.5 deduplication
  const MAX_ISSUES = 25;

  function runDeduplication(
    extractionResult: MultiExtractorResult,
    judgeResult: FallacyJudgeOutput,
    judgeLabel: string
  ) {
    const decisions = judgeResult.acceptedDecisions;

    // Step 1: Remove exact text duplicates (case-insensitive, whitespace normalized)
    const seen = new Set<string>();
    const unique: JudgeDecision[] = [];
    const duplicates: JudgeDecision[] = [];

    for (const decision of decisions) {
      const key = decision.finalText.toLowerCase().replace(/\s+/g, " ").trim();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(decision);
      } else {
        duplicates.push(decision);
      }
    }

    // Step 2: Calculate priority score and sort (higher = more important)
    const priorityScore = (d: JudgeDecision) =>
      d.finalSeverity * 0.6 + d.finalImportance * 0.4;

    const sorted = [...unique].sort((a, b) => priorityScore(b) - priorityScore(a));

    // Step 3: Limit to MAX_ISSUES
    const kept = sorted.slice(0, MAX_ISSUES);
    const limitDropped = sorted.slice(MAX_ISSUES);

    setStep({
      type: "dedup-results",
      result: extractionResult,
      judgeResult,
      judgeLabel,
      dedupResult: { kept, duplicates, limitDropped },
    });
  }

  // Handle keyboard input - use ref to avoid stale closure
  useInput((input, key) => {
    if (key.escape) {
      const currentStep = stepRef.current;
      if (currentStep.type === "issue-detail") {
        setStep({ type: "results", result: currentStep.result });
      } else if (currentStep.type === "judge-decision-detail") {
        setStep({ type: "judge-results", result: currentStep.result, judgeResult: currentStep.judgeResult, judgeLabel: currentStep.judgeLabel });
      } else if (currentStep.type === "judge-results") {
        setStep({ type: "results", result: currentStep.result });
      } else if (currentStep.type === "judge-comparison") {
        setStep({ type: "results", result: currentStep.result });
      } else if (currentStep.type === "dedup-results") {
        setStep({ type: "judge-results", result: currentStep.result, judgeResult: currentStep.judgeResult, judgeLabel: currentStep.judgeLabel });
      } else if (currentStep.type === "results") {
        setStep({ type: "configure-extractors" });
      } else if (currentStep.type === "add-extractor") {
        setStep({ type: "configure-extractors" });
      } else if (currentStep.type === "configure-extractors") {
        setStep({ type: "select-document" });
      } else if (currentStep.type === "select-document") {
        onBack();
      }
      // Don't call onBack for running/running-judge states
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

  // Document selection using reusable DocumentSelector
  if (step.type === "select-document") {
    return (
      <DocumentSelector
        title="Extractor Lab - Select Document"
        borderColor="magenta"
        height={height}
        maxItems={maxItems}
        documents={documents}
        showFilter={true}
        onFilterChange={onSearchDocuments}
        onSelect={async (doc) => {
          setSelectedDoc(doc);
          await loadDocumentText(doc.id);
          setStep({ type: "configure-extractors" });
        }}
        onCancel={onBack}
      />
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
    const hasMultipleExtractors = result.extractorResults.filter((r) => !r.error).length > 1;

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
          label: `  ${severityColor} [${issue.issueType}] ${truncate(issue.exactText.replace(/\n/g, ' '), issueTextWidth)}`,
          value: `issue-${extractorIdx}-${issueIdx}`,
        });
      });
    });

    // Actions at the bottom
    issueItems.push({ label: "───────────────────────────────────────────────────────────────────────────", value: "sep-1" });

    // Judge selection (only if we have multiple extractors with issues)
    if (hasMultipleExtractors && totalIssues > 0) {
      if (availableJudges.length > 0) {
        // Show available judges with checkboxes for multi-select
        availableJudges.forEach((judge, idx) => {
          const label = generateJudgeLabel(judge);
          const isSelected = selectedJudgeIdxs.has(idx);
          const prefix = isSelected ? "[x]" : "[ ]";
          const thinkStr = judge.thinking ? "think" : "noThink";
          const tempStr = judge.temperature === 'default' ? 'tDef' : judge.temperature !== undefined ? `t${judge.temperature}` : '';
          issueItems.push({
            label: `${prefix} Judge: ${label} (${tempStr ? tempStr + ', ' : ''}${thinkStr})`,
            value: `judge-${idx}`,
          });
        });

        issueItems.push({ label: "─────────────────────────────────────────", value: "sep-2" });

        const selectedCount = selectedJudgeIdxs.size;
        const judgeLabel = selectedCount === 1
          ? generateJudgeLabel(availableJudges[[...selectedJudgeIdxs][0]])
          : `${selectedCount} judges`;
        issueItems.push({
          label: `⚖️  Run ${judgeLabel} (aggregate ${totalIssues} issues)`,
          value: "run-judge",
        });
      } else {
        // No judges configured - show hint
        issueItems.push({
          label: `⚠️  No judges configured. Set FALLACY_JUDGES or FALLACY_JUDGE env var`,
          value: "no-judges",
        });
      }
    }
    issueItems.push({ label: "← Back to Configure", value: "back" });

    return (
      <Box flexDirection="column" borderStyle="round" borderColor="green" padding={1} height={height}>
        <Box justifyContent="center" marginBottom={1}>
          <Text bold color="green">Extractor Lab - Extraction Results: </Text>
          <Text color="cyan">{selectedDoc?.title}</Text>
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
            if (item.value.startsWith("sep-") || item.value.startsWith("header-")) {
              // Ignore separators and headers
              return;
            } else if (item.value === "back") {
              setStep({ type: "configure-extractors" });
            } else if (item.value === "run-judge") {
              // Run all selected judges
              const selectedConfigs = [...selectedJudgeIdxs].map(idx => availableJudges[idx]);
              runMultipleJudges(result, selectedConfigs);
            } else if (item.value.startsWith("judge-")) {
              // Toggle multi-select
              const idx = parseInt(item.value.replace("judge-", ""), 10);
              setSelectedJudgeIdxs(prev => {
                const next = new Set(prev);
                if (next.has(idx)) {
                  // Don't allow deselecting the last one
                  if (next.size > 1) {
                    next.delete(idx);
                  }
                } else {
                  next.add(idx);
                }
                return next;
              });
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

  // Running judge(s)
  if (step.type === "running-judge") {
    const totalIssues = step.result.extractorResults.reduce((sum, r) => sum + r.issues.length, 0);
    const judgeCount = step.judgeConfigs.length;
    const judgeNames = step.judgeConfigs.map(c => generateJudgeLabel(c)).join(", ");
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="yellow" padding={1} height={height}>
        <Box justifyContent="center" marginBottom={1}>
          <Text bold color="yellow">Extractor Lab - Running {judgeCount > 1 ? `${judgeCount} Judges` : "Judge"}</Text>
        </Box>

        <Box justifyContent="center" padding={2}>
          <Text>
            <Spinner type="dots" /> Aggregating {totalIssues} issues from {step.result.extractorResults.length} extractors...
          </Text>
        </Box>

        <Box justifyContent="center" flexDirection="column">
          <Text dimColor>The judge{judgeCount > 1 ? "s" : ""} will deduplicate, merge, and filter issues</Text>
          {judgeCount > 1 && <Text dimColor>Running in parallel: {judgeNames}</Text>}
        </Box>
      </Box>
    );
  }

  // Judge results
  if (step.type === "judge-results") {
    const { result, judgeResult, judgeLabel } = step;
    const totalInputIssues = result.extractorResults.reduce((sum, r) => sum + r.issues.length, 0);

    // Create legend mapping extractor IDs to short keys (A, B, C, ...)
    const extractorIds = result.extractorResults.map(r => r.extractorId);
    const extractorKeys: Record<string, string> = {};
    extractorIds.forEach((id, i) => {
      extractorKeys[id] = String.fromCharCode(65 + i); // A, B, C, ...
    });

    // Helper to convert extractor IDs to short keys
    const sourcesToKeys = (sources: string[]): string => {
      return sources.map(s => extractorKeys[s] || "?").join(",");
    };

    // Build list of judge decisions
    const decisionItems: Array<{ label: string; value: string }> = [];

    // Accepted/merged decisions
    judgeResult.acceptedDecisions.forEach((decision, idx) => {
      const symbol = decision.decision === "merge" ? "[*]" : "[+]";
      const keys = sourcesToKeys(decision.sourceExtractors);
      const text = truncate(decision.finalText.replace(/\n/g, ' '), judgeTextWidth).padEnd(judgeTextWidth);
      decisionItems.push({
        label: `${symbol} ${decision.finalIssueType.padEnd(18)} ${text} [${keys}]`,
        value: `accepted-${idx}`,
      });
    });

    // Rejected decisions
    judgeResult.rejectedDecisions.forEach((decision, idx) => {
      const keys = sourcesToKeys(decision.sourceExtractors);
      const text = truncate(decision.finalText.replace(/\n/g, ' '), judgeTextWidth).padEnd(judgeTextWidth);
      decisionItems.push({
        label: `[x] ${decision.finalIssueType.padEnd(18)} ${text} [${keys}]`,
        value: `rejected-${idx}`,
      });
    });

    decisionItems.push({ label: "───────────────────────────────────────────────────────────────────────────────────────", value: "sep-1" });
    decisionItems.push({ label: `▶ Run Deduplication (${judgeResult.acceptedDecisions.length} issues)`, value: "run-dedup" });
    decisionItems.push({ label: "← Back to Extraction Results", value: "back" });

    // Build legend string
    const legendParts = extractorIds.map((id, i) => `${String.fromCharCode(65 + i)}=${id}`);
    const legendStr = legendParts.join("  ");

    return (
      <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1} height={height}>
        <Box justifyContent="center" marginBottom={1}>
          <Text bold color="cyan">Judge Results{judgeLabel ? `: ${judgeLabel}` : ""}</Text>
        </Box>

        <Box borderStyle="single" borderColor="gray" marginBottom={1} paddingX={1} flexDirection="column">
          <Text>
            <Text bold>Input: </Text><Text>{totalInputIssues} issues</Text>
            <Text>  --&gt;  </Text>
            <Text bold color="green">{judgeResult.summary.acceptedCount} accepted</Text>
            <Text>  |  </Text>
            <Text bold color="yellow">{judgeResult.summary.mergedCount} merged</Text>
            <Text>  |  </Text>
            <Text bold color="red">{judgeResult.summary.rejectedCount} rejected</Text>
          </Text>
          <Text dimColor>Legend: [+]=accept [*]=merge [x]=reject  |  {legendStr}</Text>
        </Box>

        <SelectInput
          items={decisionItems}
          limit={maxItems - 5}
          onSelect={(item) => {
            if (item.value.startsWith("sep-")) {
              return; // Ignore separators
            } else if (item.value === "back") {
              setStep({ type: "results", result });
            } else if (item.value === "run-dedup") {
              runDeduplication(result, judgeResult, judgeLabel || "");
            } else if (item.value.startsWith("accepted-")) {
              const idx = parseInt(item.value.replace("accepted-", ""), 10);
              setStep({
                type: "judge-decision-detail",
                result,
                judgeResult,
                decision: judgeResult.acceptedDecisions[idx],
                isRejected: false,
                judgeLabel: judgeLabel || "",
              });
            } else if (item.value.startsWith("rejected-")) {
              const idx = parseInt(item.value.replace("rejected-", ""), 10);
              setStep({
                type: "judge-decision-detail",
                result,
                judgeResult,
                decision: judgeResult.rejectedDecisions[idx],
                isRejected: true,
                judgeLabel: judgeLabel || "",
              });
            }
          }}
        />

        <Box marginTop={1} justifyContent="center">
          <Text dimColor>Enter=View Detail | Escape=Back</Text>
        </Box>
      </Box>
    );
  }

  // Judge decision detail
  if (step.type === "judge-decision-detail") {
    const { decision, isRejected } = step;

    return (
      <Box flexDirection="column" borderStyle="round" borderColor={isRejected ? "red" : "green"} padding={1} height={height}>
        <Box justifyContent="center" marginBottom={1}>
          <Text bold color={isRejected ? "red" : "green"}>
            Judge Decision: {decision.decision.toUpperCase()}
          </Text>
        </Box>

        <Box borderStyle="single" borderColor="gray" marginBottom={1} paddingX={1} flexDirection="column">
          <Text>
            <Text bold>Decision: </Text>
            <Text color={isRejected ? "red" : "green"}>{decision.decision}</Text>
          </Text>
          <Text>
            <Text bold>Type: </Text>
            <Text color="cyan">{decision.finalIssueType}</Text>
            {decision.finalFallacyType && <Text dimColor> ({decision.finalFallacyType})</Text>}
          </Text>
          <Text>
            <Text bold>Severity: </Text>
            <Text color={decision.finalSeverity >= 70 ? "red" : decision.finalSeverity >= 40 ? "yellow" : "green"}>
              {decision.finalSeverity}/100
            </Text>
            <Text>  |  </Text>
            <Text bold>Confidence: </Text><Text>{decision.finalConfidence}/100</Text>
            <Text>  |  </Text>
            <Text bold>Importance: </Text><Text>{decision.finalImportance}/100</Text>
          </Text>
          <Text>
            <Text bold>Source Extractors: </Text>
            <Text color="yellow">{decision.sourceExtractors.join(", ")}</Text>
          </Text>
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          <Text bold underline>Quoted Text:</Text>
          <Box marginLeft={1} marginTop={1}>
            <Text color="gray" wrap="wrap">"{decision.finalText}"</Text>
          </Box>
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          <Text bold underline>Judge Reasoning:</Text>
          <Box marginLeft={1} marginTop={1}>
            <Text wrap="wrap" color="cyan">{decision.judgeReasoning}</Text>
          </Box>
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          <Text bold underline>Issue Reasoning:</Text>
          <Box marginLeft={1} marginTop={1}>
            <Text wrap="wrap">{decision.finalReasoning}</Text>
          </Box>
        </Box>

        <Box marginTop={1} justifyContent="center">
          <Text dimColor>Press Escape to go back to judge results</Text>
        </Box>
      </Box>
    );
  }

  // Judge comparison view - comparing multiple judges
  if (step.type === "judge-comparison") {
    const { result, judgeResults } = step;
    const totalInputIssues = result.extractorResults.reduce((sum, r) => sum + r.issues.length, 0);

    // Build comparison items
    const comparisonItems: Array<{ label: string; value: string }> = [];

    // Header row
    comparisonItems.push({
      label: `── Judge Comparison: ${judgeResults.length} judges, ${totalInputIssues} input issues ──`,
      value: "header",
    });

    // Each judge row
    judgeResults.forEach((jr, idx) => {
      const status = jr.error ? "❌ Error" : `✅ ${jr.result.summary.acceptedCount} accepted, ${jr.result.summary.mergedCount} merged, ${jr.result.summary.rejectedCount} rejected`;
      const duration = `${(jr.durationMs / 1000).toFixed(1)}s`;
      comparisonItems.push({
        label: `[${idx + 1}] ${jr.label.padEnd(30)} ${duration.padEnd(8)} ${status}`,
        value: `judge-${idx}`,
      });

      // If error, show error details
      if (jr.error) {
        comparisonItems.push({
          label: `    Error: ${truncate(jr.error, termWidth - 20)}`,
          value: `error-${idx}`,
        });
      }
    });

    // Summary stats
    comparisonItems.push({
      label: "────────────────────────────────────────────────────────────────────────────",
      value: "sep-1",
    });

    // Agreement summary - find issues accepted by all judges
    const successfulJudges = judgeResults.filter(jr => !jr.error);
    if (successfulJudges.length > 1) {
      // Get accepted issue texts from each judge for comparison
      const acceptedByJudge = successfulJudges.map(jr =>
        new Set(jr.result.acceptedDecisions.map(d => d.finalText.toLowerCase().trim()))
      );

      // Find issues in ALL judges (intersection)
      const unanimouslyAccepted = [...acceptedByJudge[0]].filter(text =>
        acceptedByJudge.every(set => set.has(text))
      ).length;

      // Find issues in ANY judge (union)
      const allAccepted = new Set(acceptedByJudge.flatMap(set => [...set])).size;

      const agreementPct = allAccepted > 0 ? Math.round((unanimouslyAccepted / allAccepted) * 100) : 0;

      comparisonItems.push({
        label: `📊 Agreement: ${unanimouslyAccepted}/${allAccepted} issues accepted by all judges (${agreementPct}%)`,
        value: "stats-1",
      });
    }

    comparisonItems.push({
      label: "────────────────────────────────────────────────────────────────────────────",
      value: "sep-2",
    });
    comparisonItems.push({ label: "← Back to Extraction Results", value: "back" });

    return (
      <Box flexDirection="column" borderStyle="round" borderColor="magenta" padding={1} height={height}>
        <Box justifyContent="center" marginBottom={1}>
          <Text bold color="magenta">Extractor Lab - Judge Comparison: </Text>
          <Text color="green">{selectedDoc?.title}</Text>
        </Box>

        <Box borderStyle="single" borderColor="gray" marginBottom={1} paddingX={1}>
          <Text>
            <Text bold>Input: </Text><Text>{totalInputIssues} issues from {result.extractorResults.length} extractors</Text>
            <Text>  |  </Text>
            <Text bold>Judges run: </Text><Text color="cyan">{judgeResults.length}</Text>
            <Text>  |  </Text>
            <Text bold>Successful: </Text><Text color="green">{judgeResults.filter(j => !j.error).length}</Text>
          </Text>
        </Box>

        <SelectInput
          items={comparisonItems.filter(i => !i.value.startsWith("sep-") && !i.value.startsWith("header") && !i.value.startsWith("stats-") && !i.value.startsWith("error-"))}
          limit={maxItems - 5}
          onSelect={(item) => {
            if (item.value === "back") {
              setStep({ type: "results", result });
            } else if (item.value.startsWith("judge-")) {
              const idx = parseInt(item.value.replace("judge-", ""), 10);
              const jr = judgeResults[idx];
              if (!jr.error) {
                setStep({
                  type: "judge-results",
                  result,
                  judgeResult: jr.result,
                  judgeLabel: jr.label,
                });
              }
            }
          }}
        />

        <Box marginTop={1} justifyContent="center">
          <Text dimColor>Enter=View Judge Details | Escape=Back to Results</Text>
        </Box>
      </Box>
    );
  }

  // Deduplication results view
  if (step.type === "dedup-results") {
    const { result, judgeResult, judgeLabel, dedupResult } = step;
    const { kept, duplicates, limitDropped } = dedupResult;
    const totalInput = judgeResult.acceptedDecisions.length;

    // Calculate priority score for display
    const priorityScore = (d: JudgeDecision) =>
      d.finalSeverity * 0.6 + d.finalImportance * 0.4;

    // Build list items
    const dedupItems: Array<{ label: string; value: string }> = [];

    // Kept issues (sorted by priority)
    dedupItems.push({ label: `── Kept (${kept.length}) ──`, value: "header-kept" });
    kept.forEach((d, idx) => {
      const score = priorityScore(d).toFixed(0);
      const text = truncate(d.finalText.replace(/\n/g, ' '), issueTextWidth);
      dedupItems.push({
        label: `  [${score}] ${d.finalIssueType.padEnd(18)} ${text}`,
        value: `kept-${idx}`,
      });
    });

    // Duplicates removed
    if (duplicates.length > 0) {
      dedupItems.push({ label: `── Duplicates Removed (${duplicates.length}) ──`, value: "header-dup" });
      duplicates.forEach((d, idx) => {
        const text = truncate(d.finalText.replace(/\n/g, ' '), issueTextWidth);
        dedupItems.push({
          label: `  [dup] ${d.finalIssueType.padEnd(18)} ${text}`,
          value: `dup-${idx}`,
        });
      });
    }

    // Limit dropped
    if (limitDropped.length > 0) {
      dedupItems.push({ label: `── Dropped by Limit (${limitDropped.length}) ──`, value: "header-limit" });
      limitDropped.forEach((d, idx) => {
        const score = priorityScore(d).toFixed(0);
        const text = truncate(d.finalText.replace(/\n/g, ' '), issueTextWidth);
        dedupItems.push({
          label: `  [${score}] ${d.finalIssueType.padEnd(18)} ${text}`,
          value: `limit-${idx}`,
        });
      });
    }

    dedupItems.push({ label: "───────────────────────────────────────────────────────────────────────────", value: "sep-1" });
    dedupItems.push({ label: "← Back to Judge Results", value: "back" });

    return (
      <Box flexDirection="column" borderStyle="round" borderColor="yellow" padding={1} height={height}>
        <Box justifyContent="center" marginBottom={1}>
          <Text bold color="yellow">Deduplication Results</Text>
        </Box>

        <Box borderStyle="single" borderColor="gray" marginBottom={1} paddingX={1}>
          <Text>
            <Text bold>Input: </Text><Text>{totalInput} issues</Text>
            <Text>  →  </Text>
            <Text bold color="green">{kept.length} kept</Text>
            {duplicates.length > 0 && <Text>  |  <Text color="red">{duplicates.length} duplicates</Text></Text>}
            {limitDropped.length > 0 && <Text>  |  <Text color="yellow">{limitDropped.length} over limit</Text></Text>}
          </Text>
        </Box>

        <SelectInput
          items={dedupItems.filter(i => !i.value.startsWith("header-") && !i.value.startsWith("sep-"))}
          limit={maxItems - 5}
          onSelect={(item) => {
            if (item.value === "back") {
              setStep({ type: "judge-results", result, judgeResult, judgeLabel });
            }
            // Could add detail view for individual items if needed
          }}
        />

        <Box marginTop={1} justifyContent="center">
          <Text dimColor>[score] = priority (sev*0.6 + imp*0.4) | Escape=Back</Text>
        </Box>
      </Box>
    );
  }

  return null;
}
