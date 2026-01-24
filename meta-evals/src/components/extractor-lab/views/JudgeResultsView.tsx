import React from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import type { MultiExtractorResult, FallacyJudgeOutput, JudgeDecision, JudgeRunResult } from "../types";
import { truncate } from "../utils";

interface JudgeResultsViewProps {
  height: number;
  maxItems: number;
  result: MultiExtractorResult;
  judgeResult: FallacyJudgeOutput;
  judgeLabel: string;
  judgeResults?: JudgeRunResult[];
  judgeTextWidth: number;
  onBack: () => void;
  onViewDecision: (decision: JudgeDecision, isRejected: boolean) => void;
}

export function JudgeResultsView({
  height,
  maxItems,
  result,
  judgeResult,
  judgeLabel,
  judgeTextWidth,
  onBack,
  onViewDecision,
}: JudgeResultsViewProps) {
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
  decisionItems.push({ label: "← Back", value: "back" });

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
            return;
          } else if (item.value === "back") {
            onBack();
          } else if (item.value.startsWith("accepted-")) {
            const idx = parseInt(item.value.replace("accepted-", ""), 10);
            onViewDecision(judgeResult.acceptedDecisions[idx], false);
          } else if (item.value.startsWith("rejected-")) {
            const idx = parseInt(item.value.replace("rejected-", ""), 10);
            onViewDecision(judgeResult.rejectedDecisions[idx], true);
          }
        }}
      />

      <Box marginTop={1} justifyContent="center">
        <Text dimColor>Enter=View Detail | Escape=Back</Text>
      </Box>
    </Box>
  );
}
