/**
 * Extractor Lab - Test extraction in isolation
 *
 * Allows running the fallacy extractor directly without the full pipeline,
 * for quick iteration on extractor config and prompts.
 */

import React, { useState, useRef } from "react";
import { useInput, useStdout } from "ink";
import { prisma, type DocumentChoice } from "@roast/db";
import {
  getMultiExtractorConfig,
  type ExtractorConfig,
  type MultiExtractorResult,
} from "@roast/ai/fallacy-extraction/lab";
import { runMultiExtractor } from "@roast/ai/fallacy-extraction";
import fallacyJudgeModule from "@roast/ai/fallacy-judge";
import type { JudgeConfig } from "@roast/ai/fallacy-judge/types";
import { ModelSelector } from "./ModelSelector";
import { DocumentSelector } from "./DocumentSelector";

// Import extracted modules
import type {
  ExtractorLabProps,
  LabStep,
  JudgeRunResult,
  ExtractorIssue,
  DedupStrategy,
  DedupComparison,
  MultiStrategyDedupResult,
} from "./extractor-lab/types";
import {
  truncate,
  simpleLogger,
  TEMP_PRESETS,
  calculateTextWidths,
  runMultiStrategyDedup,
} from "./extractor-lab/utils";
import {
  ErrorView,
  RunningView,
  RunningJudgeView,
  ConfigureExtractorsView,
  IssueDetailView,
  ResultsView,
  PreJudgeDedupView,
  JudgeResultsView,
  JudgeDecisionDetailView,
  JudgeComparisonView,
} from "./extractor-lab/views";

// CommonJS/ESM interop
const fallacyJudgeTool = (fallacyJudgeModule as unknown as { default?: typeof fallacyJudgeModule }).default ?? fallacyJudgeModule;
const { getJudgesConfig, generateJudgeLabel } = fallacyJudgeModule as unknown as {
  getJudgesConfig: () => JudgeConfig[];
  generateJudgeLabel: (config: JudgeConfig) => string;
};

// Load extractor configs from FALLACY_EXTRACTORS env var, fallback to default
function getInitialExtractorConfigs(): ExtractorConfig[] {
  try {
    const config = getMultiExtractorConfig();
    return config.extractors;
  } catch {
    return [{ model: "claude-sonnet-4-5-20250929", temperature: "default", thinking: false }];
  }
}

