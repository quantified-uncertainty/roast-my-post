import React from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import type { JudgeConfig, PreJudgeDedupResult } from "../types";

interface RunningJudgeViewProps {
  height: number;
  judgeConfigs: JudgeConfig[];
  dedupResult: PreJudgeDedupResult;
  generateJudgeLabel: (config: JudgeConfig) => string;
}

export function RunningJudgeView({ height, judgeConfigs, dedupResult, generateJudgeLabel }: RunningJudgeViewProps) {
  const judgeLabels = judgeConfigs.map(c => generateJudgeLabel(c)).join(", ");

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" padding={1} height={height}>
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color="yellow">Running LLM Judge</Text>
      </Box>

      <Box justifyContent="center" padding={2}>
        <Text>
          <Spinner type="dots" /> Running {judgeConfigs.length} judge(s): {judgeLabels}
        </Text>
      </Box>

      <Box justifyContent="center">
        <Text dimColor>
          Aggregating {dedupResult.unique.length} unique issues (from {dedupResult.originalCount} total)...
        </Text>
      </Box>
    </Box>
  );
}
