import type { Agent } from "../../types/agentSchema";
import { logger } from "@/lib/logger";
import type { Document } from "../../types/documents";
import type { Comment } from "../../types/documentSchema";
import { extractHighlightsFromAnalysis } from "./highlightExtraction";
import { generateComprehensiveAnalysis } from "./comprehensiveAnalysis";
import { analyzeLinkDocument } from "./linkAnalysis/linkAnalysisWorkflow";
import { analyzeSpellingGrammar } from "./spellingGrammar";
import { analyzeWithMultiEpistemicEval } from "./multiEpistemicEval";
import { generateSelfCritique } from "./selfCritique";
import type { TaskResult } from "./shared/types";
import type { HeliconeSessionConfig } from "../helicone/sessions";

export async function analyzeDocument(
  document: Document,
  agentInfo: Agent,
  targetWordCount: number = 500,
  targetHighlights: number = 5,
  sessionConfig?: HeliconeSessionConfig,
  jobId?: string
): Promise<{
  thinking: string;
  analysis: string;
  summary: string;
  grade?: number;
  selfCritique?: string;
  highlights: Comment[];
  tasks: TaskResult[];
  jobLogString?: string; // Include job log string for Job.logs field
}> {
  // Choose workflow based on agent's extended capability
  if (agentInfo.extendedCapabilityId === "simple-link-verifier") {
    logger.info(`Using link analysis workflow for agent ${agentInfo.name}`);
    return await analyzeLinkDocument(document, agentInfo, targetHighlights);
  }
  
  if (agentInfo.extendedCapabilityId === "spelling-grammar") {
    logger.info(`Using spelling/grammar workflow for agent ${agentInfo.name} (parallel execution)`);
    return await analyzeSpellingGrammar(document, agentInfo, {
      targetHighlights,
      executionMode: 'parallel',
      maxConcurrency: 5,
      sessionConfig
    });
  }
  
  if (agentInfo.extendedCapabilityId === "multi-epistemic-eval") {
    logger.info(`Using multi-epistemic evaluation workflow for agent ${agentInfo.name}`);
    return await analyzeWithMultiEpistemicEval(document, agentInfo, {
      targetHighlights,
      sessionConfig,
      jobId
    });
  }

  logger.info(
    `Using comprehensive analysis workflow for agent ${agentInfo.name}`
  );

  const tasks: TaskResult[] = [];

  try {
    // Step 1: Generate comprehensive analysis (includes everything)
    logger.info(`Starting comprehensive analysis generation...`);
    const analysisResult = await generateComprehensiveAnalysis(
      document,
      agentInfo,
      targetWordCount,
      targetHighlights,
      sessionConfig
    );
    logger.info(
      `Comprehensive analysis generated, length: ${analysisResult.outputs.analysis.length}, insights: ${analysisResult.outputs.highlightInsights.length}`
    );
    tasks.push(analysisResult.task);

    // Step 2: Extract and format highlights from the analysis
    logger.info(`Extracting highlights from analysis...`);
    const highlightResult = await extractHighlightsFromAnalysis(
      document,
      agentInfo,
      analysisResult.outputs,
      targetHighlights,
      sessionConfig
    );
    logger.info(
      `Extracted ${highlightResult.outputs.highlights.length} highlights`
    );
    tasks.push(highlightResult.task);

    // Step 3: Generate self-critique if instructions are provided and randomly selected (10% chance)
    let selfCritique: string | undefined;
    if (agentInfo.selfCritiqueInstructions) {
      logger.info(`Generating self-critique...`);
      const critiqueResult = await generateSelfCritique(
        {
          summary: analysisResult.outputs.summary,
          analysis: analysisResult.outputs.analysis,
          grade: analysisResult.outputs.grade,
          highlights: highlightResult.outputs.highlights.map((c) => {
            return {
              title: c.description || c.highlight?.quotedText?.substring(0, 50) || "Highlight",
              text: c.description,
            };
          }),
        },
        agentInfo,
        sessionConfig
      );
      logger.info(`Generated self-critique`);
      selfCritique = critiqueResult.outputs.selfCritique;
      tasks.push(critiqueResult.task);
    }

    return {
      thinking: "", // Keep thinking empty when using comprehensive analysis
      analysis: analysisResult.outputs.analysis,
      summary: analysisResult.outputs.summary,
      grade: analysisResult.outputs.grade,
      selfCritique,
      highlights: highlightResult.outputs.highlights,
      tasks,
    };
  } catch (error) {
    logger.error(`Error in comprehensive analysis workflow:`, error);
    throw error;
  }
}
