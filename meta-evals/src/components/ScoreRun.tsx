/**
 * Score Run Screen Component
 */

import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import Spinner from "ink-spinner";
import { metaEvaluationRepository } from "@roast/db";
import { scoreComments, type ScoringResult } from "@roast/ai/meta-eval";
import { truncate } from "./helpers";

interface CompletedRun {
  jobId: string;
  agentName: string;
  evaluationVersionId: string;
  createdAt: Date;
  runNumber: number; // 1-based index from the series
}

interface ScoreRunProps {
  seriesId: string;
  height: number;
  onBack: () => void;
}

const DEFAULT_JUDGE_MODEL = "claude-sonnet-4-20250514";

export function ScoreRun({ seriesId, height, onBack }: ScoreRunProps) {
  const [loading, setLoading] = useState(true);
  const [scoring, setScoring] = useState(false);
  const [saving, setSaving] = useState(false);
  const [runs, setRuns] = useState<CompletedRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<CompletedRun | null>(null);
  const [result, setResult] = useState<ScoringResult | null>(null);
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

  async function runScoring(run: CompletedRun) {
    setSelectedRun(run);
    setScoring(true);

    try {
      const evalVersion = await metaEvaluationRepository.getEvaluationVersionWithComments(
        run.evaluationVersionId
      );

      if (!evalVersion) {
        setScoring(false);
        return;
      }

      const scoringResult = await scoreComments({
        sourceText: documentContent,
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
        agentName: run.agentName,
      });

      setResult(scoringResult);
    } catch (error) {
      console.error("Scoring failed:", error);
    }

    setScoring(false);
  }

  async function saveResult() {
    if (!result || !selectedRun) return;

    setSaving(true);

    try {
      const dimensionsArray = Object.entries(result.dimensions).map(
        ([name, { score, explanation }]) => ({
          name,
          score,
          explanation,
        })
      );

      await metaEvaluationRepository.saveScoringResult({
        evaluationVersionId: selectedRun.evaluationVersionId,
        overallScore: result.overallScore,
        dimensions: dimensionsArray,
        reasoning: result.reasoning,
        judgeModel: DEFAULT_JUDGE_MODEL,
      });
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

  if (scoring) {
    return (
      <Box padding={1}>
        <Text>
          <Spinner type="dots" /> Scoring with AI judge...
        </Text>
      </Box>
    );
  }

  if (result && selectedRun) {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="blue" padding={1} height={height} overflow="hidden">
        <Box justifyContent="center" marginBottom={1}>
          <Text bold color="blue">
            Scoring Results: Run #{selectedRun.runNumber} {selectedRun.agentName}
          </Text>
        </Box>

        <Box borderStyle="single" borderColor="gray" marginBottom={1} paddingX={1}>
          <Text>
            <Text bold>Overall Score: </Text>
            <Text color={result.overallScore >= 70 ? "green" : result.overallScore >= 50 ? "yellow" : "red"}>
              {result.overallScore}/100
            </Text>
          </Text>
        </Box>

        <Box flexDirection="column" borderStyle="single" borderColor="gray" marginBottom={1} paddingX={1}>
          <Text bold color="gray">Dimensions:</Text>
          {Object.entries(result.dimensions).map(([name, { score }]) => (
            <Box key={name}>
              <Text>
                {name.padEnd(15)}
                <Text color={score >= 70 ? "green" : score >= 50 ? "yellow" : "red"}>
                  {score}/100
                </Text>
              </Text>
            </Box>
          ))}
        </Box>

        <Box borderStyle="single" borderColor="gray" marginBottom={1} paddingX={1}>
          <Text wrap="wrap">{truncate(result.reasoning, 250)}</Text>
        </Box>

        <SelectInput
          items={[
            { label: saving ? "Saving..." : "Save to Database", value: "save" },
            { label: "<- Back (discard)", value: "back" },
          ]}
          onSelect={async (item) => {
            if (item.value === "save" && !saving) {
              await saveResult();
            } else if (item.value === "back") {
              onBack();
            }
          }}
        />
      </Box>
    );
  }

  if (runs.length === 0) {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="blue" padding={1} height={height} overflow="hidden">
        <Box justifyContent="center" marginBottom={1}>
          <Text bold color="blue">
            Score Run
          </Text>
        </Box>
        <Box paddingX={1}>
          <Text color="yellow">
            No completed runs to score.
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
    <Box flexDirection="column" borderStyle="round" borderColor="blue" padding={1} height={height} overflow="hidden">
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color="blue">
          Score Run
        </Text>
      </Box>

      <Box borderStyle="single" borderColor="gray" marginBottom={1} paddingX={1}>
        <Text>Select a run to score:</Text>
      </Box>

      <SelectInput
        items={[
          ...runs.map((r) => ({
            label: `#${r.runNumber} ${r.agentName} (${r.createdAt.toLocaleDateString()})`,
            value: r.evaluationVersionId,
          })),
          { label: "<- Back", value: "back" },
        ]}
        onSelect={async (item) => {
          if (item.value === "back") {
            onBack();
          } else {
            const run = runs.find((r) => r.evaluationVersionId === item.value);
            if (run) {
              await runScoring(run);
            }
          }
        }}
      />

      <Box marginTop={1} justifyContent="center">
        <Text dimColor>Esc Back | q Quit</Text>
      </Box>
    </Box>
  );
}
