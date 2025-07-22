/**
 * Math Verification Plugin
 * 
 * Analyzes mathematical expressions in documents and identifies errors.
 * All logic is self-contained for easy understanding and maintenance.
 */

import type { Comment } from "@/types/documentSchema";

import { logger } from "../../../../logger";
import { PipelinePlugin } from "../../core/PipelinePlugin";
import { TextChunk } from "../../TextChunk";
import {
  RoutingExample,
} from "../../types";
import { extractWithTool } from "../../utils/extractionHelper";
import {
  MathHelpers,
  locateFindings,
  generateCommentsFromFindings,
} from "../../utils/pluginHelpers";
import { getMathExtractionConfig, type MathExtractionResult, type MathFindingStorage } from "./types";
import { MathPromptBuilder } from "./promptBuilder";

export class MathPlugin extends PipelinePlugin<MathFindingStorage> {
  constructor() {
    super();
  }

  name(): string {
    return "MATH";
  }

  promptForWhenToUse(): string {
    return `Call this when there is math of any kind. This includes:
- Equations and formulas (2+2=4, E=mc², etc.)
- Statistical calculations or percentages
- Back-of-the-envelope calculations
- Mathematical reasoning or proofs
- Numerical comparisons (X is 3x larger than Y)
- Unit conversions
- Any discussion involving mathematical relationships`;
  }

  override routingExamples(): RoutingExample[] {
    return [
      {
        chunkText:
          "The population grew by 15% over the last decade, from 1.2M to 1.38M",
        shouldProcess: true,
        reason: "Contains percentage calculation that should be verified",
      },
      {
        chunkText: "Mathematics has been called the language of the universe",
        shouldProcess: false,
        reason: "Discusses math conceptually but contains no actual math",
      },
      {
        chunkText:
          "If we assume a 7% annual return, $10,000 invested today would be worth $19,672 in 10 years",
        shouldProcess: true,
        reason: "Contains compound interest calculation",
      },
    ];
  }

  protected createInitialFindingStorage(): MathFindingStorage {
    return {
      potential: [],
      investigated: [],
      located: [],
    };
  }

  /**
   * Extract math findings from a text chunk
   */
  protected async extractFromChunk(chunk: TextChunk): Promise<void> {
    const promptBuilder = new MathPromptBuilder();
    
    const extraction = await extractWithTool<{
      items: MathExtractionResult[];
    }>(chunk, {
      ...getMathExtractionConfig(this.name()),
      extractionPrompt: promptBuilder.buildExtractionPrompt(
        chunk,
        "For each mathematical expression found, verify if it's mathematically correct. If incorrect, explain the error."
      )
    });
    
    // Track the interaction and cost using parent method
    if (extraction.interaction) {
      this.analysisInteractions.push(extraction.interaction);
    }
    if (extraction.cost) {
      this.totalCost += extraction.cost;
    }

    const newFindings = MathHelpers.convertMathResults(
      extraction.result.items || [],
      chunk.id,
      this.name()
    );

    // Add to our storage
    this.findings.potential.push(...newFindings);
  }

  /**
   * Investigate findings and add severity/messages
   */
  protected investigateFindings(): void {
    this.findings.investigated = MathHelpers.investigateMathFindings(this.findings.potential);
  }

  /**
   * Locate findings in document text
   */
  protected locateFindings(documentText: string): void {
    const { located, dropped } = locateFindings(
      this.findings.investigated,
      documentText,
      { mathSpecific: true, fallbackToContext: true }
    );

    this.findings.located = located;

    if (dropped > 0) {
      logger.info(`MathPlugin: ${dropped} findings couldn't be located`);
    }
  }

  /**
   * Analyze findings and generate summary
   */
  protected analyzeFindingPatterns(): void {
    const analysis = MathHelpers.analyzeMathFindings(
      this.findings.potential,
      this.findings.located
    );

    this.findings.summary = analysis.summary;
    this.findings.analysisSummary = analysis.analysisSummary;
  }

  /**
   * Generate UI comments from located findings
   */
  protected generateCommentsFromFindings(documentText: string): Comment[] {
    const comments = generateCommentsFromFindings(this.findings.located, documentText);
    logger.info(`MathPlugin: Generated ${comments.length} comments from ${this.findings.located.length} located findings`);
    return comments;
  }

}
