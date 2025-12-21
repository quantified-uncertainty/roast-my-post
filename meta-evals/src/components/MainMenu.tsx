/**
 * Main Menu Screen Component
 */

import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import type { SeriesSummary } from "./types";
import { truncate } from "./helpers";

interface ModelInfo {
  id: string;
  displayName: string;
}

interface MainMenuProps {
  series: SeriesSummary[];
  maxItems: number;
  height: number;
  onCreateBaseline: () => void;
  onSelectSeries: (id: string) => void;
  onExit: () => void;
  judgeModel: string;
  availableModels: ModelInfo[];
  onSelectModel: (modelId: string) => void;
}

export function MainMenu({
  series,
  maxItems,
  height,
  onCreateBaseline,
  onSelectSeries,
  onExit,
  judgeModel,
  availableModels,
  onSelectModel,
}: MainMenuProps) {
  const [activeTab, setActiveTab] = useState<"series" | "settings">("series");

  // Handle tab switching
  useInput((input, key) => {
    if (key.tab) {
      setActiveTab((prev) => (prev === "series" ? "settings" : "series"));
    }
  });

  // Get display name for current model
  const currentModelName = availableModels.find((m) => m.id === judgeModel)?.displayName || judgeModel;

  // Render tabs header
  const renderTabs = () => (
    <Box marginBottom={1}>
      <Text
        bold={activeTab === "series"}
        color={activeTab === "series" ? "cyan" : "gray"}
      >
        [Series]
      </Text>
      <Text> </Text>
      <Text
        bold={activeTab === "settings"}
        color={activeTab === "settings" ? "yellow" : "gray"}
      >
        [Settings]
      </Text>
      <Text dimColor>  (Tab to switch)</Text>
    </Box>
  );

  // Settings tab
  if (activeTab === "settings") {
    const modelItems = [
      ...availableModels.map((m) => ({
        label: `${m.id === judgeModel ? "●" : "○"} ${m.displayName}`,
        value: m.id,
      })),
      { label: "<- Back to Series", value: "back" },
    ];

    return (
      <Box flexDirection="column" borderStyle="round" borderColor="yellow" padding={1} height={height} overflow="hidden">
        <Box justifyContent="center" marginBottom={1}>
          <Text bold color="yellow">
            Settings
          </Text>
        </Box>

        {renderTabs()}

        <Box borderStyle="single" borderColor="gray" marginBottom={1} paddingX={1}>
          <Text>
            <Text bold>Judge Model: </Text>
            <Text color="green">{currentModelName}</Text>
          </Text>
        </Box>

        <Box paddingX={1} marginBottom={1}>
          <Text dimColor>Select model for scoring/ranking:</Text>
        </Box>

        <SelectInput
          items={modelItems}
          onSelect={(item) => {
            if (item.value === "back") {
              setActiveTab("series");
            } else {
              onSelectModel(item.value);
            }
          }}
        />

        <Box marginTop={1} justifyContent="center">
          <Text dimColor>Tab Switch | Up/Down Navigate | Enter Select | q Quit</Text>
        </Box>
      </Box>
    );
  }

  // Series tab (default)
  // Limit series shown, reserve 2 slots for create/exit
  const visibleSeries = series.slice(0, maxItems - 2);
  const items = [
    ...visibleSeries.map((s) => ({
      label: `${truncate(s.documentTitle, 40)} | ${s.runCount} runs | ${s.agentNames.slice(0, 2).join(", ")}`,
      value: s.id,
    })),
    { label: "+ Create New Baseline", value: "create" },
    { label: "Exit", value: "exit" },
  ];

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1} height={height} overflow="hidden">
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color="cyan">
          Meta-Evaluation Tool
        </Text>
      </Box>

      {renderTabs()}

      <Box borderStyle="single" borderColor="gray" marginBottom={1} paddingX={1}>
        <Box flexDirection="column">
          <Text>
            {series.length === 0
              ? "No evaluation series yet. Create a baseline to get started."
              : visibleSeries.length < series.length
                ? `Showing ${visibleSeries.length} of ${series.length} series`
                : `${series.length} series available`}
          </Text>
          <Text dimColor>
            Judge: <Text color="green">{currentModelName}</Text>
          </Text>
        </Box>
      </Box>

      <SelectInput
        items={items}
        limit={maxItems}
        onSelect={(item) => {
          if (item.value === "exit") onExit();
          else if (item.value === "create") onCreateBaseline();
          else onSelectSeries(item.value);
        }}
      />

      <Box marginTop={1} justifyContent="center">
        <Text dimColor>Tab Switch | Up/Down Navigate | Enter Select | q Quit</Text>
      </Box>
    </Box>
  );
}
