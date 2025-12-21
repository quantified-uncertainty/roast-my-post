/**
 * Compare Runs Screen Component
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
}

interface DisplayResult {
  versionId: string;
  rank: number;
  agentName: string;
  relativeScore: number;
}

interface CompareResults {
  rankings: DisplayResult[];
  reasoning: string;
}

interface CompareRunsProps {
  seriesId: string;
  height: number;
  onBack: () => void;
}

export function CompareRuns({ seriesId, height, onBack }: CompareRunsProps) {
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [runs, setRuns] = useState<CompletedRun[]>([]);
  const [selectedRuns, setSelectedRuns] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<CompareResults | null>(null);
  const [documentContent, setDocumentContent] = useState<string>("");

  useEffect(() => {
    loadCompletedRuns();
  }, [seriesId]);

  async function loadCompletedRuns() {
    try {
      const detail = await metaEvaluationRepository.getSeriesDetail(seriesId);
      if (detail) {
        setDocumentContent(detail.documentContent);
        const completed = detail.runs
          .filter((r) => r.status === "COMPLETED" && r.evaluationVersionId)
          .map((r) => ({
            jobId: r.jobId,
            agentName: r.agentName,
            evaluationVersionId: r.evaluationVersionId!,
            createdAt: r.createdAt,
          }));
        setRuns(completed);
      }
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  }

  async function runComparison() {
    if (selectedRuns.size < 2) return;

    setComparing(true);

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
        setComparing(false);
        return;
      }

      const result: RankingResult = await rankVersions({
        sourceText: documentContent,
        candidates,
      });

      // Map results with agent names
      const displayResults: DisplayResult[] = result.rankings.map((r) => {
        const candidate = candidates.find((c) => c.versionId === r.versionId);
        return {
          versionId: r.versionId,
          rank: r.rank,
          agentName: candidate?.agentName || "Unknown",
          relativeScore: r.relativeScore,
        };
      });

      setResults({
        rankings: displayResults,
        reasoning: result.reasoning,
      });
    } catch (error) {
      console.error("Comparison failed:", error);
    }

    setComparing(false);
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

  if (comparing) {
    return (
      <Box padding={1}>
        <Text>
          <Spinner type="dots" /> Running comparison with AI judge...
        </Text>
      </Box>
    );
  }

  if (results) {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="magenta" padding={1} height={height} overflow="hidden">
        <Box justifyContent="center" marginBottom={1}>
          <Text bold color="magenta">
            Comparison Results
          </Text>
        </Box>

        <Box flexDirection="column" borderStyle="single" borderColor="gray" marginBottom={1} paddingX={1}>
          {results.rankings.map((r) => (
            <Box key={r.versionId}>
              <Text>
                <Text color={r.rank === 1 ? "green" : "yellow"}>#{r.rank}</Text>
                {" "}{r.agentName}
                <Text dimColor> (score: {r.relativeScore})</Text>
              </Text>
            </Box>
          ))}
        </Box>

        <Box borderStyle="single" borderColor="gray" marginBottom={1} paddingX={1}>
          <Text wrap="wrap">{truncate(results.reasoning, 300)}</Text>
        </Box>

        <SelectInput
          items={[{ label: "<- Back to Series", value: "back" }]}
          onSelect={() => onBack()}
        />
      </Box>
    );
  }

  if (runs.length < 2) {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="magenta" padding={1} height={height} overflow="hidden">
        <Box justifyContent="center" marginBottom={1}>
          <Text bold color="magenta">
            Compare Runs
          </Text>
        </Box>
        <Box paddingX={1}>
          <Text color="yellow">
            Need at least 2 completed runs to compare. Currently have {runs.length}.
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
          Compare Runs
        </Text>
      </Box>

      <Box borderStyle="single" borderColor="gray" marginBottom={1} paddingX={1}>
        <Text>Select runs to compare (Enter to toggle, {selectedRuns.size} selected)</Text>
      </Box>

      <SelectInput
        items={[
          ...runs.map((r) => ({
            label: `${selectedRuns.has(r.evaluationVersionId) ? "[x]" : "[ ]"} ${r.agentName} (${r.createdAt.toLocaleDateString()})`,
            value: r.evaluationVersionId,
          })),
          ...(selectedRuns.size >= 2
            ? [{ label: "-> Run Comparison", value: "compare" }]
            : []),
          { label: "<- Back", value: "back" },
        ]}
        onSelect={async (item) => {
          if (item.value === "back") {
            onBack();
          } else if (item.value === "compare") {
            await runComparison();
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
