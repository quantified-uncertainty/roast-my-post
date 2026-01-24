import React from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import * as fs from "fs";
import * as path from "path";
import type { MultiExtractorResult, MultiStrategyDedupResult, DedupStrategy, JudgeConfig, DedupComparison } from "../types";

interface PreJudgeDedupViewProps {
  height: number;
  maxItems: number;
  result: MultiExtractorResult;
  multiDedup: MultiStrategyDedupResult;
  selectedStrategy: DedupStrategy;
  availableJudges: JudgeConfig[];
  selectedJudgeIdxs: Set<number>;
  issueTextWidth: number;
  generateJudgeLabel: (config: JudgeConfig) => string;
  onBack: () => void;
  onRunJudges: (selectedConfigs: JudgeConfig[], dedupResult: DedupComparison) => void;
  onToggleJudge: (idx: number) => void;
  onSelectStrategy: (strategy: DedupStrategy) => void;
}

const STRATEGY_LABELS: Record<DedupStrategy, string> = {
  exact: "Exact Match",
  jaccard: "Jaccard (word overlap)",
  fuse: "Fuse.js (fuzzy)",
  ufuzzy: "uFuzzy (fuzzy)",
};

/** Export full dedup analysis to a file for validation */
function exportDedupAnalysis(multiDedup: MultiStrategyDedupResult, selectedStrategy: DedupStrategy): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `dedup-analysis-${timestamp}.txt`;
  const filepath = path.join(process.cwd(), filename);

  let output = "=".repeat(80) + "\n";
  output += "DEDUP ANALYSIS EXPORT\n";
  output += `Generated: ${new Date().toISOString()}\n`;
  output += "=".repeat(80) + "\n\n";

  // Summary
  output += "STRATEGY COMPARISON:\n";
  output += "-".repeat(40) + "\n";
  for (const strategy of ["exact", "jaccard", "fuse", "ufuzzy"] as DedupStrategy[]) {
    const dedup = multiDedup[strategy];
    output += `${strategy.padEnd(10)}: ${dedup.unique.length} unique, ${dedup.duplicates.length} duplicates (from ${dedup.originalCount} total)\n`;
  }
  output += "\n";

  // Detailed analysis for each strategy
  for (const strategy of ["exact", "jaccard", "fuse", "ufuzzy"] as DedupStrategy[]) {
    const dedup = multiDedup[strategy];

    output += "=".repeat(80) + "\n";
    output += `STRATEGY: ${STRATEGY_LABELS[strategy].toUpperCase()}\n`;
    output += "=".repeat(80) + "\n\n";

    if (dedup.duplicates.length === 0) {
      output += "No duplicates found.\n\n";
    } else {
      output += `DUPLICATE PAIRS (${dedup.duplicates.length}):\n`;
      output += "-".repeat(40) + "\n\n";

      dedup.duplicates.forEach((match, idx) => {
        output += `${idx + 1}. REMOVED [${match.duplicate.extractorId}]:\n`;
        output += `   "${match.duplicate.exactText}"\n\n`;
        output += `   KEPT [${match.matchedTo.extractorId}] (similarity: ${Math.round(match.similarity * 100)}%):\n`;
        output += `   "${match.matchedTo.exactText}"\n\n`;
        output += "-".repeat(40) + "\n\n";
      });
    }

    output += `UNIQUE ISSUES AFTER DEDUP (${dedup.unique.length}):\n`;
    output += "-".repeat(40) + "\n\n";
    dedup.unique.forEach((issue, idx) => {
      output += `${idx + 1}. [${issue.extractorId}] ${issue.issueType}${issue.fallacyType ? ` (${issue.fallacyType})` : ""}\n`;
      output += `   "${issue.exactText}"\n\n`;
    });
    output += "\n";
  }

  fs.writeFileSync(filepath, output);
  return filepath;
}

export function PreJudgeDedupView({
  height,
  maxItems,
  multiDedup,
  selectedStrategy,
  availableJudges,
  selectedJudgeIdxs,
  generateJudgeLabel,
  onBack,
  onRunJudges,
  onToggleJudge,
}: PreJudgeDedupViewProps) {
  // Use jaccard as the default/only strategy for now
  const currentDedup = multiDedup.jaccard;
  const { unique, duplicates, originalCount } = currentDedup;

  // Build items list
  const items: Array<{ label: string; value: string }> = [];

  // Judge selection
  items.push({ label: "── Select Judges ──", value: "header-judges" });
  if (availableJudges.length > 0) {
    availableJudges.forEach((judge, idx) => {
      const label = generateJudgeLabel(judge);
      const isSelected = selectedJudgeIdxs.has(idx);
      const prefix = isSelected ? "[x]" : "[ ]";
      const thinkStr = judge.thinking ? "think" : "noThink";
      const tempStr =
        judge.temperature === "default"
          ? "tDef"
          : judge.temperature !== undefined
          ? `t${judge.temperature}`
          : "";
      items.push({
        label: `${prefix} ${label} (${tempStr ? tempStr + ", " : ""}${thinkStr})`,
        value: `judge-${idx}`,
      });
    });

    items.push({ label: "────────────────────────────────────────", value: "sep-3" });

    const selectedCount = selectedJudgeIdxs.size;
    const judgeLabel =
      selectedCount === 1
        ? generateJudgeLabel(availableJudges[[...selectedJudgeIdxs][0]])
        : `${selectedCount} judges`;
    items.push({
      label: `⚖️  Run ${judgeLabel} (${unique.length} deduplicated issues)`,
      value: "run-judge",
    });
  } else {
    items.push({
      label: `⚠️  No judges configured. Set FALLACY_JUDGES env var`,
      value: "no-judges",
    });
  }

  items.push({ label: "📄 Export Full Analysis to File", value: "export" });
  items.push({ label: "← Back to Extraction Results", value: "back" });

  // Filter non-selectable items (headers and separators)
  const selectableItems = items.filter(
    (i) =>
      !i.value.startsWith("header-") &&
      !i.value.startsWith("sep-")
  );

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" padding={1} height={height}>
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color="yellow">
          Pre-Judge Deduplication
        </Text>
      </Box>

      {/* Dedup summary */}
      <Box borderStyle="single" borderColor="cyan" marginBottom={1} paddingX={1} flexDirection="column">
        <Text>
          <Text bold>Deduplication: </Text>
          <Text>{originalCount} issues → </Text>
          <Text bold color="green">{unique.length} unique</Text>
          {duplicates.length > 0 && (
            <Text color="red"> ({duplicates.length} duplicates removed)</Text>
          )}
        </Text>
        <Text dimColor>
          Using Jaccard word-overlap similarity. Quality-based selection keeps longer/higher-scored issues.
        </Text>
      </Box>

      <SelectInput
        items={selectableItems}
        limit={maxItems - 10}
        onSelect={(item) => {
          if (item.value === "back") {
            onBack();
          } else if (item.value === "export") {
            const filepath = exportDedupAnalysis(multiDedup, selectedStrategy);
            console.error(`\n📄 Exported full analysis to: ${filepath}\n`);
          } else if (item.value === "run-judge") {
            const selectedConfigs = [...selectedJudgeIdxs].map((idx) => availableJudges[idx]);
            onRunJudges(selectedConfigs, currentDedup);
          } else if (item.value.startsWith("judge-")) {
            const idx = parseInt(item.value.replace("judge-", ""), 10);
            onToggleJudge(idx);
          }
        }}
      />

      <Box marginTop={1} justifyContent="center">
        <Text dimColor>Enter=Select | Escape=Back</Text>
      </Box>
    </Box>
  );
}
