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
import { DocumentSelector } from "./DocumentSelector";
import {
  type ValidationDocument,
  type DocumentComparisonResult,
  type EvaluationSnapshot,
  compareSnapshots,
} from "../validation";

type Tab = "baselines" | "run" | "history";

/** Sanitize baseline name - remove newlines and extra whitespace */
function sanitizeName(name: string): string {
  return name.replace(/\s+/g, " ").trim();
}

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

// CorpusDocument is just ValidationDocument (selection tracked separately via Set)

interface ValidationRunSummary {
  id: string;
  name: string | null;
  commitHash: string | null;
  status: string;
  summary: string | null;
  createdAt: Date;
  completedAt: Date | null;
  snapshotCount: number;
  unchangedCount: number;
  changedCount: number;
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
  const [corpusDocuments, setCorpusDocuments] = useState<ValidationDocument[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [showCorpusSelect, setShowCorpusSelect] = useState(false);

  // Run state
  const [isRunning, setIsRunning] = useState(false);
  const [runProgress, setRunProgress] = useState({ phase: "", current: 0, total: 0 });

  // Run state (for tracking current run to auto-select after completion)
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);

  // History state
  const [validationRuns, setValidationRuns] = useState<ValidationRunSummary[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedRunDetail, setSelectedRunDetail] = useState<{
    id: string;
    name: string | null;
    status: string;
    summary: string | null;
    createdAt: Date;
    baseline: { id: string; name: string };
    snapshots: Array<{
      id: string;
      status: string;
      keptCount: number;
      newCount: number;
      lostCount: number;
      documentId: string;
      documentTitle: string;
      comparisonData: unknown;
    }>;
  } | null>(null);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const [selectedCommentKey, setSelectedCommentKey] = useState<string | null>(null);

