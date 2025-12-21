/**
 * Rank Runs Screen Component
 */

import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import Spinner from "ink-spinner";
import { metaEvaluationRepository } from "@roast/db";
import { rankVersions, type RankingCandidate, type RankingResult } from "@roast/ai/meta-eval";
import { truncate } from "./helpers";

interface CompletedRun {
  jobId: string;
  agentName: string;
  evaluationVersionId: string;
  createdAt: Date;
  runNumber: number; // 1-based index from the series
}

interface DisplayResult {
  versionId: string;
  rank: number;
  agentName: string;
  relativeScore: number;
  runNumber: number;
}

interface RankingResults {
  rankings: DisplayResult[];
  reasoning: string;
  sessionId: string;
}

interface RankRunsProps {
  seriesId: string;
  height: number;
  onBack: () => void;
}

const DEFAULT_JUDGE_MODEL = "claude-sonnet-4-20250514";

export function RankRuns({ seriesId, height, onBack }: RankRunsProps) {
  const [loading, setLoading] = useState(true);
  const [ranking, setRanking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [runs, setRuns] = useState<CompletedRun[]>([]);
  const [selectedRuns, setSelectedRuns] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<RankingResults | null>(null);
  const [documentContent, setDocumentContent] = useState<string>("");
  const [showFullReasoning, setShowFullReasoning] = useState(false);

  useEffect(() => {
    loadCompletedRuns();
  }, [seriesId]);

  async function loadCompletedRuns() {
    try {
      const detail = await metaEvaluationRepository.getSeriesDetail(seriesId);
      if (detail) {
        setDocumentContent(detail.documentContent);
        const completed = detail.runs
          .map((r, index) => ({ ...r, runNumber: index + 1 }))
          .filter((r) => r.status === "COMPLETED" && r.evaluationVersionId)
          .map((r) => ({
            jobId: r.jobId,
            agentName: r.agentName,
            evaluationVersionId: r.evaluationVersionId!,
            createdAt: r.createdAt,
            runNumber: r.runNumber,
          }));
        setRuns(completed);
      }
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  }

  async function runRanking() {
    if (selectedRuns.size < 2) return;

    setRanking(true);

    try {
      const selectedRunsList = runs.filter((r) =>
        selectedRuns.has(r.evaluationVersionId)
      );

      // Get comments for each selected run
      const candidates: RankingCandidate[] = [];
      for (const run of selectedRunsList) {
        const evalVersion = await metaEvaluationRepository.getEvaluationVersionWithComments(
          run.evaluationVersionId
        );
        if (evalVersion) {
          candidates.push({
            versionId: run.evaluationVersionId,
            agentName: run.agentName,
            comments: evalVersion.comments.map((c) => ({
              header: c.header || undefined,
              level: (c.level as "error" | "warning" | "nitpick" | "info" | "success" | "debug" | undefined) || undefined,
              description: c.description,
              highlight: {
                quotedText: c.highlight.quotedText,
                startOffset: 0,
                endOffset: c.highlight.quotedText.length,
                isValid: true,
              },
            })),
          });
        }
      }

      if (candidates.length < 2) {
        setRanking(false);
        return;
      }

      const result: RankingResult = await rankVersions({
        sourceText: documentContent,
        candidates,
      });

      // Generate a session ID for this ranking
      const sessionId = `rank-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      // Map results with agent names and run numbers
      const displayResults: DisplayResult[] = result.rankings.map((r) => {
        const run = selectedRunsList.find((sr) => sr.evaluationVersionId === r.versionId);
        return {
          versionId: r.versionId,
          rank: r.rank,
          agentName: run?.agentName || "Unknown",
          relativeScore: r.relativeScore,
          runNumber: run?.runNumber || 0,
        };
      });

      setResults({
        rankings: displayResults,
        reasoning: result.reasoning,
        sessionId,
      });
    } catch (error) {
      console.error("Ranking failed:", error);
    }

    setRanking(false);
  }

  async function saveResults() {
    if (!results) return;

    setSaving(true);

    try {
      // Save each ranking result
      for (const ranking of results.rankings) {
        await metaEvaluationRepository.saveRankingResult({
          evaluationVersionId: ranking.versionId,
          rankingSessionId: results.sessionId,
          rank: ranking.rank,
          relativeScore: ranking.relativeScore,
          reasoning: results.reasoning,
          judgeModel: DEFAULT_JUDGE_MODEL,
        });
      }
    } catch (error) {
      console.error("Save failed:", error);
    }

    setSaving(false);
    onBack();
  }

  if (loading) {
    return (
      <Box padding={1}>
        <Text>
          <Spinner type="dots" /> Loading completed runs...
        </Text>
      </Box>
    );
  }

  if (ranking) {
    return (
      <Box padding={1}>
        <Text>
          <Spinner type="dots" /> Ranking with AI judge...
        </Text>
      </Box>
    );
  }

  if (results) {
    // Full reasoning view
    if (showFullReasoning) {
      return (
        <Box flexDirection="column" borderStyle="round" borderColor="magenta" padding={1} height={height} overflow="hidden">
          <Box justifyContent="center" marginBottom={1}>
            <Text bold color="magenta">
              Full Reasoning
            </Text>
          </Box>

          <Box flexDirection="column" borderStyle="single" borderColor="gray" marginBottom={1} paddingX={1} flexGrow={1}>
            <Text wrap="wrap">{results.reasoning}</Text>
          </Box>

          <SelectInput
            items={[{ label: "<- Back to Results", value: "back" }]}
            onSelect={() => setShowFullReasoning(false)}
          />
        </Box>
      );
    }

    return (
      <Box flexDirection="column" borderStyle="round" borderColor="magenta" padding={1} height={height} overflow="hidden">
        <Box justifyContent="center" marginBottom={1}>
          <Text bold color="magenta">
            Ranking Results
          </Text>
        </Box>

        <Box flexDirection="column" borderStyle="single" borderColor="gray" marginBottom={1} paddingX={1}>
          {results.rankings.map((r) => (
            <Box key={r.versionId}>
              <Text>
                <Text color={r.rank === 1 ? "green" : "yellow"}>#{r.rank}</Text>
                {" "}Run #{r.runNumber} {r.agentName}
                <Text dimColor> (score: {r.relativeScore})</Text>
              </Text>
            </Box>
          ))}
        </Box>

        <Box borderStyle="single" borderColor="gray" marginBottom={1} paddingX={1}>
          <Text wrap="wrap">{truncate(results.reasoning, 300)}</Text>
        </Box>

        <SelectInput
          items={[
            { label: "View Full Reasoning", value: "reasoning" },
            { label: saving ? "Saving..." : "Save to Database", value: "save" },
            { label: "<- Back (discard)", value: "back" },
          ]}
          onSelect={async (item) => {
            if (item.value === "reasoning") {
              setShowFullReasoning(true);
            } else if (item.value === "save" && !saving) {
              await saveResults();
            } else if (item.value === "back") {
              onBack();
            }
          }}
        />
      </Box>
    );
  }

  if (runs.length < 2) {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="magenta" padding={1} height={height} overflow="hidden">
        <Box justifyContent="center" marginBottom={1}>
          <Text bold color="magenta">
            Rank Runs
          </Text>
        </Box>
        <Box paddingX={1}>
          <Text color="yellow">
            Need at least 2 completed runs to rank. Currently have {runs.length}.
          </Text>
        </Box>
        <SelectInput
          items={[{ label: "<- Back", value: "back" }]}
          onSelect={() => onBack()}
        />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="magenta" padding={1} height={height} overflow="hidden">
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color="magenta">
          Rank Runs
        </Text>
      </Box>

      <Box borderStyle="single" borderColor="gray" marginBottom={1} paddingX={1}>
        <Text>Select runs to rank (Enter to toggle, {selectedRuns.size} selected)</Text>
      </Box>

      <SelectInput
        items={[
          ...runs.map((r) => ({
            label: `${selectedRuns.has(r.evaluationVersionId) ? "[x]" : "[ ]"} #${r.runNumber} ${r.agentName} (${r.createdAt.toLocaleDateString()})`,
            value: r.evaluationVersionId,
          })),
          ...(selectedRuns.size >= 2
            ? [{ label: "-> Run Ranking", value: "rank" }]
            : []),
          { label: "<- Back", value: "back" },
        ]}
        onSelect={async (item) => {
          if (item.value === "back") {
            onBack();
          } else if (item.value === "rank") {
            await runRanking();
          } else {
            setSelectedRuns((prev) => {
              const next = new Set(prev);
              if (next.has(item.value)) {
                next.delete(item.value);
              } else {
                next.add(item.value);
              }
              return next;
            });
          }
        }}
      />

      <Box marginTop={1} justifyContent="center">
        <Text dimColor>Esc Back | q Quit</Text>
      </Box>
    </Box>
  );
}
