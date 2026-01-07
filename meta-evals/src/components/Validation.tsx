/**
 * Validation Screen Component
 *
 * Compare pipeline runs and detect regressions.
 *
 * Flow:
 * 1. Select/create a baseline (saved evaluation snapshots)
 * 2. Run pipeline on baseline documents with current code
 * 3. Compare new results vs baseline
 * 4. View regressions
 */

import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
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

type Tab = "baselines" | "run" | "results";

interface ValidationProps {
  height: number;
  maxItems: number;
  onBack: () => void;
  onCreateBatch: (agentId: string, documentIds: string[]) => Promise<string[]>; // Returns job IDs
}

interface Baseline {
  id: string;
  name: string;
  description: string | null;
  commitHash: string | null;
  createdAt: Date;
  snapshotCount: number;
}

interface CorpusDocument extends ValidationDocument {
  selected: boolean;
}

export function Validation({ height, maxItems, onBack, onCreateBatch }: ValidationProps) {
  const [activeTab, setActiveTab] = useState<Tab>("baselines");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Agent state
  const [agents, setAgents] = useState<AgentChoice[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentChoice | null>(null);

  // Baseline state
  const [baselines, setBaselines] = useState<Baseline[]>([]);
  const [selectedBaseline, setSelectedBaseline] = useState<Baseline | null>(null);
  const [creatingBaseline, setCreatingBaseline] = useState(false);
  const [newBaselineName, setNewBaselineName] = useState("");

  // Corpus state (for creating new baseline)
  const [corpusDocuments, setCorpusDocuments] = useState<CorpusDocument[]>([]);
  const [showCorpusSelect, setShowCorpusSelect] = useState(false);

  // Run state
  const [isRunning, setIsRunning] = useState(false);
  const [runProgress, setRunProgress] = useState({ phase: "", current: 0, total: 0 });

  // Results state
  const [comparisons, setComparisons] = useState<DocumentComparisonResult[]>([]);
  const [savingBaseline, setSavingBaseline] = useState(false);
  const [saveBaselineName, setSaveBaselineName] = useState("");

  // Keyboard handling
  useInput((input, key) => {
    if (key.escape) {
      if (creatingBaseline) {
        setCreatingBaseline(false);
        setShowCorpusSelect(false);
      } else if (savingBaseline) {
        setSavingBaseline(false);
      } else if (activeTab !== "baselines") {
        setActiveTab("baselines");
      } else {
        onBack();
      }
    }
    if (key.tab && !creatingBaseline && !savingBaseline) {
      setActiveTab((prev) => {
        if (prev === "baselines") return "run";
        if (prev === "run") return comparisons.length > 0 ? "results" : "baselines";
        return "baselines";
      });
    }
  });

  // Load agents on mount
  useEffect(() => {
    loadAgents();
  }, []);

  // Load baselines when agent selected
  useEffect(() => {
    if (selectedAgent) {
      loadBaselines(selectedAgent.id);
      loadCorpus(selectedAgent.id);
    }
  }, [selectedAgent?.id]);

  async function loadAgents() {
    try {
      setLoading(true);
      const { prisma } = await import("@roast/db");
      const fallacyAgents = await prisma.agent.findMany({
        where: {
          isDeprecated: false,
          ephemeralBatchId: null,
          versions: {
            some: {
              pluginIds: { has: "fallacy-check" },
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

  async function loadBaselines(agentId: string) {
    try {
      const data = await metaEvaluationRepository.getValidationBaselines(agentId);
      setBaselines(data);
      if (data.length > 0 && !selectedBaseline) {
        setSelectedBaseline(data[0]);
      }
    } catch (e) {
      setError(String(e));
    }
  }

  async function loadCorpus(agentId: string) {
    try {
      const docs = await metaEvaluationRepository.getValidationCorpusDocuments(
        agentId,
        { limit: 50, minContentLength: 200 }
      );
      setCorpusDocuments(docs.map((d) => ({ ...d, selected: true })));
    } catch (e) {
      setError(String(e));
    }
  }

  async function createBaseline() {
    if (!selectedAgent || !newBaselineName.trim()) return;

    const selectedDocs = corpusDocuments.filter((d) => d.selected);
    if (selectedDocs.length === 0) return;

    try {
      setLoading(true);

      // Get current evaluation version IDs for selected documents
      const snapshots = await metaEvaluationRepository.getEvaluationSnapshots(
        selectedDocs.map((d) => d.documentId),
        selectedAgent.id
      );

      const result = await metaEvaluationRepository.createValidationBaseline({
        name: newBaselineName.trim(),
        agentId: selectedAgent.id,
        evaluationVersionIds: snapshots.map((s) => s.evaluationVersionId),
      });

      // Reload baselines
      await loadBaselines(selectedAgent.id);

      // Select the new baseline
      const newBaseline = baselines.find((b) => b.id === result.id);
      if (newBaseline) setSelectedBaseline(newBaseline);

      setCreatingBaseline(false);
      setShowCorpusSelect(false);
      setNewBaselineName("");
      setLoading(false);
    } catch (e) {
      setError(String(e));
      setLoading(false);
    }
  }

  async function deleteBaseline(baselineId: string) {
    try {
      await metaEvaluationRepository.deleteValidationBaseline(baselineId);
      if (selectedAgent) {
        await loadBaselines(selectedAgent.id);
      }
      if (selectedBaseline?.id === baselineId) {
        setSelectedBaseline(baselines[0] || null);
      }
    } catch (e) {
      setError(String(e));
    }
  }

  async function runValidation() {
    if (!selectedAgent || !selectedBaseline) return;

    setIsRunning(true);
    setActiveTab("run");
    setComparisons([]);

    try {
      // Phase 1: Get baseline snapshots
      setRunProgress({ phase: "Loading baseline...", current: 0, total: 0 });
      const baselineSnapshots = await metaEvaluationRepository.getBaselineSnapshots(selectedBaseline.id);

      if (baselineSnapshots.length === 0) {
        throw new Error("Baseline has no snapshots");
      }

      // Phase 2: Run pipeline on documents
      setRunProgress({ phase: "Running pipeline...", current: 0, total: baselineSnapshots.length });
      const documentIds = [...new Set(baselineSnapshots.map((s) => s.documentId))];

      // Create batch jobs
      const jobIds = await onCreateBatch(selectedAgent.id, documentIds);

      // Phase 3: Wait for jobs to complete and get results
      setRunProgress({ phase: "Waiting for jobs...", current: 0, total: jobIds.length });

      // Poll for job completion
      const { prisma } = await import("@roast/db");
      let completed = 0;
      const maxWaitMs = 5 * 60 * 1000; // 5 minutes
      const startTime = Date.now();

      while (completed < jobIds.length && Date.now() - startTime < maxWaitMs) {
        await new Promise((r) => setTimeout(r, 2000)); // Poll every 2s

        const jobs = await prisma.job.findMany({
          where: { id: { in: jobIds } },
          select: { id: true, status: true, evaluationVersionId: true },
        });

        completed = jobs.filter((j) => j.status === "COMPLETED" || j.status === "FAILED").length;
        setRunProgress({ phase: "Waiting for jobs...", current: completed, total: jobIds.length });
      }

      // Phase 4: Get new evaluation versions and compare
      setRunProgress({ phase: "Comparing results...", current: 0, total: baselineSnapshots.length });

      const jobs = await prisma.job.findMany({
        where: { id: { in: jobIds }, status: "COMPLETED" },
        select: { evaluationVersionId: true },
      });

      const newVersionIds = jobs
        .map((j) => j.evaluationVersionId)
        .filter((id): id is string => id !== null);

      // Get new snapshots
      const newSnapshots = await Promise.all(
        newVersionIds.map((id) => metaEvaluationRepository.getEvaluationSnapshotById(id))
      );

      // Compare
      const results: DocumentComparisonResult[] = [];
      for (const baselineSnapshot of baselineSnapshots) {
        const newSnapshot = newSnapshots.find(
          (s) => s && s.documentId === baselineSnapshot.documentId
        );

        if (newSnapshot) {
          const baselineEval = toEvaluationSnapshot(baselineSnapshot);
          const currentEval = toEvaluationSnapshot(newSnapshot);
          results.push(compareSnapshots(baselineEval, currentEval));
        }

        setRunProgress((p) => ({ ...p, current: p.current + 1 }));
      }

      setComparisons(results);
      setActiveTab("results");
    } catch (e) {
      setError(String(e));
    } finally {
      setIsRunning(false);
    }
  }

  async function saveResultsAsBaseline() {
    if (!selectedAgent || !saveBaselineName.trim() || comparisons.length === 0) return;

    try {
      setSavingBaseline(false);
      setLoading(true);

      // Get the "current" evaluation version IDs from comparisons
      const evalVersionIds = comparisons.map((c) => c.current.evaluationVersionId);

      await metaEvaluationRepository.createValidationBaseline({
        name: saveBaselineName.trim(),
        agentId: selectedAgent.id,
        evaluationVersionIds: evalVersionIds,
      });

      await loadBaselines(selectedAgent.id);
      setSaveBaselineName("");
      setLoading(false);
    } catch (e) {
      setError(String(e));
      setLoading(false);
    }
  }

  function toggleDocument(docId: string) {
    setCorpusDocuments((docs) =>
      docs.map((d) => (d.documentId === docId ? { ...d, selected: !d.selected } : d))
    );
  }

  function toggleAll() {
    const allSelected = corpusDocuments.every((d) => d.selected);
    setCorpusDocuments((docs) => docs.map((d) => ({ ...d, selected: !allSelected })));
  }

  // Render tabs header
  const renderTabs = () => (
    <Box marginBottom={1}>
      <Text bold={activeTab === "baselines"} color={activeTab === "baselines" ? "cyan" : "gray"}>
        [Baselines]
      </Text>
      <Text> </Text>
      <Text bold={activeTab === "run"} color={activeTab === "run" ? "yellow" : "gray"}>
        [Run]
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
        <Text><Spinner type="dots" /> Loading...</Text>
      </ScreenContainer>
    );
  }

  // Creating baseline - corpus selection
  if (creatingBaseline && showCorpusSelect) {
    const selectedCount = corpusDocuments.filter((d) => d.selected).length;
    const items = [
      { label: `[${selectedCount === corpusDocuments.length ? "x" : " "}] Select All (${corpusDocuments.length})`, value: "toggle-all" },
      ...corpusDocuments.slice(0, maxItems - 4).map((d) => ({
        label: `[${d.selected ? "x" : " "}] ${truncate(d.title, 50)}`,
        value: d.documentId,
      })),
      { label: selectedCount > 0 ? `✓ Create Baseline (${selectedCount} docs)` : "Select documents first", value: "create" },
      { label: "← Cancel", value: "cancel" },
    ];

    return (
      <ScreenContainer title={`New Baseline: ${newBaselineName}`} borderColor="cyan" height={height}>
        <InfoBox>
          <Text>Select documents to include in baseline</Text>
        </InfoBox>

        <SelectInput
          items={items}
          onSelect={(item) => {
            if (item.value === "cancel") {
              setShowCorpusSelect(false);
              setCreatingBaseline(false);
            } else if (item.value === "toggle-all") {
              toggleAll();
            } else if (item.value === "create" && selectedCount > 0) {
              createBaseline();
            } else {
              toggleDocument(item.value);
            }
          }}
        />
      </ScreenContainer>
    );
  }

  // Creating baseline - name input
  if (creatingBaseline) {
    return (
      <ScreenContainer title="Create New Baseline" borderColor="cyan" height={height}>
        <InfoBox>
          <Text>Enter a name for this baseline (e.g., "Pre-refactor", "v2.0")</Text>
        </InfoBox>

        <Box marginY={1}>
          <Text>Name: </Text>
          <TextInput
            value={newBaselineName}
            onChange={setNewBaselineName}
            onSubmit={() => {
              if (newBaselineName.trim()) {
                setShowCorpusSelect(true);
              }
            }}
          />
        </Box>

        <Box marginTop={1}>
          <Text dimColor>Enter Continue | Escape Cancel</Text>
        </Box>
      </ScreenContainer>
    );
  }

  // Saving results as baseline
  if (savingBaseline) {
    return (
      <ScreenContainer title="Save as Baseline" borderColor="green" height={height}>
        <InfoBox>
          <Text>Save current results as a new baseline for future comparisons</Text>
        </InfoBox>

        <Box marginY={1}>
          <Text>Name: </Text>
          <TextInput
            value={saveBaselineName}
            onChange={setSaveBaselineName}
            onSubmit={() => {
              if (saveBaselineName.trim()) {
                saveResultsAsBaseline();
              }
            }}
          />
        </Box>

        <Box marginTop={1}>
          <Text dimColor>Enter Save | Escape Cancel</Text>
        </Box>
      </ScreenContainer>
    );
  }

  // Results tab
  if (activeTab === "results" && comparisons.length > 0) {
    // Count by change status
    const unchangedCount = comparisons.filter((c) =>
      c.newComments.length === 0 && c.lostComments.length === 0
    ).length;
    const changedCount = comparisons.length - unchangedCount;

    // Format change summary for a comparison
    const formatChangeSummary = (c: DocumentComparisonResult) => {
      const parts: string[] = [];
      const kept = c.matchedComments.length;
      const added = c.newComments.length;
      const lost = c.lostComments.length;

      if (kept > 0) parts.push(`${kept} kept`);
      if (added > 0) parts.push(`+${added} new`);
      if (lost > 0) parts.push(`-${lost} lost`);

      return parts.length > 0 ? parts.join(", ") : "no comments";
    };

    const items = [
      ...comparisons.slice(0, maxItems - 4).map((c) => {
        const hasChanges = c.newComments.length > 0 || c.lostComments.length > 0;
        const icon = hasChanges ? "~" : "=";
        const color = hasChanges ? "yellow" : "green";

        return {
          label: `[${icon}] ${truncate(c.documentTitle, 35)} | ${formatChangeSummary(c)}`,
          value: c.documentId,
        };
      }),
      { label: "+ Save as New Baseline", value: "save" },
      { label: "← Back to Baselines", value: "back" },
    ];

    return (
      <ScreenContainer title="Validation Results" borderColor="green" height={height}>
        {renderTabs()}

        <InfoBox>
          <Text>
            <Text color="green">[=] {unchangedCount} unchanged</Text>
            {" | "}
            <Text color="yellow">[~] {changedCount} changed</Text>
            {" | "}
            Baseline: <Text color="cyan">{selectedBaseline?.name || "?"}</Text>
          </Text>
        </InfoBox>

        <SelectInput
          items={items}
          onSelect={(item) => {
            if (item.value === "save") {
              setSavingBaseline(true);
              setSaveBaselineName(`Post-${selectedBaseline?.name || "run"}`);
            } else if (item.value === "back") {
              setActiveTab("baselines");
            }
            // TODO: Show detail view for specific document
          }}
        />
      </ScreenContainer>
    );
  }

  // Run tab
  if (activeTab === "run") {
    return (
      <ScreenContainer title="Run Validation" borderColor="yellow" height={height}>
        {renderTabs()}

        {isRunning ? (
          <Box flexDirection="column" alignItems="center" marginTop={2}>
            <Text><Spinner type="dots" /> {runProgress.phase}</Text>
            {runProgress.total > 0 && (
              <Text color="yellow">{runProgress.current}/{runProgress.total}</Text>
            )}
          </Box>
        ) : selectedBaseline ? (
          <Box flexDirection="column">
            <InfoBox>
              <Text>
                Baseline: <Text color="cyan">{selectedBaseline.name}</Text>
                {" "}({selectedBaseline.snapshotCount} docs)
              </Text>
            </InfoBox>

            <SelectInput
              items={[
                { label: `▶ Run Pipeline & Compare`, value: "run" },
                { label: "← Back to Baselines", value: "back" },
              ]}
              onSelect={(item) => {
                if (item.value === "run") runValidation();
                else setActiveTab("baselines");
              }}
            />
          </Box>
        ) : (
          <Box flexDirection="column">
            <Text color="yellow">No baseline selected. Create or select one first.</Text>
            <SelectInput
              items={[{ label: "← Back to Baselines", value: "back" }]}
              onSelect={() => setActiveTab("baselines")}
            />
          </Box>
        )}
      </ScreenContainer>
    );
  }

  // Baselines tab (default)
  const items = [
    { label: "+ Create New Baseline", value: "create" },
    ...baselines.map((b) => ({
      label: `${selectedBaseline?.id === b.id ? "● " : "○ "}${b.name} (${b.snapshotCount} docs)`,
      value: `select:${b.id}`,
    })),
    ...(selectedBaseline ? [{ label: "- Delete Selected Baseline", value: "delete" }] : []),
    { label: "← Back to Main Menu", value: "back" },
  ];

  return (
    <ScreenContainer title="Validation - Baselines" borderColor="magenta" height={height}>
      {renderTabs()}

      <InfoBox>
        <Text>
          Agent: <Text color="cyan">{selectedAgent?.name || "None"}</Text>
          {selectedBaseline && (
            <>
              {" | "}
              Selected: <Text color="green">{selectedBaseline.name}</Text>
            </>
          )}
        </Text>
      </InfoBox>

      <SelectInput
        items={items}
        onSelect={(item) => {
          if (item.value === "back") {
            onBack();
          } else if (item.value === "create") {
            setCreatingBaseline(true);
            setNewBaselineName("");
          } else if (item.value === "delete" && selectedBaseline) {
            deleteBaseline(selectedBaseline.id);
          } else if (item.value.startsWith("select:")) {
            const baselineId = item.value.replace("select:", "");
            const baseline = baselines.find((b) => b.id === baselineId);
            if (baseline) setSelectedBaseline(baseline);
          }
        }}
      />

      <Box marginTop={1}>
        <Text dimColor>Enter Select | Tab → Run | Escape Back</Text>
      </Box>
    </ScreenContainer>
  );
}

/**
 * Convert repository snapshot to EvaluationSnapshot type.
 */
function toEvaluationSnapshot(snapshot: {
  evaluationVersionId: string;
  agentId: string;
  agentName: string;
  createdAt: Date;
  documentId: string;
  documentTitle: string;
  grade: number | null;
  pipelineTelemetry: unknown;
  comments: Array<{
    id: string;
    quotedText: string;
    header: string | null;
    description: string;
    importance: number | null;
    startOffset: number;
    endOffset: number;
  }>;
}): EvaluationSnapshot {
  return {
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
