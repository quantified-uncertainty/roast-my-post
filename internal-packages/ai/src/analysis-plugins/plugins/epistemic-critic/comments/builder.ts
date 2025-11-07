import type { Comment, ToolChainResult } from "../../../../shared/types";
import type { ToolContext } from "../../../../tools/base/Tool";
import { CommentBuilder } from "../../../utils/CommentBuilder";
import type { EpistemicIssue } from "../EpistemicIssue";
import {
  buildDescription,
  buildTitle,
  getLevel,
  buildObservation,
  buildSignificance,
  getImportance,
} from "./markdown";

/**
 * Builds a comment from an epistemic issue for UI presentation.
 * This function handles the integration with CommentBuilder while
 * delegating markdown generation to pure functions.
 */
export async function buildEpistemicComment(
  issue: EpistemicIssue,
  documentText: string,
  context: ToolContext
): Promise<Comment | null> {
  // Find precise location in document
  const location = await issue.findLocation(documentText, context);
  if (!location) return null;

  // Build tool chain results
  const toolChain: ToolChainResult[] = buildToolChain(issue);

  // Get markdown content from pure functions
  const description = buildDescription(issue);
  const header = buildTitle(issue);
  const level = getLevel(issue);
  const observation = buildObservation(issue);
  const significance = buildSignificance(issue);
  const importance = getImportance(issue);

  return CommentBuilder.build({
    plugin: "epistemic-critic",
    location,
    chunkId: issue.getChunk().id,
    processingStartTime: issue.getProcessingStartTime(),
    toolChain,

    // Clean semantic description - includes research if available
    description,

    // Structured content
    header,
    level,
    observation,
    significance,
    importance,
  });
}

/**
 * Build the tool chain results for an epistemic issue
 */
function buildToolChain(issue: EpistemicIssue): ToolChainResult[] {
  const toolChain: ToolChainResult[] = [
    {
      toolName: "extractEpistemicIssues",
      stage: "extraction",
      timestamp: new Date(issue.getProcessingStartTime() + 30).toISOString(),
      result: issue.issue,
    },
  ];

  // Add research tool results if research was done
  if (issue.hasResearch() && issue.researchFindings) {
    toolChain.push({
      toolName: "perplexityResearch",
      stage: "verification",
      timestamp: new Date(issue.getProcessingStartTime() + 500).toISOString(),
      result: issue.researchFindings,
    });
  }

  return toolChain;
}
