import { logger } from "../../utils/logger";
import type { Document } from "../../types/documents";
import type { Agent } from "../../types/agentSchema";
import type { Comment } from "../../shared/types";
import { analyzeDocumentUnified } from "./unified";
import { PluginType } from "../../analysis-plugins/types/plugin-types";
import type { TaskResult } from "./shared/types";
import { generateComprehensiveAnalysis } from "./comprehensiveAnalysis";
import { extractHighlightsFromAnalysis } from "./highlightExtraction";
import { generateSelfCritique } from "./selfCritique";

export async function analyzeDocument(
  document: Document,
  agentInfo: Agent,
  targetWordCount: number = 500,
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
}> {
  // Validate that all plugin IDs are valid PluginType entries
  const validPlugins = (agentInfo.pluginIds || []).filter((p): p is PluginType =>
    Object.values(PluginType).includes(p as PluginType)
  );
  
  // Log warning if any invalid plugins were filtered out
  const invalidPlugins = (agentInfo.pluginIds || []).filter(p => !validPlugins.includes(p));
  if (invalidPlugins.length > 0) {
    logger.warn(`Filtered out invalid plugin IDs for agent ${agentInfo.name}: ${invalidPlugins.join(', ')}`);
  }
  
  // Decision point: Use plugins if any are configured, otherwise use LLM workflow
  if (validPlugins.length > 0) {
    // Sanitize plugin list for safe logging (limit length to prevent log injection)
    const pluginListForLog = validPlugins
      .map(String)
      .join(', ')
      .slice(0, 500);
    logger.info(`Using plugin-based workflow for agent ${agentInfo.name} with plugins: ${pluginListForLog}`);
    
    return await analyzeDocumentUnified(document, agentInfo, {
      targetHighlights,
      jobId,
      plugins: {
        include: validPlugins
      }
    });
  } else {
    // No plugins configured - use traditional LLM-based comprehensive analysis
    logger.info(`Using LLM-based workflow for agent ${agentInfo.name} (no plugins configured)`);
    
    const tasks: TaskResult[] = [];
    
    // Step 1: Generate comprehensive analysis using the agent's primaryInstructions
    const comprehensiveAnalysisResult = await generateComprehensiveAnalysis(
      document,
      agentInfo,
      targetWordCount,
      targetHighlights
    );
    tasks.push(comprehensiveAnalysisResult.task);
    
    // Step 2: Extract highlights from the analysis
    const highlightExtractionResult = await extractHighlightsFromAnalysis(
      document,
      agentInfo,
      comprehensiveAnalysisResult.outputs,
      targetHighlights
    );
    tasks.push(highlightExtractionResult.task);
    
    // Step 3: Generate self-critique if configured
    let selfCritique: string | undefined;
    if (agentInfo.selfCritiqueInstructions) {
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
      jobLogString
    };
  }
}
