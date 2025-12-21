/**
 * Main Ink App for Meta-Evaluation CLI
 */

import React, { useState, useEffect } from "react";
import { Box, Text, useApp, useInput, useStdout } from "ink";
import Spinner from "ink-spinner";
import {
  metaEvaluationRepository,
  type SeriesSummary,
  type DocumentChoice,
  type AgentChoice,
} from "@roast/db";
import { apiClient } from "./utils/apiClient";
import { MainMenu, CreateBaseline, SeriesDetail, type Screen } from "./components";

// ============================================================================
// Baseline Creation
// ============================================================================

interface BatchCreateResponse {
  batch: {
    id: string;
    trackingId: string;
    jobCount: number;
  };
}

async function createBaselineRun(
  document: DocumentChoice,
  agents: AgentChoice[]
): Promise<string> {
  // 1. Create series in database
  const series = await metaEvaluationRepository.createSeries({
    documentId: document.id,
    name: `Baseline: ${document.title.slice(0, 50)}`,
  });

  // 2. For each agent, create a batch (which creates jobs)
  for (const agent of agents) {
    const response = await apiClient.post<BatchCreateResponse>("/api/batches", {
      agentId: agent.id,
      documentIds: [document.id],
      name: `Series ${series.id} - ${agent.name}`,
    });

    // 3. Query for the job that was just created
    // The batch creates one job per document, so we need to find it
    if (response.batch.jobCount > 0) {
      // Get jobs from this batch
      const jobs = await getJobsForBatch(response.batch.id);
      for (const jobId of jobs) {
        await metaEvaluationRepository.addJobToSeries(series.id, jobId);
      }
    }
  }

  return series.id;
}

async function getJobsForBatch(batchId: string): Promise<string[]> {
  // Query the database for jobs in this batch
  const { prisma } = await import("@roast/db");
  const jobs = await prisma.job.findMany({
    where: { agentEvalBatchId: batchId },
    select: { id: true },
  });
  return jobs.map(j => j.id);
}

// ============================================================================
// Main App
// ============================================================================

export function App() {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [screen, setScreen] = useState<Screen>({ type: "loading" });
  const [error, setError] = useState<string | null>(null);

  // Terminal dimensions - subtract 1 for terminal prompt line
  const termHeight = Math.max(10, (stdout?.rows ?? 24) - 1);
  const termWidth = stdout?.columns ?? 80;
  // Reserve lines for header, footer, borders (border=2, padding=2, header=2, footer=2, info=3)
  const maxListItems = Math.max(5, termHeight - 11);

  // Data for create baseline flow
  const [documents, setDocuments] = useState<DocumentChoice[]>([]);
  const [agents, setAgents] = useState<AgentChoice[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentChoice | null>(null);
  const [selectedAgents, setSelectedAgents] = useState<AgentChoice[]>([]);

  // Load initial data
  useEffect(() => {
    loadMainMenu();
  }, []);

  async function loadMainMenu() {
    setScreen({ type: "loading" });
    try {
      const series = await metaEvaluationRepository.getSeries();
      setScreen({ type: "main-menu", series });
    } catch (e) {
      setError(String(e));
    }
  }

  async function startCreateBaseline() {
    setScreen({ type: "loading" });
    try {
      const userId = await apiClient.getUserId();
      const [docs, ags] = await Promise.all([
        metaEvaluationRepository.getRecentDocuments(),
        metaEvaluationRepository.getAvailableAgents(userId),
      ]);
      setDocuments(docs);
      setAgents(ags);
      setSelectedDoc(null);
      setSelectedAgents([]);
      setScreen({ type: "create-baseline", step: "document" });
    } catch (e) {
      setError(String(e));
    }
  }

  // Handle keyboard shortcuts
  useInput((input, key) => {
    if (input === "q" || (key.ctrl && input === "c")) {
      exit();
    }
    if (key.escape) {
      if (screen.type !== "main-menu") {
        loadMainMenu();
      }
    }
  });

  if (error) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="red">Error: {error}</Text>
        <Text dimColor>Press q to exit</Text>
      </Box>
    );
  }

  if (screen.type === "loading") {
    return (
      <Box padding={1}>
        <Text>
          <Spinner type="dots" /> Loading...
        </Text>
      </Box>
    );
  }

  if (screen.type === "main-menu") {
    return (
      <MainMenu
        series={screen.series}
        maxItems={maxListItems}
        height={termHeight}
        onCreateBaseline={startCreateBaseline}
        onSelectSeries={(id) => setScreen({ type: "series-detail", seriesId: id })}
        onExit={exit}
      />
    );
  }

  if (screen.type === "create-baseline") {
    return (
      <CreateBaseline
        step={screen.step}
        documents={documents}
        agents={agents}
        selectedDoc={selectedDoc}
        selectedAgents={selectedAgents}
        maxItems={maxListItems}
        height={termHeight}
        onSelectDocument={(doc) => {
          setSelectedDoc(doc);
          setScreen({ type: "create-baseline", step: "agents" });
        }}
        onSelectAgents={(ags) => {
          setSelectedAgents(ags);
          setScreen({ type: "create-baseline", step: "confirm" });
        }}
        onConfirm={async () => {
          setScreen({ type: "create-baseline", step: "creating" });
          try {
            const seriesId = await createBaselineRun(selectedDoc!, selectedAgents);
            // Navigate to the newly created series detail
            setScreen({ type: "series-detail", seriesId });
          } catch (e) {
            setError(String(e));
            loadMainMenu();
          }
        }}
        onBack={loadMainMenu}
      />
    );
  }

  if (screen.type === "series-detail") {
    return (
      <SeriesDetail
        seriesId={screen.seriesId}
        maxItems={maxListItems}
        height={termHeight}
        onBack={loadMainMenu}
      />
    );
  }

  return null;
}
