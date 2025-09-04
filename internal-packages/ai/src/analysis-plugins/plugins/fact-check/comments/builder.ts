import type { Comment, ToolChainResult } from '../../../../shared/types';
import { CommentBuilder } from '../../../utils/CommentBuilder';
import type { VerifiedFact } from '../VerifiedFact';
import {
  buildDescription,
  buildTitle,
  getLevel,
  buildObservation,
  buildSignificance,
  buildGrade
} from './markdown';

/**
 * Builds a comment from a verified fact for UI presentation.
 * This function handles the integration with CommentBuilder while
 * delegating markdown generation to pure functions.
 */
export async function buildFactComment(
  fact: VerifiedFact,
  documentText: string
): Promise<Comment | null> {
  // Use precise location when available, fallback to full claim
  const location = await fact.findPreciseLocation(documentText);
  if (!location) return null;

  // Build tool chain results
  const toolChain: ToolChainResult[] = buildToolChain(fact);

  // Get markdown content from pure functions
  const description = buildDescription(fact);
  const header = buildTitle(fact);
  const level = getLevel(fact);
  const observation = buildObservation(fact);
  const significance = buildSignificance(fact);
  const grade = buildGrade(fact);

  return CommentBuilder.build({
    plugin: "fact-check",
    location,
    chunkId: fact.getChunk().id,
    processingStartTime: fact.getProcessingStartTime(),
    toolChain,

    // Clean semantic description - includes sources if available
    description,

    // Structured content
    header,
    level,
    observation,
    significance,
    grade,
  });
}

/**
 * Build the tool chain results for a fact
 */
function buildToolChain(fact: VerifiedFact): ToolChainResult[] {
  const toolChain: ToolChainResult[] = [
    {
      toolName: "extractCheckableClaims",
      stage: "extraction",
      timestamp: new Date(fact.getProcessingStartTime() + 30).toISOString(),
      result: fact.claim,
    },
  ];

  // Add fact checking tool results if verification was done
  if (fact.factCheckerOutput) {
    toolChain.push({
      toolName: "factCheckWithPerplexity",
      stage: "verification",
      timestamp: new Date(fact.getProcessingStartTime() + 500).toISOString(),
      result: { ...fact.factCheckerOutput },
    });
  }

  if (fact.verification) {
    toolChain.push({
      toolName: "verifyClaimWithLLM",
      stage: "enhancement",
      timestamp: new Date().toISOString(),
      result: { ...fact.verification } as any,
    });
  }

  return toolChain;
}