  // Keyboard handling
  useInput((input, key) => {
    if (key.escape) {
      if (selectedCommentKey) {
        setSelectedCommentKey(null);
      } else if (selectedSnapshotId) {
        setSelectedSnapshotId(null);
      } else if (selectedRunDetail) {
        setSelectedRunDetail(null);
        setSelectedRunId(null);
      } else if (creatingBaseline) {
        setCreatingBaseline(false);
        setShowCorpusSelect(false);
      } else if (activeTab !== "baselines") {
        setActiveTab("baselines");
      } else {
        onBack();
      }
    }
    if (key.tab && !creatingBaseline) {
      setActiveTab((prev) => {
        if (prev === "baselines") return "run";
        if (prev === "run") return "history";
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

  // Load validation runs when baseline selected
  useEffect(() => {
    if (selectedBaseline) {
      loadValidationRuns(selectedBaseline.id);
    }
  }, [selectedBaseline?.id]);

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

  async function loadCorpus(agentId: string, filter?: string) {
    try {
      const docs = await metaEvaluationRepository.getValidationCorpusDocuments(
        agentId,
        { limit: 50, minContentLength: 200, filter }
      );
      setCorpusDocuments(docs);
      // Only reset selection on initial load, not on filter changes
      if (!filter) {
        setSelectedDocIds(new Set());
      }
    } catch (e) {
      setError(String(e));
    }
  }

  async function loadValidationRuns(baselineId: string) {
    try {
      const runs = await metaEvaluationRepository.getValidationRuns(baselineId);
      setValidationRuns(runs);
    } catch (e) {
      setError(String(e));
    }
  }

  async function loadRunDetail(runId: string) {
    try {
      setLoading(true);
      const detail = await metaEvaluationRepository.getValidationRunDetail(runId);
      setSelectedRunDetail(detail);
      setLoading(false);
    } catch (e) {
      setError(String(e));
      setLoading(false);
    }
  }

  async function createBaseline() {
    if (!selectedAgent || !newBaselineName.trim()) return;

    if (selectedDocIds.size === 0) return;

    try {
      setLoading(true);

      // Get current evaluation version IDs for selected documents
      const snapshots = await metaEvaluationRepository.getEvaluationSnapshots(
        Array.from(selectedDocIds),
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
    setCurrentRunId(null);

    let runId: string | null = null;

    try {
      // Phase 1: Create validation run record
      setRunProgress({ phase: "Creating run...", current: 0, total: 0 });
      const run = await metaEvaluationRepository.createValidationRun({
        baselineId: selectedBaseline.id,
        name: `Run ${new Date().toLocaleString()}`,
      });
      runId = run.id;
      setCurrentRunId(runId);

      // Phase 2: Get baseline snapshots
      setRunProgress({ phase: "Loading baseline...", current: 0, total: 0 });
      const baselineSnapshots = await metaEvaluationRepository.getBaselineSnapshots(selectedBaseline.id);

      if (baselineSnapshots.length === 0) {
        throw new Error("Baseline has no snapshots");
      }

      // Phase 3: Run pipeline on documents
      setRunProgress({ phase: "Running pipeline...", current: 0, total: baselineSnapshots.length });
      const documentIds = [...new Set(baselineSnapshots.map((s) => s.documentId))];

      // Create batch jobs
      const jobIds = await onCreateBatch(selectedAgent.id, documentIds);

      // Phase 4: Wait for jobs to complete and get results
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

      // Phase 5: Get new evaluation versions and compare
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

      // Compare and save results
      const results: DocumentComparisonResult[] = [];
      let unchangedCount = 0;
      let changedCount = 0;

      for (const baselineSnapshot of baselineSnapshots) {
        const newSnapshot = newSnapshots.find(
          (s) => s && s.documentId === baselineSnapshot.documentId
        );

        if (newSnapshot) {
          const baselineEval = toEvaluationSnapshot(baselineSnapshot);
          const currentEval = toEvaluationSnapshot(newSnapshot);
          const comparison = compareSnapshots(baselineEval, currentEval);
          results.push(comparison);

          // Save snapshot result to database
          const baselineSnapshotRecord = await metaEvaluationRepository.getBaselineSnapshotByDocument(
            selectedBaseline.id,
            baselineSnapshot.documentId
          );

          if (baselineSnapshotRecord && runId) {
            const status = comparison.newComments.length === 0 && comparison.lostComments.length === 0
              ? "unchanged"
              : "changed";

            if (status === "unchanged") unchangedCount++;
            else changedCount++;

            await metaEvaluationRepository.addValidationRunSnapshot({
              runId,
              baselineSnapshotId: baselineSnapshotRecord.id,
              newEvaluationId: newSnapshot.evaluationVersionId,
              status,
              keptCount: comparison.matchedComments.length,
              newCount: comparison.newComments.length,
              lostCount: comparison.lostComments.length,
              comparisonData: {
                matchedComments: comparison.matchedComments,
                newComments: comparison.newComments,
                lostComments: comparison.lostComments,
                // Include filter reasoning from the current run's telemetry
                filteredItems: currentEval.pipelineTelemetry?.filteredItems,
                // Include extraction phase telemetry for drill-down
                extractionPhase: currentEval.pipelineTelemetry?.extractionPhase,
                // Include pipeline counts for accurate math display
                pipelineCounts: currentEval.pipelineTelemetry ? {
                  issuesAfterDedup: currentEval.pipelineTelemetry.issuesAfterDedup,
                  issuesAfterFiltering: currentEval.pipelineTelemetry.issuesAfterFiltering,
                  commentsGenerated: currentEval.pipelineTelemetry.commentsGenerated,
                  commentsKept: currentEval.pipelineTelemetry.commentsKept,
                } : undefined,
              },
            });
          }
        }

        setRunProgress((p) => ({ ...p, current: p.current + 1 }));
      }

      // Update run status
      if (runId) {
        const summary = `${unchangedCount} unchanged, ${changedCount} changed`;
        await metaEvaluationRepository.updateValidationRunStatus(runId, "completed", summary);
      }

      // Reload runs list and navigate to history
      if (selectedBaseline) {
        await loadValidationRuns(selectedBaseline.id);
      }

      // Navigate to history and auto-load the run detail
      setActiveTab("history");
      if (runId) {
        setSelectedRunId(runId);
        await loadRunDetail(runId);
      }
    } catch (e) {
      // Mark run as failed if it was created
      if (runId) {
        await metaEvaluationRepository.updateValidationRunStatus(runId, "failed", String(e));
      }
      setError(String(e));
    } finally {
      setIsRunning(false);
    }
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
      <Text bold={activeTab === "history"} color={activeTab === "history" ? "magenta" : "gray"}>
        [History]
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

  // Creating baseline - corpus selection using DocumentSelector
  if (creatingBaseline && showCorpusSelect) {
    // Convert ValidationDocument[] to DocumentChoice[] format
    const documentsForSelector = corpusDocuments.map((d) => ({
      id: d.documentId,
      title: d.title,
      createdAt: d.lastEvaluatedAt || new Date(),
    }));

    return (
      <DocumentSelector
        title={`New Baseline: ${newBaselineName}`}
        subtitle="Select documents to include in baseline"
        borderColor="cyan"
        height={height}
        maxItems={maxItems}
        documents={documentsForSelector}
        multiSelect={true}
        selectedIds={selectedDocIds}
        onSelectionChange={setSelectedDocIds}
        showFilter={true}
        onFilterChange={(f) => selectedAgent && loadCorpus(selectedAgent.id, f)}
        confirmLabel="Create Baseline"
        onConfirm={() => createBaseline()}
        onCancel={() => {
          setShowCorpusSelect(false);
          setCreatingBaseline(false);
        }}
      />
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
                Baseline: <Text color="cyan">{sanitizeName(selectedBaseline.name)}</Text>
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

  // Comment detail view
  if (selectedRunDetail && selectedSnapshotId && selectedCommentKey) {
    const snapshot = selectedRunDetail.snapshots.find((s) => s.id === selectedSnapshotId);
    if (snapshot) {
      const data = snapshot.comparisonData as {
        matchedComments?: Array<{ baselineComment?: { quotedText: string; header: string | null; description: string }; currentComment?: { quotedText: string; header: string | null; description: string } }>;
        newComments?: Array<{ quotedText: string; header: string | null; description: string }>;
        lostComments?: Array<{ quotedText: string; header: string | null; description: string }>;
        filteredItems?: Array<{ stage: string; quotedText: string; header?: string; filterReason: string; supportLocation?: string }>;
      } | null;

      const matched = data?.matchedComments || [];
      const newComments = data?.newComments || [];
      const lost = data?.lostComments || [];
      const filteredItems = data?.filteredItems || [];

      let commentType = "";
      let baselineComment: { quotedText: string; header: string | null; description: string } | null = null;
      let currentComment: { quotedText: string; header: string | null; description: string } | null = null;
      let filterInfo: { stage: string; filterReason: string; supportLocation?: string } | null = null;

      if (selectedCommentKey.startsWith("kept-")) {
        const idx = parseInt(selectedCommentKey.replace("kept-", ""), 10);
        const match = matched[idx];
        baselineComment = match?.baselineComment || null;
        currentComment = match?.currentComment || null;
        commentType = "Kept";
      } else if (selectedCommentKey.startsWith("new-")) {
        const idx = parseInt(selectedCommentKey.replace("new-", ""), 10);
        currentComment = newComments[idx] || null;
        commentType = "New";
      } else if (selectedCommentKey.startsWith("lost-")) {
        const idx = parseInt(selectedCommentKey.replace("lost-", ""), 10);
        baselineComment = lost[idx] || null;
        commentType = "Lost";

        // Try to find filter reason for this lost comment
        if (baselineComment && filteredItems.length > 0) {
          // Match by quoted text (fuzzy match - check if texts contain each other)
          const matchingFilter = filteredItems.find((f) => {
            const fText = f.quotedText.toLowerCase().trim();
            const bText = baselineComment!.quotedText.toLowerCase().trim();
            // Check if either contains the other (for partial matches)
            return fText.includes(bText) || bText.includes(fText) ||
              // Also check header match as fallback
              (f.header && baselineComment!.header && f.header.toLowerCase() === baselineComment!.header.toLowerCase());
          });

          if (matchingFilter) {
            filterInfo = {
              stage: matchingFilter.stage,
              filterReason: matchingFilter.filterReason,
              supportLocation: matchingFilter.supportLocation,
            };
          }
        }
      } else if (selectedCommentKey.startsWith("filtered-")) {
        // Show filtered item detail view
        const idx = parseInt(selectedCommentKey.replace("filtered-", ""), 10);
        const filteredItem = filteredItems[idx];
        if (filteredItem) {
          const stageName = filteredItem.stage === 'supported-elsewhere-filter'
            ? 'Supported Elsewhere Filter'
            : filteredItem.stage === 'review'
            ? 'Review Filter'
            : filteredItem.stage;
          return (
            <ScreenContainer title={`Filtered Issue (${stageName})`} borderColor="magenta" height={height}>
              <Box flexDirection="column" paddingX={1} overflowY="hidden">
                <Box marginBottom={1}>
                  <Text bold color="magenta">{filteredItem.header || "(no header)"}</Text>
                </Box>

                <Box marginBottom={1} borderStyle="single" borderColor="gray" paddingX={1} flexDirection="column">
                  <Text bold>Quoted Text:</Text>
                  <Text wrap="wrap">{filteredItem.quotedText}</Text>
                </Box>

                <Box marginBottom={1} borderStyle="single" borderColor="magenta" paddingX={1} flexDirection="column">
                  <Text bold color="magenta">Why Filtered:</Text>
                  <Text wrap="wrap">{filteredItem.filterReason}</Text>
                </Box>

                {filteredItem.supportLocation && (
                  <Box marginBottom={1} borderStyle="single" borderColor="cyan" paddingX={1} flexDirection="column">
                    <Text bold color="cyan">Support Found At:</Text>
                    <Text wrap="wrap">{filteredItem.supportLocation}</Text>
                  </Box>
                )}

                <Box marginTop={1}>
                  <SelectInput
                    items={[{ label: "← Back to Comments", value: "back" }]}
                    onSelect={() => setSelectedCommentKey(null)}
                  />
                </Box>
              </Box>
            </ScreenContainer>
          );
        }
      }

      if (baselineComment || currentComment) {
        const typeColor = commentType === "Kept" ? "green" : commentType === "New" ? "cyan" : "red";

        // For Kept comments, show both versions side by side
        if (commentType === "Kept" && baselineComment && currentComment) {
          return (
            <ScreenContainer title="Matched Comment (in both baseline & current)" borderColor="green" height={height}>
              <Box flexDirection="column" paddingX={1} overflowY="hidden">
                <Box marginBottom={1}>
                  <Text bold color="green">{baselineComment.header || currentComment.header || "(no header)"}</Text>
                </Box>

                <Box marginBottom={1} flexDirection="column">
                  <Text dimColor bold>BASELINE:</Text>
                  <Text color="gray" wrap="wrap">"{baselineComment.quotedText}"</Text>
                  <Text dimColor wrap="wrap">{baselineComment.description}</Text>
                </Box>

                <Box flexDirection="column">
                  <Text dimColor bold>CURRENT:</Text>
                  <Text color="yellow" wrap="wrap">"{currentComment.quotedText}"</Text>
                  <Text wrap="wrap">{currentComment.description}</Text>
                </Box>
              </Box>

              <Box marginTop={1}>
                <SelectInput
                  items={[{ label: "← Back to Comments", value: "back" }]}
                  onSelect={() => setSelectedCommentKey(null)}
                />
              </Box>
            </ScreenContainer>
          );
        }

        // For Lost comments with filter reason, show detailed view
        if (commentType === "Lost" && baselineComment && filterInfo) {
          return (
            <ScreenContainer title="Missing from Current (pipeline-filtered)" borderColor="red" height={height}>
              <Box flexDirection="column" paddingX={1} overflowY="hidden">
                <Box marginBottom={1}>
                  <Text bold color="red">{baselineComment.header || "(no header)"}</Text>
                </Box>

                <Box marginBottom={1} flexDirection="column">
                  <Text dimColor>Quoted text (from baseline):</Text>
                  <Text color="yellow" wrap="wrap">"{baselineComment.quotedText}"</Text>
                </Box>

                <Box marginBottom={1} flexDirection="column">
                  <Text dimColor>Description:</Text>
                  <Text wrap="wrap">{baselineComment.description}</Text>
                </Box>

                <Box marginTop={1} borderStyle="single" borderColor="magenta" paddingX={1} flexDirection="column">
                  <Text bold color="magenta">Filter Reason ({filterInfo.stage}):</Text>
                  <Text wrap="wrap">{filterInfo.filterReason}</Text>
                  {filterInfo.supportLocation && (
                    <Box marginTop={1}>
                      <Text dimColor>Support found at: </Text>
                      <Text color="cyan" wrap="wrap">{filterInfo.supportLocation}</Text>
                    </Box>
                  )}
                </Box>
              </Box>

              <Box marginTop={1}>
                <SelectInput
                  items={[{ label: "← Back to Comments", value: "back" }]}
                  onSelect={() => setSelectedCommentKey(null)}
                />
              </Box>
            </ScreenContainer>
          );
        }

        // For New/Lost (without filter reason), show single version with label
        const comment = currentComment || baselineComment;
        const versionLabel = commentType === "New" ? "- new vs baseline" : "- in baseline only";

        return (
          <ScreenContainer title={`${commentType} Comment ${versionLabel}`} borderColor={typeColor} height={height}>
            <Box flexDirection="column" paddingX={1} overflowY="hidden">
              <Box marginBottom={1}>
                <Text bold color={typeColor}>{comment!.header || "(no header)"}</Text>
              </Box>

              <Box marginBottom={1} flexDirection="column">
                <Text dimColor>Quoted text:</Text>
                <Text color="yellow" wrap="wrap">"{comment!.quotedText}"</Text>
              </Box>

              <Box flexDirection="column">
                <Text dimColor>Description:</Text>
                <Text wrap="wrap">{comment!.description}</Text>
              </Box>

              {commentType === "Lost" && !filterInfo && (
                <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1} flexDirection="column">
                  <Text bold color="gray">Why is this missing from the current run?</Text>
                  <Text wrap="wrap">
                    {data?.filteredItems !== undefined
                      ? "The LLM extractors did not detect this issue in the current run. This is normal variance between runs - LLMs don't always find the same issues."
                      : "No telemetry available for this run (run predates telemetry feature)."}
                  </Text>
                </Box>
              )}
            </Box>

            <Box marginTop={1}>
              <SelectInput
                items={[{ label: "← Back to Comments", value: "back" }]}
                onSelect={() => setSelectedCommentKey(null)}
              />
            </Box>
          </ScreenContainer>
        );
      }
    }
  }

  // Document comparison detail view
  if (selectedRunDetail && selectedSnapshotId) {
    const snapshot = selectedRunDetail.snapshots.find((s) => s.id === selectedSnapshotId);
    if (snapshot) {
      const data = snapshot.comparisonData as {
        matchedComments?: Array<{ baselineComment?: { quotedText: string; header: string | null }; currentComment?: { quotedText: string; header: string | null } }>;
        newComments?: Array<{ quotedText: string; header: string | null; description: string }>;
        lostComments?: Array<{ quotedText: string; header: string | null; description: string }>;
        filteredItems?: Array<{ stage: string; quotedText: string; header?: string; filterReason: string; supportLocation?: string }>;
        extractionPhase?: {
          multiExtractorEnabled: boolean;
          extractors: Array<{
            extractorId: string;
            model: string;
            temperature: number;
            temperatureConfig?: number | 'default';
            thinkingEnabled: boolean;
            issuesFound: number;
            durationMs: number;
            error?: string;
          }>;
          totalIssuesBeforeJudge: number;
          totalIssuesAfterJudge: number;
          judgeModel?: string;
          judgeDurationMs?: number;
          judgeDecisions: Array<{
            issueText: string;
            decision: 'accepted' | 'merged' | 'rejected';
            reasoning: string;
            sourceExtractors: string[];
          }>;
        };
        pipelineCounts?: {
          issuesAfterDedup: number;
          issuesAfterFiltering: number;
          commentsGenerated: number;
          commentsKept: number;
        };
      } | null;

      const matched = data?.matchedComments || [];
      const newComments = data?.newComments || [];
      const lost = data?.lostComments || [];
      const filteredItems = data?.filteredItems || [];
      const extractionPhase = data?.extractionPhase;
      const pipelineCounts = data?.pipelineCounts;

      // Helper to check if a lost comment has a filter reason
      const hasFilterReason = (lostComment: { quotedText: string; header: string | null }) => {
        if (filteredItems.length === 0) return false;
        return filteredItems.some((f) => {
          const fText = f.quotedText.toLowerCase().trim();
          const lText = lostComment.quotedText.toLowerCase().trim();
          return fText.includes(lText) || lText.includes(fText) ||
            (f.header && lostComment.header && f.header.toLowerCase() === lostComment.header.toLowerCase());
        });
      };

      // Build scrollable list of ALL comments - no truncation
      const commentItems: Array<{ label: string; value: string }> = [];

      // Add items grouped by category
      if (matched.length > 0) {
        matched.forEach((c, i) => {
          const comment = c.baselineComment || c.currentComment;
          const label = comment ? (comment.header || truncate(comment.quotedText, 50)) : "Unknown";
          commentItems.push({
            label: `= ${label}`,
            value: `kept-${i}`,
          });
        });
      }

      if (newComments.length > 0) {
        newComments.forEach((c, i) => {
          commentItems.push({
            label: `+ ${c.header || truncate(c.quotedText, 50)}`,
            value: `new-${i}`,
          });
        });
      }

      if (lost.length > 0) {
        lost.forEach((c, i) => {
          const hasReason = hasFilterReason(c);
          const suffix = hasReason ? " [filtered]" : "";
          // Use truncated quotedText for consistency with filtered items
          commentItems.push({
            label: `- ${truncate(c.quotedText, 50)}${suffix}`,
            value: `lost-${i}`,
          });
        });
      }

      // Build filtered items list separately
      const filteredItemsList: Array<{ label: string; value: string }> = [];
      if (filteredItems.length > 0) {
        filteredItemsList.push({ label: "--- Filtered by pipeline ---", value: "sep-filtered" });
        filteredItems.forEach((f, i) => {
          const stageLabel = f.stage === 'supported-elsewhere-filter' ? 'F' : f.stage === 'review' ? 'R' : '?';
          filteredItemsList.push({
            label: `[${stageLabel}] ${truncate(f.quotedText, 50)}`,
            value: `filtered-${i}`,
          });
        });
      }

      if (commentItems.length === 0) {
        commentItems.push({ label: "  No comments in this comparison", value: "empty" });
      }

      commentItems.push({ label: "  ← Back", value: "back" });

      // Count lost with filter reasons
      const lostWithReason = lost.filter((c) => hasFilterReason(c)).length;

      // Calculate totals
      const baselineTotal = matched.length + lost.length;
      const currentTotal = matched.length + newComments.length;

      // Determine if there are any differences
      const isUnchanged = lost.length === 0 && newComments.length === 0;

      return (
        <ScreenContainer title={truncate(snapshot.documentTitle, 50)} borderColor="blue" height={height}>
          <Box marginBottom={1} paddingX={1} flexDirection="column">
            {/* Summary counts */}
            <Box marginBottom={1}>
              <Text>
                <Text dimColor>Baseline: </Text>
                <Text bold>{baselineTotal} issues</Text>
                <Text dimColor> → Current run: </Text>
                <Text bold>{currentTotal} issues</Text>
              </Text>
            </Box>

            {/* Comparison: what changed between baseline and current */}
            <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1} marginBottom={1}>
              <Text bold>Comparison:</Text>
              <Text>
                <Text color="green">✓ {matched.length} issues appear in BOTH baseline and current</Text>
              </Text>
              <Text>
                <Text color="cyan">+ {newComments.length} issues are NEW (in current run, not in baseline)</Text>
              </Text>
              <Text>
                <Text color="red">− {lost.length} issues are GONE (were in baseline, not in current run)</Text>
              </Text>
            </Box>

            {/* Current run details: extraction → filter → review */}
            {(extractionPhase || pipelineCounts) && (() => {
              // Count filtered items by stage
              const supportedElsewhereCount = filteredItems.filter(f => f.stage === 'supported-elsewhere-filter').length;
              const reviewFilteredCount = filteredItems.filter(f => f.stage === 'review').length;

              // Use actual pipeline counts when available (pipelineCounts is source of truth)
              const afterDedup = pipelineCounts?.issuesAfterDedup ?? extractionPhase?.totalIssuesAfterJudge;
              const afterFilter = pipelineCounts?.issuesAfterFiltering;
              const commentsGenerated = pipelineCounts?.commentsGenerated;
              const commentsKept = pipelineCounts?.commentsKept;

              // Calculate what was filtered at each stage
              const filteredBySupported = afterDedup !== undefined && afterFilter !== undefined ? afterDedup - afterFilter : supportedElsewhereCount;
              const filteredByGeneration = afterFilter !== undefined && commentsGenerated !== undefined ? afterFilter - commentsGenerated : 0;
              const filteredByReview = commentsGenerated !== undefined && commentsKept !== undefined ? commentsGenerated - commentsKept : reviewFilteredCount;

              return (
                <Box marginBottom={1} flexDirection="column">
                  <Text bold>Current run details:</Text>
                  {extractionPhase && (
                    <>
                      <Text dimColor>
                        Extraction: {extractionPhase.extractors?.length || 0} models → {extractionPhase.totalIssuesBeforeJudge} issues → dedup → {afterDedup}
                      </Text>
                      {extractionPhase.extractors && extractionPhase.extractors.length > 0 && (
                        <Text dimColor>
                          {"  "}({extractionPhase.extractors.map(e => `${e.model.split('/').pop()}: ${e.issuesFound}`).join(', ')})
                        </Text>
                      )}
                    </>
                  )}
                  {filteredBySupported > 0 && (
                    <Text dimColor>
                      Filter: {filteredBySupported} removed (supported elsewhere) → {afterFilter}
                    </Text>
                  )}
                  {filteredByGeneration > 0 && (
                    <Text dimColor>
                      Comment gen: {filteredByGeneration} failed (empty/invalid) → {commentsGenerated}
                    </Text>
                  )}
                  {filteredByReview > 0 && (
                    <Text dimColor>
                      Review: {filteredByReview} removed (redundant/low-value) → {commentsKept}
                    </Text>
                  )}
                  <Text dimColor>
                    Result: {commentsKept ?? currentTotal} comments kept
                  </Text>
                </Box>
              );
            })()}

            {/* Simple status - no judgments, just facts */}
            {isUnchanged && (
              <Text color="green">✓ No differences</Text>
            )}
          </Box>

          <SelectInput
            items={[...filteredItemsList, ...commentItems]}
            limit={maxItems}
            onSelect={(item) => {
              if (item.value === "back") {
                setSelectedSnapshotId(null);
              } else if (item.value.startsWith("kept-") || item.value.startsWith("new-") || item.value.startsWith("lost-") || item.value.startsWith("filtered-")) {
                setSelectedCommentKey(item.value);
              }
            }}
          />

          <Box marginTop={1}>
            <Text dimColor>Enter View Comment | Escape Back to Run</Text>
          </Box>
        </ScreenContainer>
      );
    }
  }

  // Run detail view
  if (selectedRunDetail) {
    const formatChangeSummary = (s: { keptCount: number; newCount: number; lostCount: number }) => {
      const parts: string[] = [];
      if (s.keptCount > 0) parts.push(`${s.keptCount} matched`);
      if (s.newCount > 0) parts.push(`+${s.newCount} new`);
      if (s.lostCount > 0) parts.push(`-${s.lostCount} missing`);
      return parts.length > 0 ? parts.join(", ") : "no comments";
    };

    const unchangedCount = selectedRunDetail.snapshots.filter((s) => s.status === "unchanged").length;
    const changedCount = selectedRunDetail.snapshots.filter((s) => s.status === "changed").length;

    const items = [
      ...selectedRunDetail.snapshots.slice(0, maxItems - 3).map((s) => {
        const icon = s.status === "unchanged" ? "=" : "~";
        return {
          label: `[${icon}] ${truncate(s.documentTitle, 35)} | ${formatChangeSummary(s)}`,
          value: s.id,
        };
      }),
      { label: "← Back to History", value: "back" },
    ];

    return (
      <ScreenContainer title={`Run: ${selectedRunDetail.name || selectedRunDetail.id.slice(0, 8)}`} borderColor="magenta" height={height}>
        <InfoBox>
          <Text>
            <Text color="green">[=] {unchangedCount} unchanged</Text>
            {" | "}
            <Text color="yellow">[~] {changedCount} changed</Text>
            {" | "}
            Baseline: <Text color="cyan">{sanitizeName(selectedRunDetail.baseline.name)}</Text>
          </Text>
        </InfoBox>

        <SelectInput
          items={items}
          onSelect={(item) => {
            if (item.value === "back") {
              setSelectedRunDetail(null);
              setSelectedRunId(null);
            } else {
              setSelectedSnapshotId(item.value);
            }
          }}
        />

        <Box marginTop={1}>
          <Text dimColor>Enter View Comments | Escape Back to History</Text>
        </Box>
      </ScreenContainer>
    );
  }

  // History tab
  if (activeTab === "history") {
    const formatDate = (d: Date) => {
      return new Date(d).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    const items = [
      ...validationRuns.slice(0, maxItems - 3).map((r) => {
        const statusIcon = r.status === "completed"
          ? (r.changedCount === 0 ? "=" : "~")
          : r.status === "running" ? "*" : "x";

        return {
          label: `[${statusIcon}] ${formatDate(r.createdAt)} | ${r.summary || r.status}`,
          value: `view:${r.id}`,
        };
      }),
      { label: "← Back to Baselines", value: "back" },
    ];

    return (
      <ScreenContainer title="Validation - Run History" borderColor="magenta" height={height}>
        {renderTabs()}

        <InfoBox>
          <Text>
            Baseline: <Text color="cyan">{selectedBaseline ? sanitizeName(selectedBaseline.name) : "None"}</Text>
            {" | "}
            {validationRuns.length} run{validationRuns.length !== 1 ? "s" : ""}
          </Text>
        </InfoBox>

        {validationRuns.length === 0 ? (
          <Box marginY={1}>
            <Text dimColor>No runs yet. Go to Run tab to execute a validation run.</Text>
          </Box>
        ) : (
          <SelectInput
            items={items}
            onSelect={(item) => {
              if (item.value === "back") {
                setActiveTab("baselines");
              } else if (item.value.startsWith("view:")) {
                const runId = item.value.replace("view:", "");
                setSelectedRunId(runId);
                loadRunDetail(runId);
              }
            }}
          />
        )}

        <Box marginTop={1}>
          <Text dimColor>Enter View Details | Tab Switch | Escape Back</Text>
        </Box>
      </ScreenContainer>
    );
  }

  // Baselines tab (default)
  const items = [
    { label: "+ Create New Baseline", value: "create" },
    ...baselines.map((b) => ({
      label: `${selectedBaseline?.id === b.id ? "● " : "○ "}${sanitizeName(b.name)} (${b.snapshotCount} docs)`,
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
              Selected: <Text color="green">{sanitizeName(selectedBaseline.name)}</Text>
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
  filteredItems?: Array<{
    stage: string;
    quotedText: string;
    header?: string;
    filterReason: string;
    supportLocation?: string;
    originalIndex: number;
  }>;
  extractionPhase?: {
    multiExtractorEnabled: boolean;
    extractors: Array<{
      extractorId: string;
      model: string;
      temperature: number;
      temperatureConfig?: number | 'default';
      thinkingEnabled: boolean;
      issuesFound: number;
      durationMs: number;
      error?: string;
    }>;
    totalIssuesBeforeJudge: number;
    totalIssuesAfterJudge: number;
    judgeModel?: string;
    judgeDurationMs?: number;
    judgeDecisions: Array<{
      issueText: string;
      decision: 'accepted' | 'merged' | 'rejected';
      reasoning: string;
      sourceExtractors: string[];
    }>;
  };
} | null {
  if (!raw || typeof raw !== "object") return null;

  const telemetry = raw as Record<string, unknown>;
  const finalCounts = telemetry.finalCounts as Record<string, number> | undefined;

  if (!finalCounts) return null;

  // Extract filtered items if present
  const filteredItems = telemetry.filteredItems as Array<{
    stage: string;
    quotedText: string;
    header?: string;
    filterReason: string;
    supportLocation?: string;
    originalIndex: number;
  }> | undefined;

  // Extract extraction phase telemetry if present
  const extractionPhase = telemetry.extractionPhase as {
    multiExtractorEnabled: boolean;
    extractors: Array<{
      extractorId: string;
      model: string;
      temperature: number;
      temperatureConfig?: number | 'default';
      thinkingEnabled: boolean;
      issuesFound: number;
      durationMs: number;
      error?: string;
    }>;
    totalIssuesBeforeJudge: number;
    totalIssuesAfterJudge: number;
    judgeModel?: string;
    judgeDurationMs?: number;
    judgeDecisions: Array<{
      issueText: string;
      decision: 'accepted' | 'merged' | 'rejected';
      reasoning: string;
      sourceExtractors: string[];
    }>;
  } | undefined;

  return {
    totalDurationMs: (telemetry.totalDurationMs as number) || 0,
    issuesExtracted: finalCounts.issuesExtracted || 0,
    issuesAfterDedup: finalCounts.issuesAfterDedup || 0,
    issuesAfterFiltering: finalCounts.issuesAfterFiltering || 0,
    commentsGenerated: finalCounts.commentsGenerated || 0,
    commentsKept: finalCounts.commentsKept || 0,
    filteredItems,
    extractionPhase,
  };
}
