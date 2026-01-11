/**
 * Score/Rank Menu Screen
 *
 * Shows series list for scoring and ranking agent outputs.
 */

import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import type { SeriesSummary } from "./types";
import { truncate } from "./helpers";
import { ScreenContainer, InfoBox } from "./shared";

interface ScoreRankMenuProps {
  series: SeriesSummary[];
  maxItems: number;
  height: number;
  judgeModel: string;
  onCreateSeries: () => void;
  onSelectSeries: (id: string) => void;
  onDeleteSeries: (id: string) => Promise<void>;
  onBack: () => void;
}

export function ScoreRankMenu({
  series,
  maxItems,
  height,
  judgeModel,
  onCreateSeries,
  onSelectSeries,
  onDeleteSeries,
  onBack,
}: ScoreRankMenuProps) {
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Limit series shown, reserve slots for actions
  const visibleSeries = series.slice(0, maxItems - 3);

  // Handle keyboard input
  useInput((input, key) => {
    if (key.escape) {
      if (confirmDelete) {
        setConfirmDelete(null);
      } else {
        onBack();
      }
    }

    // Delete with 'd' key
    if (input === "d" && !confirmDelete && !isDeleting) {
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

    // Cancel delete with 'n'
    if (confirmDelete && input === "n") {
      setConfirmDelete(null);
    }
  });

  // Find series being deleted for confirmation message
  const deletingSeries = confirmDelete ? visibleSeries.find((s) => s.id === confirmDelete) : null;

  // Delete confirmation modal
  if (confirmDelete && deletingSeries) {
    return (
      <ScreenContainer title="Score/Rank - Confirm Delete" borderColor="red" height={height}>
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
                Confirm Delete
              </Text>
            </Box>
            <Box marginBottom={1} justifyContent="center">
              <Text>Delete this series?</Text>
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
                <Text color="yellow">Deleting...</Text>
              ) : (
                <Box gap={3}>
                  <Text backgroundColor="red" color="white" bold> Y - Delete </Text>
                  <Text backgroundColor="gray" color="white"> N - Cancel </Text>
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </ScreenContainer>
    );
  }

  // Build menu items
  const items = [
    ...visibleSeries
      .filter((s) => s.id)
      .map((s, idx) => ({
        label: `${truncate(s.documentTitle, 40)} | ${s.runCount} runs | ${s.agentNames.slice(0, 2).join(", ")}`,
        value: s.id || `series-${idx}`,
      })),
    { label: "+ Create New Series", value: "create" },
    { label: "<- Back to Main Menu", value: "back" },
  ];

  return (
    <ScreenContainer title="Score/Rank - Series List" borderColor="cyan" height={height}>
      <InfoBox>
        <Text>
          {series.length === 0
            ? "No series yet. Create one to score/rank agent outputs."
            : `${series.length} series | Judge: `}
          {series.length > 0 && <Text color="green">{judgeModel}</Text>}
        </Text>
      </InfoBox>

      <SelectInput
        items={items}
        limit={maxItems}
        onHighlight={(item) => {
          const idx = visibleSeries.findIndex((s) => s.id === item.value);
          if (idx >= 0) setHighlightedIndex(idx);
        }}
        onSelect={(item) => {
          if (item.value === "back") onBack();
          else if (item.value === "create") onCreateSeries();
          else onSelectSeries(item.value);
        }}
      />

      <Box marginTop={1}>
        <Text dimColor>Enter Select | d Delete | Escape Back</Text>
      </Box>
    </ScreenContainer>
  );
}
