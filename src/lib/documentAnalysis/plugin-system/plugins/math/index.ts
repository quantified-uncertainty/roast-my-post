/**
 * Math Verification Plugin
 * 
 * Analyzes mathematical expressions in documents and identifies errors.
 * All logic is self-contained for easy understanding and maintenance.
 */

import type { Comment } from "@/types/documentSchema";

import { logger } from "../../../../logger";
import { BasePlugin } from "../../core/BasePlugin";
import { TextChunk } from "../../TextChunk";
import {
  RoutingExample,
  SimpleAnalysisPlugin,
  AnalysisResult,
  LLMInteraction,
} from "../../types";
import { extractWithTool, type ExtractionConfig } from "../../utils/extractionHelper";
import {
  MathHelpers,
  locateFindings,
  generateCommentsFromFindings,
  type GenericPotentialFinding,
  type GenericInvestigatedFinding,
  type GenericLocatedFinding,
} from "../../utils/pluginHelpers";
import { generateFindingId } from "../../utils/findingHelpers";
import { getMathExtractionConfig, type MathExtractionResult, type MathFindingStorage } from "./types";
import { MathPromptBuilder } from "./promptBuilder";

export class MathPlugin extends BasePlugin<{}> implements SimpleAnalysisPlugin {
  private findings: MathFindingStorage = {
    potential: [],
    investigated: [],
    located: [],
  };
  private analysisInteractions: LLMInteraction[] = [];

  constructor() {
    super({});
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

  /**
   * Main analysis method - processes all chunks and returns complete results
   */
  async analyze(chunks: TextChunk[], documentText: string): Promise<AnalysisResult> {
    // Clear any previous state
    this.clearState();
    
    // Stage 1: Extract from all chunks
    for (const chunk of chunks) {
      await this.extractPotentialFindings(chunk);
    }
    
    // Stage 2: Investigate findings
    this.investigateFindings();
    
    // Stage 3: Locate findings in document
    this.locateFindings(documentText);
    
    // Stage 4: Analyze patterns
    this.analyzeFindingPatterns();
    
    // Stage 5: Generate comments
    const comments = this.getComments(documentText);
    
    return {
      summary: this.findings.summary || "",
      analysis: this.findings.analysisSummary || "",
      comments,
      llmInteractions: this.analysisInteractions,
      cost: this.getTotalCost()
    };
  }

  getCost(): number {
    return this.getTotalCost();
  }

  /**
   * Get debug information for testing and introspection
   */
  getDebugInfo() {
    return {
      findings: this.findings,
      stats: {
        potentialCount: this.findings.potential.length,
        investigatedCount: this.findings.investigated.length,
        locatedCount: this.findings.located.length,
        correctEquations: this.findings.potential.filter(
          (f) => f.type === "math_correct"
        ).length,
        mathErrors: this.findings.potential.filter(
          (f) => f.type === "math_error"
        ).length,
      },
      stageResults: {
        extracted: this.findings.potential,
        investigated: this.findings.investigated,
        located: this.findings.located,
        analysis: {
          summary: this.findings.summary,
          analysisSummary: this.findings.analysisSummary
        }
      }
    };
  }

  /**
   * Extract math findings from a text chunk
   */
  private async extractPotentialFindings(chunk: TextChunk): Promise<void> {
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
    
    // Track the interaction and cost
    this.analysisInteractions.push(extraction.interaction);
    this.totalCost += extraction.cost;

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
  private investigateFindings(): void {
    this.findings.investigated = MathHelpers.investigateMathFindings(this.findings.potential);
  }

  /**
   * Locate findings in document text
   */
  private locateFindings(documentText: string): void {
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
  private analyzeFindingPatterns(): void {
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
  private getComments(documentText: string): Comment[] {
    const comments = generateCommentsFromFindings(this.findings.located, documentText);
    logger.info(`MathPlugin: Generated ${comments.length} comments from ${this.findings.located.length} located findings`);
    return comments;
  }



  protected createInitialState(): {} {
    return {};
  }

  // Required by BasePlugin but not used in new API - kept for backwards compatibility
  async processChunk(): Promise<any> {
    throw new Error("Use analyze() method instead of processChunk()");
  }

  async synthesize(): Promise<any> {
    throw new Error("Use analyze() method instead of synthesize()");
  }



  override clearState(): void {
    super.clearState();
    this.findings = {
      potential: [],
      investigated: [],
      located: [],
    };
    this.analysisInteractions = [];
  }
}
