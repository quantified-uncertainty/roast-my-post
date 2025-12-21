/**
 * Main Menu Screen Component
 */

import React from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import type { SeriesSummary } from "./types";
import { truncate } from "./helpers";

interface MainMenuProps {
  series: SeriesSummary[];
  maxItems: number;
  height: number;
  onCreateBaseline: () => void;
  onSelectSeries: (id: string) => void;
  onExit: () => void;
}

export function MainMenu({
  series,
  maxItems,
  height,
  onCreateBaseline,
  onSelectSeries,
  onExit,
}: MainMenuProps) {
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

      <Box borderStyle="single" borderColor="gray" marginBottom={1} paddingX={1}>
        <Text>
          {series.length === 0
            ? "No evaluation series yet. Create a baseline to get started."
            : visibleSeries.length < series.length
              ? `Showing ${visibleSeries.length} of ${series.length} series`
              : `${series.length} series available`}
        </Text>
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
        <Text dimColor>Up/Down Navigate | Enter Select | q Quit</Text>
      </Box>
    </Box>
  );
}
