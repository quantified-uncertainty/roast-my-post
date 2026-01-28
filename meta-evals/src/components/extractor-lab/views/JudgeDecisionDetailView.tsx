import React from "react";
import { Box, Text } from "ink";
import type { JudgeDecision } from "../types";

interface JudgeDecisionDetailViewProps {
  height: number;
  decision: JudgeDecision;
  isRejected: boolean;
}

export function JudgeDecisionDetailView({ height, decision, isRejected }: JudgeDecisionDetailViewProps) {
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
