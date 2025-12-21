/**
 * Series Detail Screen Component
 */

import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import Spinner from "ink-spinner";
import { metaEvaluationRepository } from "@roast/db";
import { truncate, formatDate, formatStatus, getStatusColor } from "./helpers";

interface SeriesRun {
  jobId: string;
  agentName: string;
  status: string;
  createdAt: Date;
}

interface SeriesDetailData {
  id: string;
  name: string;
  documentTitle: string;
  runs: SeriesRun[];
}

interface SeriesDetailProps {
  seriesId: string;
  maxItems: number;
  height: number;
  onBack: () => void;
}

// Column widths for consistent alignment
const COL_NUM = 3;
const COL_AGENT = 25;
const COL_STATUS = 12;
const COL_DATE = 8;

export function SeriesDetail({
  seriesId,
  maxItems,
  height,
  onBack,
}: SeriesDetailProps) {
  const [loading, setLoading] = useState(true);
  const [series, setSeries] = useState<SeriesDetailData | null>(null);

  // Load and poll for updates
  useEffect(() => {
    let mounted = true;
    let pollInterval: NodeJS.Timeout | null = null;

    async function loadSeries() {
      try {
        const data = await metaEvaluationRepository.getSeriesDetail(seriesId);
        if (mounted) {
          setSeries(data as SeriesDetailData);
          setLoading(false);

          // Check if any runs are still in progress
          const hasRunning = data?.runs.some(
            (r: SeriesRun) => r.status === "RUNNING" || r.status === "PENDING"
          );

          // Poll every 2 seconds if there are running jobs
          if (hasRunning && !pollInterval) {
            pollInterval = setInterval(loadSeries, 2000);
          } else if (!hasRunning && pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
          }
        }
      } catch (error) {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadSeries();

    return () => {
      mounted = false;
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [seriesId]);

  if (loading) {
    return (
      <Box padding={1}>
        <Text>
          <Spinner type="dots" /> Loading series...
        </Text>
      </Box>
    );
  }

  if (!series) {
    return (
      <Box padding={1}>
        <Text color="red">Series not found</Text>
      </Box>
    );
  }

  // Check if any jobs are still running for the indicator
  const hasRunning = series.runs.some(
    (r) => r.status === "RUNNING" || r.status === "PENDING"
  );

  const maxRuns = maxItems - 8;

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="green" padding={1} height={height} overflow="hidden">
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color="green">
          Series: {truncate(series.documentTitle, 40)}
        </Text>
        {hasRunning && (
          <Text color="yellow">
            {" "}<Spinner type="dots" />
          </Text>
        )}
      </Box>

      <Box flexDirection="column" borderStyle="single" borderColor="gray" marginBottom={1} paddingX={1}>
        {/* Header row */}
        <Box>
          <Text bold color="gray">
            {"#".padEnd(COL_NUM)}
            {"Agent".padEnd(COL_AGENT)}
            {"Status".padEnd(COL_STATUS)}
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
          { label: "Refresh", value: "refresh" },
          { label: "Run Again", value: "run" },
          { label: "Compare Runs", value: "compare" },
          { label: "<- Back", value: "back" },
        ]}
        onSelect={(item) => {
          if (item.value === "back") onBack();
          // TODO: Handle run, compare, refresh
        }}
      />

      <Box marginTop={1} justifyContent="center">
        <Text dimColor>
          {hasRunning ? "Auto-refreshing... | " : ""}Esc Back | q Quit
        </Text>
      </Box>
    </Box>
  );
}
