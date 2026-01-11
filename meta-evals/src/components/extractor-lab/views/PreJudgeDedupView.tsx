import React from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import type { MultiExtractorResult, PreJudgeDedupResult, JudgeConfig } from "../types";
import { truncate } from "../utils";

interface PreJudgeDedupViewProps {
  height: number;
  maxItems: number;
  result: MultiExtractorResult;
  dedupResult: PreJudgeDedupResult;
  availableJudges: JudgeConfig[];
  selectedJudgeIdxs: Set<number>;
  issueTextWidth: number;
  generateJudgeLabel: (config: JudgeConfig) => string;
  onBack: () => void;
  onRunJudges: (selectedConfigs: JudgeConfig[]) => void;
  onToggleJudge: (idx: number) => void;
}

export function PreJudgeDedupView({
  height,
  maxItems,
  dedupResult,
  availableJudges,
  selectedJudgeIdxs,
  issueTextWidth,
  generateJudgeLabel,
  onBack,
  onRunJudges,
  onToggleJudge,
}: PreJudgeDedupViewProps) {
  const { unique, duplicates, originalCount } = dedupResult;

  // Build judge selection items only
  const judgeItems: Array<{ label: string; value: string }> = [];

  if (availableJudges.length > 0) {
    availableJudges.forEach((judge, idx) => {
      const label = generateJudgeLabel(judge);
      const isSelected = selectedJudgeIdxs.has(idx);
      const prefix = isSelected ? "[x]" : "[ ]";
      const thinkStr = judge.thinking ? "think" : "noThink";
      const tempStr = judge.temperature === 'default' ? 'tDef' : judge.temperature !== undefined ? `t${judge.temperature}` : '';
      judgeItems.push({
        label: `${prefix} Judge: ${label} (${tempStr ? tempStr + ', ' : ''}${thinkStr})`,
        value: `judge-${idx}`,
      });
    });

    const selectedCount = selectedJudgeIdxs.size;
    const judgeLabel = selectedCount === 1
      ? generateJudgeLabel(availableJudges[[...selectedJudgeIdxs][0]])
      : `${selectedCount} judges`;
    judgeItems.push({
      label: `⚖️  Run ${judgeLabel} (aggregate ${unique.length} issues)`,
      value: "run-judge",
    });
  } else {
    judgeItems.push({
      label: `⚠️  No judges configured. Set FALLACY_JUDGES or FALLACY_JUDGE env var`,
      value: "no-judges",
    });
  }

  judgeItems.push({ label: "← Back to Extraction Results", value: "back" });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" padding={1} height={height}>
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color="yellow">Pre-Judge Deduplication</Text>
      </Box>

      {/* Summary stats */}
      <Box borderStyle="single" borderColor="gray" marginBottom={1} paddingX={1}>
        <Text>
          <Text bold>Original: </Text><Text>{originalCount}</Text>
          <Text>  →  </Text>
          <Text bold color="green">{unique.length} unique</Text>
          {duplicates.length > 0 && <Text>  |  <Text color="red">{duplicates.length} duplicates removed</Text></Text>}
        </Text>
      </Box>

      {/* Duplicates list (if any) */}
      {duplicates.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text dimColor>Duplicates removed:</Text>
          {duplicates.slice(0, 3).map((d, idx) => (
            <Text key={idx} dimColor>
              {"  "}[{d.extractorId}] {truncate(d.exactText.replace(/\n/g, ' '), issueTextWidth - 20)}
            </Text>
          ))}
          {duplicates.length > 3 && <Text dimColor>  ... and {duplicates.length - 3} more</Text>}
        </Box>
      )}

      {/* Judge selection */}
      <Box borderStyle="single" borderColor="cyan" paddingX={1} flexDirection="column">
        <Text bold color="cyan">Select Judges:</Text>
      </Box>

      <SelectInput
        items={judgeItems}
        limit={maxItems - 10}
        onSelect={(item) => {
          if (item.value === "back") {
            onBack();
          } else if (item.value === "run-judge") {
            const selectedConfigs = [...selectedJudgeIdxs].map(idx => availableJudges[idx]);
            onRunJudges(selectedConfigs);
          } else if (item.value.startsWith("judge-")) {
            const idx = parseInt(item.value.replace("judge-", ""), 10);
            onToggleJudge(idx);
          }
        }}
      />

      <Box marginTop={1} justifyContent="center">
        <Text dimColor>Toggle judges with Enter | Escape=Back</Text>
      </Box>
    </Box>
  );
}
