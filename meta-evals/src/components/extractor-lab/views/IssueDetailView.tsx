import React from "react";
import { Box, Text } from "ink";
import type { MultiExtractorResult } from "../types";

interface IssueDetailViewProps {
  height: number;
  result: MultiExtractorResult;
  extractorIdx: number;
  issueIdx: number;
}

export function IssueDetailView({ height, result, extractorIdx, issueIdx }: IssueDetailViewProps) {
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
