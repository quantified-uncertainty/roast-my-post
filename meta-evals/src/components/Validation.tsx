/**
 * Validation Screen Component
 *
 * Compare pipeline runs and detect regressions.
 */

import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import Spinner from "ink-spinner";
import { metaEvaluationRepository, type AgentChoice } from "@roast/db";
import { truncate } from "./helpers";
import { ScreenContainer, InfoBox } from "./shared";
import {
  type ValidationDocument,
  type DocumentComparisonResult,
  type EvaluationSnapshot,
  compareSnapshots,
  getComparisonStatus,
} from "../validation";

type Tab = "corpus" | "compare" | "results";

interface ValidationProps {
  height: number;
  maxItems: number;
  onBack: () => void;
}

interface CorpusDocument extends ValidationDocument {
  selected: boolean;
}

export function Validation({ height, maxItems, onBack }: ValidationProps) {
  const [activeTab, setActiveTab] = useState<Tab>("corpus");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [agents, setAgents] = useState<AgentChoice[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentChoice | null>(null);
  const [corpusDocuments, setCorpusDocuments] = useState<CorpusDocument[]>([]);
  const [comparisons, setComparisons] = useState<DocumentComparisonResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // Keyboard handling
  useInput((input, key) => {
    if (key.escape) {
      if (activeTab !== "corpus") {
        setActiveTab("corpus");
      } else {
        onBack();
      }
    }
    if (key.tab) {
      setActiveTab((prev) => {
        if (prev === "corpus") return "compare";
        if (prev === "compare") return comparisons.length > 0 ? "results" : "corpus";
        return "corpus";
      });
    }
  });

  // Load agents on mount
  useEffect(() => {
    loadAgents();
  }, []);

  // Load corpus when agent selected
  useEffect(() => {
    if (selectedAgent) {
      loadCorpus(selectedAgent.id);
    }
  }, [selectedAgent?.id]);

  async function loadAgents() {
    try {
      setLoading(true);
      // Get agents that use fallacy-check plugin
      // Note: pluginIds are stored as lowercase strings (e.g., "fallacy-check")
      const { prisma } = await import("@roast/db");
      const fallacyAgents = await prisma.agent.findMany({
        where: {
          isDeprecated: false,
          ephemeralBatchId: null,
          versions: {
            some: {
              pluginIds: {
                has: "fallacy-check",
              },
            },
          },
        },
        include: {
          versions: {
            orderBy: { version: "desc" },
            take: 1,
            select: { name: true, version: true },
          },
        },
        take: 20,
      });

      const agentChoices: AgentChoice[] = fallacyAgents
        .filter((a) => a.versions.length > 0)
        .map((a) => ({
          id: a.id,
          name: a.versions[0].name,
          version: a.versions[0].version,
        }));

      setAgents(agentChoices);
      if (agentChoices.length > 0) {
        setSelectedAgent(agentChoices[0]);
      }
      setLoading(false);
    } catch (e) {
      setError(String(e));
      setLoading(false);
    }
  }

  async function loadCorpus(agentId: string) {
    try {
      setLoading(true);
      const docs = await metaEvaluationRepository.getValidationCorpusDocuments(
        agentId,
        { limit: 50, minContentLength: 200 }
      );

      setCorpusDocuments(
        docs.map((d) => ({
          ...d,
          selected: true, // Select all by default
        }))
      );
      setLoading(false);
    } catch (e) {
      setError(String(e));
      setLoading(false);
    }
  }

  async function runValidation() {
    if (!selectedAgent) return;
    const selectedDocs = corpusDocuments.filter((d) => d.selected);
    if (selectedDocs.length === 0) return;

    setIsRunning(true);
    setProgress({ current: 0, total: selectedDocs.length });
    setActiveTab("compare");

    try {
      // Get baseline snapshots (most recent evaluations)
      const baselineSnapshots = await metaEvaluationRepository.getEvaluationSnapshots(
        selectedDocs.map((d) => d.documentId),
        selectedAgent.id
      );

      // For now, we compare baseline with itself (to test the UI)
      // In real use, we'd run the pipeline again and compare
      const results: DocumentComparisonResult[] = [];

      for (const snapshot of baselineSnapshots) {
        setProgress((p) => ({ ...p, current: p.current + 1 }));

        // Convert to EvaluationSnapshot format
        const baselineEval: EvaluationSnapshot = {
          evaluationVersionId: snapshot.evaluationVersionId,
          agentId: snapshot.agentId,
          agentName: snapshot.agentName,
          createdAt: snapshot.createdAt,
          documentId: snapshot.documentId,
          documentTitle: snapshot.documentTitle,
          comments: snapshot.comments,
          grade: snapshot.grade,
          pipelineTelemetry: extractTelemetry(snapshot.pipelineTelemetry),
        };

        // For demo, use same snapshot as "current"
        // In real use, this would be from a new pipeline run
        const comparison = compareSnapshots(baselineEval, baselineEval);
        results.push(comparison);
      }

      setComparisons(results);
      setActiveTab("results");
    } catch (e) {
      setError(String(e));
    } finally {
      setIsRunning(false);
    }
  }

  function toggleDocument(docId: string) {
    setCorpusDocuments((docs) =>
      docs.map((d) =>
        d.documentId === docId ? { ...d, selected: !d.selected } : d
      )
    );
  }

  function toggleAll() {
    const allSelected = corpusDocuments.every((d) => d.selected);
    setCorpusDocuments((docs) =>
      docs.map((d) => ({ ...d, selected: !allSelected }))
    );
  }

  // Render tabs header
  const renderTabs = () => (
    <Box marginBottom={1}>
      <Text bold={activeTab === "corpus"} color={activeTab === "corpus" ? "cyan" : "gray"}>
        [Corpus]
      </Text>
      <Text> </Text>
      <Text bold={activeTab === "compare"} color={activeTab === "compare" ? "yellow" : "gray"}>
        [Compare]
      </Text>
      <Text> </Text>
      <Text bold={activeTab === "results"} color={activeTab === "results" ? "green" : "gray"}>
        [Results]
      </Text>
      <Text dimColor>  (Tab to switch)</Text>
    </Box>
  );

  if (error) {
    return (
      <ScreenContainer title="Validation" borderColor="red" height={height}>
        <Text color="red">Error: {error}</Text>
        <Text dimColor>Press Escape to go back</Text>
      </ScreenContainer>
    );
  }

  if (loading) {
    return (
      <ScreenContainer title="Validation" borderColor="magenta" height={height}>
        <Text>
          <Spinner type="dots" /> Loading...
        </Text>
      </ScreenContainer>
    );
  }

  // Results tab
  if (activeTab === "results") {
    const okCount = comparisons.filter((c) => getComparisonStatus(c) === "ok").length;
    const warningCount = comparisons.filter((c) => getComparisonStatus(c) === "warning").length;
    const errorCount = comparisons.filter((c) => getComparisonStatus(c) === "error").length;

    return (
      <ScreenContainer title="Validation Results" borderColor="green" height={height}>
        {renderTabs()}

        <InfoBox>
          <Text>
            <Text color="green">✅ {okCount}</Text>
            {" | "}
            <Text color="yellow">⚠️ {warningCount}</Text>
            {" | "}
            <Text color="red">❌ {errorCount}</Text>
            {" | "}
            Total: {comparisons.length}
          </Text>
        </InfoBox>

        <Box flexDirection="column" marginTop={1}>
          {comparisons.slice(0, maxItems - 5).map((c, i) => {
            const status = getComparisonStatus(c);
            const icon = status === "ok" ? "✅" : status === "warning" ? "⚠️" : "❌";
            const color = status === "ok" ? "green" : status === "warning" ? "yellow" : "red";

            return (
              <Box key={c.documentId}>
                <Text color={color}>
                  {icon} {truncate(c.documentTitle, 50)}
                </Text>
                <Text dimColor>
                  {" "}| {c.baseline.comments.length} → {c.current.comments.length} comments
                </Text>
              </Box>
            );
          })}
        </Box>

        <Box marginTop={1}>
          <Text dimColor>Escape Go back | Tab Switch tabs</Text>
        </Box>
      </ScreenContainer>
    );
  }

  // Compare tab (running)
  if (activeTab === "compare") {
    return (
      <ScreenContainer title="Running Validation" borderColor="yellow" height={height}>
        {renderTabs()}

        {isRunning ? (
          <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
            <Text>
              <Spinner type="dots" /> Running validation...
            </Text>
            <Text color="yellow">
              {progress.current}/{progress.total} documents
            </Text>
          </Box>
        ) : (
          <Box flexDirection="column">
            <Text>Select documents and run validation from the Corpus tab.</Text>
          </Box>
        )}

        <Box marginTop={1}>
          <Text dimColor>Escape Go back | Tab Switch tabs</Text>
        </Box>
      </ScreenContainer>
    );
  }

  // Corpus tab (default)
  const selectedCount = corpusDocuments.filter((d) => d.selected).length;
  const items = [
    ...(agents.length > 1
      ? [{ label: `Agent: ${selectedAgent?.name || "Select..."}`, value: "agent" }]
      : []),
    { label: `[${selectedCount === corpusDocuments.length ? "x" : " "}] Select All (${corpusDocuments.length} docs)`, value: "toggle-all" },
    ...corpusDocuments.slice(0, maxItems - 5).map((d) => ({
      label: `[${d.selected ? "x" : " "}] ${truncate(d.title, 45)} (${d.evaluationCount} evals)`,
      value: d.documentId,
    })),
    { label: selectedCount > 0 ? `▶ Run Validation (${selectedCount} selected)` : "▶ Run Validation (select docs first)", value: "run" },
    { label: "← Back", value: "back" },
  ];

  return (
    <ScreenContainer title="Validation - Select Corpus" borderColor="magenta" height={height}>
      {renderTabs()}

      <InfoBox>
        <Text>
          Agent: <Text color="cyan">{selectedAgent?.name || "None"}</Text>
          {" | "}
          Selected: <Text color="green">{selectedCount}</Text>/{corpusDocuments.length}
        </Text>
      </InfoBox>

      <SelectInput
        items={items}
        onSelect={(item) => {
          if (item.value === "back") {
            onBack();
          } else if (item.value === "toggle-all") {
            toggleAll();
          } else if (item.value === "run") {
            if (selectedCount > 0) {
              runValidation();
            }
          } else if (item.value === "agent") {
            // TODO: Agent selection UI
          } else {
            toggleDocument(item.value);
          }
        }}
      />

      <Box marginTop={1}>
        <Text dimColor>Enter Toggle/Select | Tab Switch tabs | Escape Go back</Text>
      </Box>
    </ScreenContainer>
  );
}

/**
 * Extract pipeline telemetry snapshot from raw data.
 */
function extractTelemetry(raw: unknown): {
  totalDurationMs: number;
  issuesExtracted: number;
  issuesAfterDedup: number;
  issuesAfterFiltering: number;
  commentsGenerated: number;
  commentsKept: number;
} | null {
  if (!raw || typeof raw !== "object") return null;

  const telemetry = raw as Record<string, unknown>;
  const finalCounts = telemetry.finalCounts as Record<string, number> | undefined;

  if (!finalCounts) return null;

  return {
    totalDurationMs: (telemetry.totalDurationMs as number) || 0,
    issuesExtracted: finalCounts.issuesExtracted || 0,
    issuesAfterDedup: finalCounts.issuesAfterDedup || 0,
    issuesAfterFiltering: finalCounts.issuesAfterFiltering || 0,
    commentsGenerated: finalCounts.commentsGenerated || 0,
    commentsKept: finalCounts.commentsKept || 0,
  };
}
