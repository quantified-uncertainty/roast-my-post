/**
 * Main Menu Screen Component - Clean Router
 */

import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";

interface ModelInfo {
  id: string;
  displayName: string;
}

interface MainMenuProps {
  height: number;
  onScoreRank: () => void;
  onValidation: () => void;
  onExtractorLab: () => void;
  onExit: () => void;
  judgeModel: string;
  availableModels: ModelInfo[];
  onSelectModel: (modelId: string) => void;
  temperature: number;
  onSetTemperature: (t: number) => void;
  maxTokens: number;
  onSetMaxTokens: (t: number) => void;
}

const TEMPERATURE_OPTIONS = [0, 0.3, 0.5, 0.7, 1.0, 1.5, 2.0];
const MAX_TOKENS_OPTIONS = [2048, 4096, 8192, 16384, 32768];

export function MainMenu({
  height,
  onScoreRank,
  onValidation,
  onExtractorLab,
  onExit,
  judgeModel,
  availableModels,
  onSelectModel,
  temperature,
  onSetTemperature,
  maxTokens,
  onSetMaxTokens,
}: MainMenuProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [settingsSection, setSettingsSection] = useState<"model" | "temperature" | "maxTokens">("model");

  // Handle keyboard input
  useInput((input, key) => {
    if (key.escape && showSettings) {
      setShowSettings(false);
    }
  });

  // Get display name for current model
  const currentModelName = availableModels.find((m) => m.id === judgeModel)?.displayName || judgeModel;

  // Settings panel
  if (showSettings) {
    let settingsItems: { label: string; value: string }[] = [];
    let sectionTitle = "";

    if (settingsSection === "model") {
      sectionTitle = "Judge Model";
      settingsItems = [
        ...availableModels.map((m) => ({
          label: `${m.id === judgeModel ? "●" : "○"} ${m.displayName}`,
          value: `model:${m.id}`,
        })),
        { label: "-> Temperature", value: "goto:temperature" },
        { label: "-> Max Tokens", value: "goto:maxTokens" },
        { label: "<- Back", value: "back" },
      ];
    } else if (settingsSection === "temperature") {
      sectionTitle = "Temperature";
      settingsItems = [
        ...TEMPERATURE_OPTIONS.map((t) => ({
          label: `${t === temperature ? "●" : "○"} ${t}${t === 0 ? " (deterministic)" : t === 1 ? " (creative)" : ""}`,
          value: `temp:${t}`,
        })),
        { label: "<- Back to Model", value: "goto:model" },
      ];
    } else if (settingsSection === "maxTokens") {
      sectionTitle = "Max Tokens";
      settingsItems = [
        ...MAX_TOKENS_OPTIONS.map((t) => ({
          label: `${t === maxTokens ? "●" : "○"} ${t}`,
          value: `tokens:${t}`,
        })),
        { label: "<- Back to Model", value: "goto:model" },
      ];
    }

    return (
      <Box flexDirection="column" borderStyle="round" borderColor="yellow" padding={1} height={height} overflow="hidden">
        <Box justifyContent="center" marginBottom={1}>
          <Text bold color="yellow">
            Settings: {sectionTitle}
          </Text>
        </Box>

        <Box borderStyle="single" borderColor="gray" marginBottom={1} paddingX={1}>
          <Box flexDirection="column">
            <Text dimColor>For Score/Rank AI judge:</Text>
            <Text>
              <Text bold>Model: </Text>
              <Text color="green">{currentModelName}</Text>
            </Text>
            <Text>
              <Text bold>Temp: </Text>
              <Text color="green">{temperature}</Text>
              <Text>  </Text>
              <Text bold>Max Tokens: </Text>
              <Text color="green">{maxTokens}</Text>
            </Text>
          </Box>
        </Box>

        <SelectInput
          items={settingsItems}
          onSelect={(item) => {
            if (item.value === "back") {
              setShowSettings(false);
            } else if (item.value.startsWith("goto:")) {
              setSettingsSection(item.value.replace("goto:", "") as "model" | "temperature" | "maxTokens");
            } else if (item.value.startsWith("model:")) {
              onSelectModel(item.value.replace("model:", ""));
            } else if (item.value.startsWith("temp:")) {
              onSetTemperature(parseFloat(item.value.replace("temp:", "")));
            } else if (item.value.startsWith("tokens:")) {
              onSetMaxTokens(parseInt(item.value.replace("tokens:", ""), 10));
            }
          }}
        />

        <Box marginTop={1} justifyContent="center">
          <Text dimColor>Up/Down Navigate | Enter Select | Escape Back</Text>
        </Box>
      </Box>
    );
  }

  // Main menu items
  const items = [
    { label: "Score/Rank", value: "score-rank" },
    { label: "Validation", value: "validation" },
    { label: "Extractor Lab", value: "extractor-lab" },
    { label: "Settings", value: "settings" },
    { label: "Exit", value: "exit" },
  ];

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1} height={height} overflow="hidden">
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color="cyan">
          Meta-Evaluation Tool
        </Text>
      </Box>

      <Box borderStyle="single" borderColor="gray" marginBottom={1} paddingX={1}>
        <Box flexDirection="column">
          <Text>Compare and evaluate agent outputs</Text>
          <Text dimColor>
            Judge: <Text color="green">{currentModelName}</Text>
          </Text>
        </Box>
      </Box>

      <SelectInput
        items={items}
        onSelect={(item) => {
          if (item.value === "exit") onExit();
          else if (item.value === "score-rank") onScoreRank();
          else if (item.value === "validation") onValidation();
          else if (item.value === "extractor-lab") onExtractorLab();
          else if (item.value === "settings") setShowSettings(true);
        }}
      />

      <Box marginTop={1} justifyContent="center">
        <Text dimColor>Up/Down Navigate | Enter Select | q Quit</Text>
      </Box>
    </Box>
  );
}
