import React from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import type { MultiExtractorResult, JudgeRunResult, DocumentChoice } from "../types";
import { truncate } from "../utils";

interface JudgeComparisonViewProps {
  height: number;
  maxItems: number;
  result: MultiExtractorResult;
  judgeResults: JudgeRunResult[];
  selectedDoc: DocumentChoice | null;
  termWidth: number;
  onBack: () => void;
  onViewJudge: (judgeResult: JudgeRunResult) => void;
}

export function JudgeComparisonView({
  height,
  maxItems,
  result,
  judgeResults,
  selectedDoc,
  termWidth,
  onBack,
  onViewJudge,
}: JudgeComparisonViewProps) {
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
        items={comparisonItems.filter(i => !i.value.startsWith("sep-") && !i.value.startsWith("header") && !i.value.startsWith("stats-"))}
        limit={maxItems - 5}
        onSelect={(item) => {
          if (item.value === "back") {
            onBack();
          } else if (item.value.startsWith("error-")) {
            return;
          } else if (item.value.startsWith("judge-")) {
            const idx = parseInt(item.value.replace("judge-", ""), 10);
            const jr = judgeResults[idx];
            if (!jr.error) {
              onViewJudge(jr);
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
