/**
 * Score Run Screen Component
 */

import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import { metaEvaluationRepository } from "@roast/db";
import { scoreComments, type ScoringResult } from "@roast/ai/meta-eval";
import { truncate } from "./helpers";
import {
  LoadingSpinner,
  FullReasoningView,
  ScreenContainer,
  InfoBox,
  scoreColor,
} from "./shared";

interface CompletedRun {
  jobId: string;
  agentName: string;
  evaluationVersionId: string;
  createdAt: Date;
  runNumber: number;
  hasScore: boolean;
}

interface ScoreRunProps {
  seriesId: string;
  height: number;
  judgeModel: string;
  temperature: number;
  maxTokens: number;
  onBack: () => void;
}

export function ScoreRun({ seriesId, height, judgeModel, temperature, maxTokens, onBack }: ScoreRunProps) {
  const [loading, setLoading] = useState(true);
  const [scoring, setScoring] = useState(false);
  const [saving, setSaving] = useState(false);
  const [runs, setRuns] = useState<CompletedRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<CompletedRun | null>(null);
  const [result, setResult] = useState<ScoringResult | null>(null);
  const [documentContent, setDocumentContent] = useState<string>("");
  const [showFullReasoning, setShowFullReasoning] = useState(false);
  const [isViewingSaved, setIsViewingSaved] = useState(false);

  // Handle escape to go back
  useInput((input, key) => {
    if (key.escape) {
      onBack();
    }
  });

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
            hasScore: r.scoring !== null,
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

      const scoringResult = await scoreComments(
        {
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
        },
        { model: judgeModel, temperature, maxTokens }
      );

      setResult(scoringResult);
    } catch (error) {
      console.error("Scoring failed:", error);
    }

    setScoring(false);
  }

  async function loadSavedScore(run: CompletedRun) {
    setSelectedRun(run);
    setScoring(true);

    try {
      const saved = await metaEvaluationRepository.getScoringResult(run.evaluationVersionId);
      if (saved) {
        const dimensions: Record<string, { score: number; explanation: string }> = {};
        for (const dim of saved.dimensionScores) {
          dimensions[dim.name] = {
            score: dim.score,
            explanation: dim.explanation || "",
          };
        }
        setResult({
          overallScore: saved.overallScore!,
          dimensions,
          reasoning: saved.reasoning || "",
        });
        setIsViewingSaved(true);
      }
    } catch (error) {
      console.error("Load failed:", error);
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
        judgeModel,
      });
      setSaving(false);
      onBack();
    } catch (error) {
      console.error("Save failed:", error);
      setSaving(false);
      // Don't navigate away on error - let user retry
    }
  }

  // Loading states
  if (loading) {
    return <LoadingSpinner message="Loading completed runs..." />;
  }

  if (scoring) {
    return <LoadingSpinner message="Scoring with AI judge..." />;
  }

  // Results view
  if (result && selectedRun) {
    if (showFullReasoning) {
      return (
        <FullReasoningView
          reasoning={result.reasoning}
          borderColor="blue"
          height={height}
          onBack={() => setShowFullReasoning(false)}
        />
      );
    }

    const menuItems = isViewingSaved
      ? [
          { label: "View Full Reasoning", value: "reasoning" },
          { label: "Re-score (run again)", value: "rescore" },
          { label: "<- Back to List", value: "list" },
        ]
      : [
          { label: "View Full Reasoning", value: "reasoning" },
          { label: saving ? "Saving..." : "Save to Database", value: "save" },
          { label: "<- Back (discard)", value: "back" },
        ];

    return (
      <ScreenContainer
        title={`${isViewingSaved ? "Saved " : ""}Scoring Results: Run #${selectedRun.runNumber} ${selectedRun.agentName}`}
        borderColor="blue"
        height={height}
      >
        <InfoBox>
          <Text>
            <Text bold>Overall Score: </Text>
            <Text color={scoreColor(result.overallScore)}>
              {result.overallScore}/10
            </Text>
          </Text>
        </InfoBox>

        <Box flexDirection="column" borderStyle="single" borderColor="gray" marginBottom={1} paddingX={1}>
          <Text bold color="gray">Dimensions:</Text>
          {Object.entries(result.dimensions).map(([name, { score }]) => (
            <Box key={name}>
              <Text>
                {name.padEnd(15)}
                <Text color={scoreColor(score)}>
                  {score}/10
                </Text>
              </Text>
            </Box>
          ))}
        </Box>

        <InfoBox>
          <Text wrap="wrap">{truncate(result.reasoning, 250)}</Text>
        </InfoBox>

        <SelectInput
          items={menuItems}
          onSelect={async (item) => {
            if (item.value === "reasoning") {
              setShowFullReasoning(true);
            } else if (item.value === "save" && !saving) {
              await saveResult();
            } else if (item.value === "rescore") {
              setIsViewingSaved(false);
              setResult(null);
              await runScoring(selectedRun);
            } else if (item.value === "list") {
              setResult(null);
              setSelectedRun(null);
              setIsViewingSaved(false);
            } else if (item.value === "back") {
              onBack();
            }
          }}
        />
      </ScreenContainer>
    );
  }

  // Empty state
  if (runs.length === 0) {
    return (
      <ScreenContainer title="Score Run" borderColor="blue" height={height}>
        <Box paddingX={1}>
          <Text color="yellow">No completed runs to score.</Text>
        </Box>
        <SelectInput
          items={[{ label: "<- Back", value: "back" }]}
          onSelect={() => onBack()}
        />
      </ScreenContainer>
    );
  }

  // Run selection
  return (
    <ScreenContainer
      title="Score Run"
      borderColor="blue"
      height={height}
      footer="Esc Back | q Quit"
    >
      <InfoBox>
        <Text>Select a run to score or view:</Text>
      </InfoBox>

      <SelectInput
        items={[
          ...runs.map((r) => ({
            label: `${r.hasScore ? "[scored]" : "[    ]"} #${r.runNumber} ${r.agentName} (${r.createdAt.toLocaleDateString()})`,
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
              if (run.hasScore) {
                await loadSavedScore(run);
              } else {
                setIsViewingSaved(false);
                await runScoring(run);
              }
            }
          }
        }}
      />
    </ScreenContainer>
  );
}
