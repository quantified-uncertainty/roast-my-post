import React from "react";
import { Box, Text } from "ink";

interface ErrorViewProps {
  error: string;
  height: number;
}

export function ErrorView({ error, height }: ErrorViewProps) {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="red" padding={1} height={height}>
      <Text color="red">Error: {error}</Text>
      <Text dimColor>Press Escape to go back</Text>
    </Box>
  );
}
