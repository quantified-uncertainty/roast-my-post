import React from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";

interface RunningViewProps {
  height: number;
  extractorCount: number;
}

export function RunningView({ height, extractorCount }: RunningViewProps) {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" padding={1} height={height}>
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color="yellow">Extractor Lab - Running</Text>
      </Box>

      <Box justifyContent="center" padding={2}>
        <Text>
          <Spinner type="dots" /> Running {extractorCount} extractor(s)...
        </Text>
      </Box>

      <Box justifyContent="center">
        <Text dimColor>This may take a minute...</Text>
      </Box>
    </Box>
  );
}
