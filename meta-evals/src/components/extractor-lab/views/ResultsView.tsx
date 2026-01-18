import React from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import type { MultiExtractorResult, DocumentChoice } from "../types";
import { truncate } from "../utils";

interface ResultsViewProps {
  height: number;
  maxItems: number;
  result: MultiExtractorResult;
  selectedDoc: DocumentChoice | null;
  issueTextWidth: number;
  onBack: () => void;
  onRunDedup: () => void;
  onViewIssue: (extractorIdx: number, issueIdx: number) => void;
}

export function ResultsView({
  height,
  maxItems,
  result,
  selectedDoc,
  issueTextWidth,
  onBack,
  onRunDedup,
  onViewIssue,
}: ResultsViewProps) {
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
        label: `  ${severityColor} [${issue.issueType}] ${truncate(issue.exactText.replace(/\n/g, ' '), issueTextWidth)}`,
        value: `issue-${extractorIdx}-${issueIdx}`,
      });
    });
  });

  // Actions at the bottom
  issueItems.push({ label: "───────────────────────────────────────────────────────────────────────────", value: "sep-1" });

  // Deduplicate button (only if we have issues)
  if (totalIssues > 0) {
    issueItems.push({
      label: `▶ Deduplicate & Prepare for Judge (${totalIssues} issues)`,
      value: "run-dedup",
    });
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
            return;
          } else if (item.value === "back") {
            onBack();
          } else if (item.value === "run-dedup") {
            onRunDedup();
          } else if (item.value.startsWith("issue-")) {
            const [, extractorIdx, issueIdx] = item.value.split("-");
            onViewIssue(parseInt(extractorIdx), parseInt(issueIdx));
          }
        }}
      />

      <Box marginTop={1} justifyContent="center">
        <Text dimColor>Enter View Detail | Escape Back</Text>
      </Box>
    </Box>
  );
}
