import { logger } from "../../utils/logger";
import type { Document } from "../../types/documents";
import type { Agent } from "../../types/agentSchema";
import type { Comment } from "../../shared/types";
import { checkJobTimeout } from "../../shared/jobContext";
import { analyzeDocumentUnified } from "./unified";
import { PluginType } from "../../analysis-plugins/types/plugin-types";
import type { TaskResult } from "./shared/types";
import { generateComprehensiveAnalysis } from "./comprehensiveAnalysis";
import { extractHighlightsFromAnalysis } from "./highlightExtraction";
import { generateSelfCritique } from "./selfCritique";

export interface AnalyzeDocumentOptions {
  targetWordCount?: number;
  targetHighlights?: number;
  jobId?: string;
  /** Profile ID for FallacyCheckPlugin configuration */
  fallacyCheckProfileId?: string;
}

export async function analyzeDocument(
  document: Document,
  agentInfo: Agent,
  targetWordCountOrOptions: number | AnalyzeDocumentOptions = 500,
  targetHighlights: number = 5,
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
  pipelineTelemetry?: Record<string, unknown>; // Pipeline telemetry from fallacy checker
}> {
  // Handle both old signature (positional args) and new signature (options object)
  let options: AnalyzeDocumentOptions;
  if (typeof targetWordCountOrOptions === 'object') {
    options = targetWordCountOrOptions;
  } else {
    options = {
      targetWordCount: targetWordCountOrOptions,
      targetHighlights,
      jobId,
    };
  }

  const effectiveJobId = options.jobId;
  const effectiveTargetHighlights = options.targetHighlights ?? 5;
  const effectiveTargetWordCount = options.targetWordCount ?? 500;
  const fallacyCheckProfileId = options.fallacyCheckProfileId;

  const logPrefix = `[Job ${effectiveJobId || 'N/A'}]`;
  logger.info(`${logPrefix} Starting document analysis for agent ${agentInfo.name}`, {
    fallacyCheckProfileId,
  });
  // Validate that all plugin IDs are valid PluginType entries
  const validPlugins = (agentInfo.pluginIds || []).filter((p): p is PluginType =>
    Object.values(PluginType).includes(p as PluginType)
  );
  
  // Log warning if any invalid plugins were filtered out
  const invalidPlugins = (agentInfo.pluginIds || []).filter(p => !validPlugins.includes(p));
  if (invalidPlugins.length > 0) {
    logger.warn(`${logPrefix} Filtered out invalid plugin IDs for agent ${agentInfo.name}: ${invalidPlugins.join(', ')}`);
  }
  
  // Decision point: Use plugins if any are configured, otherwise use LLM workflow
  if (validPlugins.length > 0) {
    // Sanitize plugin list for safe logging (limit length to prevent log injection)
    const pluginListForLog = validPlugins
      .map(String)
      .join(', ')
      .slice(0, 500);
    logger.info(`${logPrefix} Using plugin-based workflow for agent ${agentInfo.name} with plugins: ${pluginListForLog}`);

    return await analyzeDocumentUnified(document, agentInfo, {
      targetHighlights: effectiveTargetHighlights,
      jobId: effectiveJobId,
      plugins: {
        include: validPlugins
      },
      fallacyCheckProfileId,
      fallacyCheckAgentId: agentInfo.id,
    });
  } else {
    // No plugins configured - use traditional LLM-based comprehensive analysis
    logger.info(`${logPrefix} Using LLM-based workflow for agent ${agentInfo.name} (no plugins configured)`);
    
    const tasks: TaskResult[] = [];

    // Check timeout before starting
    checkJobTimeout();

    logger.info(`${logPrefix} [LLM Workflow Step 1/3] Generating comprehensive analysis...`);
    // Step 1: Generate comprehensive analysis using the agent's primaryInstructions
    const comprehensiveAnalysisResult = await generateComprehensiveAnalysis(
      document,
      agentInfo,
      effectiveTargetWordCount,
      effectiveTargetHighlights
    );
    tasks.push(comprehensiveAnalysisResult.task);

    // Check timeout before highlight extraction
    checkJobTimeout();

    logger.info(`${logPrefix} [LLM Workflow Step 2/3] Extracting highlights from analysis...`);
    // Step 2: Extract highlights from the analysis
    const highlightExtractionResult = await extractHighlightsFromAnalysis(
      document,
      agentInfo,
      comprehensiveAnalysisResult.outputs,
      effectiveTargetHighlights
    );
    tasks.push(highlightExtractionResult.task);
    
    // Step 3: Generate self-critique if configured
    let selfCritique: string | undefined;
    if (agentInfo.selfCritiqueInstructions) {
      // Check timeout before self-critique
      checkJobTimeout();

      logger.info(`${logPrefix} [LLM Workflow Step 3/3] Generating self-critique...`);
      const selfCritiqueResult = await generateSelfCritique(
        {
          analysis: comprehensiveAnalysisResult.outputs.analysis,
          summary: comprehensiveAnalysisResult.outputs.summary,
          grade: comprehensiveAnalysisResult.outputs.grade,
          highlights: highlightExtractionResult.outputs.highlights.map(h => ({
            title: h.header || "",
            text: h.description
          }))
        },
        agentInfo
      );
      tasks.push(selfCritiqueResult.task);
      selfCritique = selfCritiqueResult.outputs.selfCritique;
    }
    
    // Create job log string from all task logs
    const jobLogString = tasks
      .map(task => `[${task.name}] ${task.log}`)
      .join('\n');
    
    return {
      thinking: "", // LLM workflow doesn't generate thinking
      analysis: comprehensiveAnalysisResult.outputs.analysis,
      summary: comprehensiveAnalysisResult.outputs.summary,
      grade: comprehensiveAnalysisResult.outputs.grade,
      selfCritique,
      highlights: highlightExtractionResult.outputs.highlights,
      tasks,
      jobLogString,
      pipelineTelemetry: undefined, // LLM workflow doesn't use pipeline telemetry
    };
  }
}
