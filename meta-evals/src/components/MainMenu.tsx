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
  onDeleteSeries: (id: string) => Promise<void>;
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
  series,
  maxItems,
  height,
  onCreateBaseline,
  onSelectSeries,
  onDeleteSeries,
  onExit,
  judgeModel,
  availableModels,
  onSelectModel,
  temperature,
  onSetTemperature,
  maxTokens,
  onSetMaxTokens,
}: MainMenuProps) {
  const [activeTab, setActiveTab] = useState<"series" | "settings">("series");
  const [settingsSection, setSettingsSection] = useState<"model" | "temperature" | "maxTokens">("model");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Limit series shown, reserve 2 slots for create/exit
  const visibleSeries = series.slice(0, maxItems - 2);

  // Handle keyboard input
  useInput((input, key) => {
    if (key.tab) {
      setActiveTab((prev) => (prev === "series" ? "settings" : "series"));
      setConfirmDelete(null);
    }

    // Delete with 'd' key (only in series tab)
    if (activeTab === "series" && input === "d" && !confirmDelete && !isDeleting) {
      const selectedSeries = visibleSeries[highlightedIndex];
      if (selectedSeries) {
        setConfirmDelete(selectedSeries.id);
      }
    }

    // Confirm delete with 'y'
    if (confirmDelete && input === "y" && !isDeleting) {
      setIsDeleting(true);
      onDeleteSeries(confirmDelete).finally(() => {
        setConfirmDelete(null);
        setIsDeleting(false);
      });
    }

    // Cancel delete with 'n' or Escape
    if (confirmDelete && (input === "n" || key.escape)) {
      setConfirmDelete(null);
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
    // Build items based on current section
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
        { label: "<- Back to Series", value: "back" },
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

        {renderTabs()}

        <Box borderStyle="single" borderColor="gray" marginBottom={1} paddingX={1}>
          <Box flexDirection="column">
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
              setActiveTab("series");
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
          <Text dimColor>Tab Switch | Up/Down Navigate | Enter Select | q Quit</Text>
        </Box>
      </Box>
    );
  }

  // Series tab (default)
  const items = [
    ...visibleSeries
      .filter((s) => s.id) // Ensure valid IDs
      .map((s, idx) => ({
        label: `${truncate(s.documentTitle, 40)} | ${s.runCount} runs | ${s.agentNames.slice(0, 2).join(", ")}`,
        value: s.id || `series-${idx}`, // Fallback key
      })),
    { label: "+ Create New Baseline", value: "create" },
    { label: "Exit", value: "exit" },
  ];

  // Find series being deleted for confirmation message
  const deletingSeries = confirmDelete ? visibleSeries.find((s) => s.id === confirmDelete) : null;

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1} height={height} overflow="hidden">
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color="cyan">
          Meta-Evaluation Tool
        </Text>
      </Box>

      {renderTabs()}

      {/* Delete confirmation modal - replaces content when active */}
      {confirmDelete && deletingSeries ? (
        <Box
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          flexGrow={1}
        >
          <Box
            flexDirection="column"
            borderStyle="double"
            borderColor="red"
            paddingX={4}
            paddingY={1}
          >
            <Box justifyContent="center" marginBottom={1}>
              <Text bold color="red">
                ⚠  Confirm Delete  ⚠
              </Text>
            </Box>
            <Box marginBottom={1} justifyContent="center">
              <Text>
                Are you sure you want to delete this series?
              </Text>
            </Box>
            <Box marginBottom={1} justifyContent="center">
              <Text color="yellow">"{truncate(deletingSeries.documentTitle, 45)}"</Text>
            </Box>
            <Box marginBottom={1} justifyContent="center">
              <Text dimColor>
                {deletingSeries.runCount} run{deletingSeries.runCount !== 1 ? "s" : ""} will be removed.
              </Text>
            </Box>
            <Box justifyContent="center" marginTop={1}>
              {isDeleting ? (
                <Text color="yellow">  Deleting...  </Text>
              ) : (
                <Box gap={3}>
                  <Text backgroundColor="red" color="white" bold> Y - Delete </Text>
                  <Text backgroundColor="gray" color="white"> N - Cancel </Text>
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      ) : (
        <>
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
                {" "}| Temp: <Text color="green">{temperature}</Text>
                {" "}| Tokens: <Text color="green">{maxTokens}</Text>
              </Text>
            </Box>
          </Box>

          <SelectInput
            items={items}
            limit={maxItems}
            onHighlight={(item) => {
              const idx = visibleSeries.findIndex((s) => s.id === item.value);
              if (idx >= 0) setHighlightedIndex(idx);
            }}
            onSelect={(item) => {
              if (confirmDelete) return; // Ignore selection during delete confirmation
              if (item.value === "exit") onExit();
              else if (item.value === "create") onCreateBaseline();
              else onSelectSeries(item.value);
            }}
          />
        </>
      )}

      <Box marginTop={1} justifyContent="center">
        <Text dimColor>
          {confirmDelete ? "Y Delete | N Cancel" : "Tab Switch | d Delete | Enter Select | q Quit"}
        </Text>
      </Box>
    </Box>
  );
}