export function ExtractorLab({ height, maxItems, documents, onSearchDocuments, onBack }: ExtractorLabProps) {
  const { stdout } = useStdout();
  const [step, setStep] = useState<LabStep>({ type: "select-document" });
  const [selectedDoc, setSelectedDoc] = useState<DocumentChoice | null>(null);
  const [documentText, setDocumentText] = useState<string>("");

  // Calculate widths
  const termWidth = stdout?.columns ?? 120;
  const { issueTextWidth, judgeTextWidth } = calculateTextWidths(termWidth);

  const [extractorConfigs, setExtractorConfigs] = useState<ExtractorConfig[]>(getInitialExtractorConfigs);
  const [availableJudges] = useState<JudgeConfig[]>(() => getJudgesConfig());
  const [selectedJudgeIdxs, setSelectedJudgeIdxs] = useState<Set<number>>(() => new Set([0]));
  const [selectedStrategy, setSelectedStrategy] = useState<DedupStrategy>("jaccard");
  const [error, setError] = useState<string | null>(null);
  const [highlightedItem, setHighlightedItem] = useState<string>("");

  const stepRef = useRef(step);
  stepRef.current = step;
  const highlightedRef = useRef(highlightedItem);
  highlightedRef.current = highlightedItem;

  // ─────────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────────

  async function loadDocumentText(docId: string) {
    try {
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
      if (doc?.versions[0]?.content) {
        setDocumentText(doc.versions[0].content);
      } else {
        setError("Document has no content");
      }
    } catch (err) {
      setError(`Failed to load document: ${err}`);
    }
  }

  async function runExtraction() {
    setStep({ type: "running" });
    try {
      const result = await runMultiExtractor(documentText, {
        extractors: extractorConfigs,
        judge: { model: "", enabled: false }, // We'll run judge manually for instrumentation
      });
      setStep({ type: "results", result });
    } catch (err) {
      setError(`Extraction failed: ${err}`);
      setStep({ type: "configure-extractors" });
    }
  }

  function runPreJudgeDedup(extractionResult: MultiExtractorResult, navigate = true): MultiStrategyDedupResult | null {
    try {
      const multiDedup = runMultiStrategyDedup(extractionResult);
      if (navigate) {
        setStep({ type: "pre-judge-dedup", result: extractionResult, multiDedup, selectedStrategy });
      }
      return multiDedup;
    } catch (err) {
      setError(`Dedup failed: ${err}`);
      return null;
    }
  }

  async function runJudge(
    extractionResult: MultiExtractorResult,
    dedupIssues: ExtractorIssue[],
    judgeConfig?: JudgeConfig,
    judgeLabel?: string
  ): Promise<JudgeRunResult> {
    const extractorIds = extractionResult.extractorResults
      .filter((r) => !r.error)
      .map((r) => r.extractorId);

    const startTime = Date.now();

    try {
      const judgeResult = await fallacyJudgeTool.execute(
        {
          documentText,
          issues: dedupIssues,
          extractorIds,
          judgeConfig,
        },
        { logger: simpleLogger }
      );

      return {
        config: judgeConfig!,
        label: judgeLabel || "default",
        result: judgeResult,
        durationMs: Date.now() - startTime,
      };
    } catch (err) {
      return {
        config: judgeConfig!,
        label: judgeLabel || "default",
        result: {
          acceptedDecisions: [],
          rejectedDecisions: [],
          summary: { totalInputIssues: dedupIssues.length, uniqueGroups: 0, acceptedCount: 0, mergedCount: 0, rejectedCount: 0 },
        },
        durationMs: Date.now() - startTime,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async function runMultipleJudges(
    extractionResult: MultiExtractorResult,
    dedupResult: DedupComparison,
    judgeConfigs: JudgeConfig[]
  ) {
    // Convert DedupComparison to PreJudgeDedupResult for running-judge step
    // Extract just the duplicate issues (not the match info)
    const preDedupResult = {
      unique: dedupResult.unique,
      duplicates: dedupResult.duplicates.map(m => m.duplicate),
      originalCount: dedupResult.originalCount,
    };
    setStep({ type: "running-judge", result: extractionResult, dedupResult: preDedupResult, judgeConfigs });

    const results = await Promise.all(
      judgeConfigs.map((config) =>
        runJudge(extractionResult, dedupResult.unique, config, generateJudgeLabel(config))
      )
    );

    if (results.length === 1 && !results[0].error) {
      setStep({
        type: "judge-results",
        result: extractionResult,
        judgeResult: results[0].result,
        judgeLabel: results[0].label,
      });
    } else {
      setStep({ type: "judge-comparison", result: extractionResult, judgeResults: results });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Keyboard handling
  // ─────────────────────────────────────────────────────────────────────────────

  useInput((input, key) => {
    if (key.escape) {
      const currentStep = stepRef.current;

      if (currentStep.type === "issue-detail") {
        setStep({ type: "results", result: currentStep.result });
      } else if (currentStep.type === "judge-decision-detail") {
        const { result, judgeResult, judgeLabel, judgeResults } = currentStep;
        setStep({ type: "judge-results", result, judgeResult, judgeLabel, judgeResults });
      } else if (currentStep.type === "judge-results") {
        const { result, judgeResults } = currentStep;
        if (judgeResults) {
          setStep({ type: "judge-comparison", result, judgeResults });
        } else {
          const multiDedup = runPreJudgeDedup(result, false);
          if (multiDedup) {
            setStep({ type: "pre-judge-dedup", result, multiDedup, selectedStrategy });
          }
        }
      } else if (currentStep.type === "judge-comparison") {
        setStep({ type: "results", result: currentStep.result });
      } else if (currentStep.type === "pre-judge-dedup") {
        setStep({ type: "results", result: currentStep.result });
      } else if (currentStep.type === "results") {
        setStep({ type: "configure-extractors" });
      } else if (currentStep.type === "configure-extractors" || currentStep.type === "add-extractor") {
        setStep({ type: "select-document" });
      } else if (currentStep.type === "select-document") {
        onBack();
      }
    }

    // Keyboard shortcuts for configure screen
    if (stepRef.current.type === "configure-extractors") {
      const highlighted = highlightedRef.current;

      if (highlighted.startsWith("config-")) {
        const idx = parseInt(highlighted.replace("config-", ""), 10);

        if (input === "d") {
          setExtractorConfigs(configs => {
            if (configs.length <= 1) return configs;
            return configs.filter((_, i) => i !== idx);
          });
        } else if (input === "t") {
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

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  if (error) {
    return <ErrorView error={error} height={height} />;
  }

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

  if (step.type === "configure-extractors") {
    return (
      <ConfigureExtractorsView
        height={height}
        selectedDoc={selectedDoc}
        documentText={documentText}
        extractorConfigs={extractorConfigs}
        onHighlight={setHighlightedItem}
        onBack={() => setStep({ type: "select-document" })}
        onRun={runExtraction}
        onAdd={() => setStep({ type: "add-extractor" })}
        onToggleThinking={(idx) => {
          setExtractorConfigs(configs =>
            configs.map((c, i) => i === idx ? { ...c, thinking: !c.thinking } : c)
          );
        }}
      />
    );
  }

  if (step.type === "add-extractor") {
    return (
      <ModelSelector
        title="Add Extractor - Select Model"
        borderColor="cyan"
        height={height}
        maxItems={maxItems}
        onSelect={(model) => {
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

  if (step.type === "running") {
    return <RunningView height={height} extractorCount={extractorConfigs.length} />;
  }

  if (step.type === "results") {
    return (
      <ResultsView
        height={height}
        maxItems={maxItems}
        result={step.result}
        selectedDoc={selectedDoc}
        issueTextWidth={issueTextWidth}
        onBack={() => setStep({ type: "configure-extractors" })}
        onRunDedup={() => runPreJudgeDedup(step.result)}
        onViewIssue={(extractorIdx, issueIdx) => {
          setStep({ type: "issue-detail", result: step.result, extractorIdx, issueIdx });
        }}
      />
    );
  }

  if (step.type === "issue-detail") {
    return (
      <IssueDetailView
        height={height}
        result={step.result}
        extractorIdx={step.extractorIdx}
        issueIdx={step.issueIdx}
      />
    );
  }

  if (step.type === "pre-judge-dedup") {
    const currentDedup = step.multiDedup[step.selectedStrategy];
    return (
      <PreJudgeDedupView
        height={height}
        maxItems={maxItems}
        result={step.result}
        multiDedup={step.multiDedup}
        selectedStrategy={step.selectedStrategy}
        availableJudges={availableJudges}
        selectedJudgeIdxs={selectedJudgeIdxs}
        issueTextWidth={issueTextWidth}
        generateJudgeLabel={generateJudgeLabel}
        onBack={() => setStep({ type: "results", result: step.result })}
        onRunJudges={(configs, dedupResult) => runMultipleJudges(step.result, dedupResult, configs)}
        onToggleJudge={(idx) => {
          setSelectedJudgeIdxs(prev => {
            const next = new Set(prev);
            if (next.has(idx)) {
              if (next.size > 1) next.delete(idx);
            } else {
              next.add(idx);
            }
            return next;
          });
        }}
        onSelectStrategy={(strategy) => {
          setSelectedStrategy(strategy);
          setStep({ type: "pre-judge-dedup", result: step.result, multiDedup: step.multiDedup, selectedStrategy: strategy });
        }}
      />
    );
  }

  if (step.type === "running-judge") {
    return (
      <RunningJudgeView
        height={height}
        judgeConfigs={step.judgeConfigs}
        dedupResult={step.dedupResult}
        generateJudgeLabel={generateJudgeLabel}
      />
    );
  }

  if (step.type === "judge-comparison") {
    return (
      <JudgeComparisonView
        height={height}
        maxItems={maxItems}
        result={step.result}
        judgeResults={step.judgeResults}
        selectedDoc={selectedDoc}
        termWidth={termWidth}
        onBack={() => setStep({ type: "results", result: step.result })}
        onViewJudge={(jr) => {
          setStep({
            type: "judge-results",
            result: step.result,
            judgeResult: jr.result,
            judgeLabel: jr.label,
            judgeResults: step.judgeResults,
          });
        }}
      />
    );
  }

  if (step.type === "judge-results") {
    const { result, judgeResult, judgeLabel, judgeResults } = step;
    return (
      <JudgeResultsView
        height={height}
        maxItems={maxItems}
        result={result}
        judgeResult={judgeResult}
        judgeLabel={judgeLabel}
        judgeResults={judgeResults}
        judgeTextWidth={judgeTextWidth}
        onBack={() => {
          if (judgeResults) {
            setStep({ type: "judge-comparison", result, judgeResults });
          } else {
            const multiDedup = runPreJudgeDedup(result, false);
            if (multiDedup) {
              setStep({ type: "pre-judge-dedup", result, multiDedup, selectedStrategy });
            }
          }
        }}
        onViewDecision={(decision, isRejected) => {
          setStep({
            type: "judge-decision-detail",
            result,
            judgeResult,
            decision,
            isRejected,
            judgeLabel,
            judgeResults,
          });
        }}
      />
    );
  }

  if (step.type === "judge-decision-detail") {
    return (
      <JudgeDecisionDetailView
        height={height}
        decision={step.decision}
        isRejected={step.isRejected}
      />
    );
  }

  return null;
}
