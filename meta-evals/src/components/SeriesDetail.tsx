/**
 * Series Detail Screen Component
 */

import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import { metaEvaluationRepository } from "@roast/db";
import { truncate, formatDate, formatStatus, getStatusColor } from "./helpers";
import { LoadingSpinner, ScreenContainer, scoreColor } from "./shared";

interface SeriesRun {
  jobId: string;
  agentName: string;
  status: string;
  createdAt: Date;
  scoring: { overallScore: number; scoredAt: Date } | null;
}

interface SeriesDetailData {
  id: string;
  name: string;
  documentId: string;
  documentTitle: string;
  runs: SeriesRun[];
}

interface SeriesDetailProps {
  seriesId: string;
  maxItems: number;
  height: number;
  onBack: () => void;
  onRunAgain: (seriesId: string, documentId: string) => Promise<void>;
  onClearFailed: (seriesId: string) => Promise<number>;
  onRank: (seriesId: string) => void;
  onScore: (seriesId: string) => void;
}

// Column widths for consistent alignment
const COL_NUM = 3;
const COL_AGENT = 22;
const COL_STATUS = 10;
const COL_SCORE = 6;
const COL_DATE = 8;

export function SeriesDetail({
  seriesId,
  maxItems,
  height,
  onBack,
  onRunAgain,
  onClearFailed,
  onRank,
  onScore,
}: SeriesDetailProps) {
  const [loading, setLoading] = useState(true);
  const [runningAgain, setRunningAgain] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [series, setSeries] = useState<SeriesDetailData | null>(null);

  // Load and poll for updates - always poll every 2 seconds
  useEffect(() => {
    let mounted = true;

    async function loadSeries() {
      try {
        const data = await metaEvaluationRepository.getSeriesDetail(seriesId);
        if (mounted) {
          setSeries(data as SeriesDetailData);
          setLoading(false);
        }
      } catch (error) {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadSeries();
    const pollInterval = setInterval(loadSeries, 2000);

    return () => {
      mounted = false;
      clearInterval(pollInterval);
    };
  }, [seriesId]);

  if (loading) {
    return <LoadingSpinner message="Loading series..." />;
  }

  if (!series) {
    return (
      <Box padding={1}>
        <Text color="red">Series not found</Text>
      </Box>
    );
  }

  const maxRuns = maxItems - 8;

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="green" padding={1} height={height} overflow="hidden">
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color="green">
          Series: {truncate(series.documentTitle, 40)}
        </Text>
      </Box>

      <Box flexDirection="column" borderStyle="single" borderColor="gray" marginBottom={1} paddingX={1}>
        {/* Header row */}
        <Box>
          <Text bold color="gray">
            {"#".padEnd(COL_NUM)}
            {"Agent".padEnd(COL_AGENT)}
            {"Status".padEnd(COL_STATUS)}
            {"Score".padEnd(COL_SCORE)}
            {"Created".padEnd(COL_DATE)}
          </Text>
        </Box>
        {/* Data rows */}
        {series.runs.slice(0, maxRuns).map((r, i) => (
          <Box key={r.jobId}>
            <Text>
              {String(i + 1).padEnd(COL_NUM)}
            </Text>
            <Text>
              {truncate(r.agentName, COL_AGENT - 1).padEnd(COL_AGENT)}
            </Text>
            <Text color={getStatusColor(r.status)}>
              {formatStatus(r.status).padEnd(COL_STATUS)}
            </Text>
            <Text color={r.scoring ? scoreColor(r.scoring.overallScore) : "gray"}>
              {(r.scoring ? `${r.scoring.overallScore}/10` : "-").padEnd(COL_SCORE)}
            </Text>
            <Text dimColor>
              {formatDate(r.createdAt)}
            </Text>
          </Box>
        ))}
        {series.runs.length > maxRuns && (
          <Text dimColor>... and {series.runs.length - maxRuns} more</Text>
        )}
      </Box>

      <SelectInput
        items={[
          { label: runningAgain ? "Creating new run..." : "Run Again", value: "run" },
          { label: "Rank Runs", value: "rank" },
          { label: "Score Run", value: "score" },
          ...(series.runs.some((r) => r.status === "FAILED")
            ? [{ label: clearing ? "Clearing..." : "Clear Failed", value: "clear" }]
            : []),
          { label: "<- Back", value: "back" },
        ]}
        onSelect={async (item) => {
          if (item.value === "back") onBack();
          else if (item.value === "run" && !runningAgain && series) {
            setRunningAgain(true);
            try {
              await onRunAgain(series.id, series.documentId);
            } finally {
              setRunningAgain(false);
            }
          } else if (item.value === "clear" && !clearing && series) {
            setClearing(true);
            try {
              await onClearFailed(series.id);
            } finally {
              setClearing(false);
            }
          } else if (item.value === "rank" && series) {
            onRank(series.id);
          } else if (item.value === "score" && series) {
            onScore(series.id);
          }
        }}
      />

      <Box marginTop={1} justifyContent="center">
        <Text dimColor>Esc Back | q Quit</Text>
      </Box>
    </Box>
  );
}
