import React from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import type { ExtractorConfig, DocumentChoice } from "../types";

interface ConfigureExtractorsViewProps {
  height: number;
  selectedDoc: DocumentChoice | null;
  documentText: string;
  extractorConfigs: ExtractorConfig[];
  onHighlight: (value: string) => void;
  onBack: () => void;
  onRun: () => void;
  onAdd: () => void;
  onToggleThinking: (idx: number) => void;
}

export function ConfigureExtractorsView({
  height,
  selectedDoc,
  documentText,
  extractorConfigs,
  onHighlight,
  onBack,
  onRun,
  onAdd,
  onToggleThinking,
}: ConfigureExtractorsViewProps) {
  const items = [
    { label: "▶ Run Extraction", value: "run" },
    { label: "─────────────────", value: "divider" },
    ...extractorConfigs.map((config, idx) => ({
      label: `[${idx + 1}] ${config.model} (t=${config.temperature}, think=${config.thinking})`,
      value: `config-${idx}`,
    })),
    { label: "+ Add Extractor", value: "add" },
    { label: "─────────────────", value: "divider2" },
    { label: "← Back to Documents", value: "back" },
  ];

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="magenta" padding={1} height={height}>
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color="magenta">Extractor Lab - Configure</Text>
      </Box>

      <Box borderStyle="single" borderColor="gray" marginBottom={1} paddingX={1}>
        <Box flexDirection="column">
          <Text>
            <Text bold>Document: </Text>
            <Text color="green">{selectedDoc?.title}</Text>
          </Text>
          <Text>
            <Text bold>Text length: </Text>
            <Text>{documentText.length} chars</Text>
          </Text>
          <Text>
            <Text bold>Extractors: </Text>
            <Text>{extractorConfigs.length}</Text>
          </Text>
        </Box>
      </Box>

      <SelectInput
        items={items.filter(i => !i.value.startsWith("divider"))}
        onHighlight={(item) => onHighlight(item.value)}
        onSelect={(item) => {
          if (item.value === "back") {
            onBack();
          } else if (item.value === "run") {
            onRun();
          } else if (item.value === "add") {
            onAdd();
          } else if (item.value.startsWith("config-")) {
            const idx = parseInt(item.value.replace("config-", ""), 10);
            onToggleThinking(idx);
          }
        }}
      />

      <Box marginTop={1} justifyContent="center">
        <Text dimColor>Enter=toggle think | t=cycle temp | d=delete | Esc=back</Text>
      </Box>
    </Box>
  );
}
