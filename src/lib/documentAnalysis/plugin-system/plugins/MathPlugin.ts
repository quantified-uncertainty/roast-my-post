/**
 * Math Verification Plugin
 * 
 * PIPELINE FLOW:
 * ==============
 * 
 * 1. EXTRACT (01_extract/)
 *    └─> Find all math expressions in text chunks
 *    └─> Output: PotentialFinding[] with math expressions
 * 
 * 2. INVESTIGATE (02_investigate/)
 *    └─> Validate each math expression
 *    └─> Add severity levels and error messages
 *    └─> Output: InvestigatedFinding[] with validation results
 * 
 * 3. LOCATE (03_locate/)
 *    └─> Find exact character positions in document
 *    └─> Use fuzzy matching for math expressions
 *    └─> Output: LocatedFinding[] with precise locations
 * 
 * 4. ANALYZE (04_analyze/)
 *    └─> Generate insights and patterns
 *    └─> Calculate error rates and summaries
 *    └─> Output: Analysis summary and statistics
 * 
 * 5. GENERATE (05_generate/)
 *    └─> Convert to UI comments with highlights
 *    └─> Output: Comment[] for display
 */

import type { Comment } from "@/types/documentSchema";

import { logger } from "../../../logger";
import { PromptBuilder } from "../builders/PromptBuilder";
import { SchemaBuilder } from "../builders/SchemaBuilder";
import { BasePlugin } from "../core/BasePlugin";
import { TextChunk } from "../TextChunk";
import {
  ChunkResult,
  GenerateCommentsContext,
  RoutingExample,
  SynthesisResult,
} from "../types";
import { createPluginError } from "../utils/findingHelpers";
// Stage-based imports - clear pipeline flow
import {
  convertToFindings,
  type MathExtractionResult,
} from "./math/01_extract";
import { investigateMathFindings } from "./math/02_investigate";
import { locateMathFindings } from "./math/03_locate";
import { analyzeMathFindings } from "./math/04_analyze";
import { generateMathCommentsWithOffsets } from "./math/05_generate";
import type { FindingStorage } from "./MathPlugin.types";

export class MathPlugin extends BasePlugin<{}> {
  // ============================================
  // PLUGIN STATE
  // ============================================
  private findings: FindingStorage = {
    potential: [],
    investigated: [],
    located: [],
    errors: [],
    summary: undefined,
    analysisSummary: undefined,
    recommendations: [],
  };

  constructor() {
    super({});
  }

  // ============================================
  // PLUGIN METADATA
  // ============================================
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

  // ============================================
  // STAGE 1: EXTRACT - Find math expressions
  // ============================================
  async extractPotentialFindings(chunk: TextChunk): Promise<void> {
    const promptBuilder = PromptBuilder.forMath();
    const { result } = await this.extractWithTool<{
      items: MathExtractionResult[];
    }>(
      chunk,
      "report_math_content",
      "Report mathematical content found in the text",
      SchemaBuilder.extraction("equation", {
        equation: {
          type: "string",
          description:
            "The mathematical expression EXACTLY as it appears in the text (preserve all spacing and formatting)",
        },
        isCorrect: {
          type: "boolean",
          description: "Whether the math is correct",
        },
        error: {
          type: "string",
          description: "Error description if incorrect",
        },
        surroundingText: {
          type: "string",
          description:
            "10-20 words of text surrounding the equation for context",
        },
      }),
      promptBuilder.buildExtractionPrompt(
        chunk,
        "For each mathematical expression found, verify if it's mathematically correct. If incorrect, explain the error."
      )
    );

    // Convert to potential findings using utility function
    const newFindings = convertToFindings(
      result.items || [],
      chunk.id,
      this.name()
    );

    // Add to our storage
    this.findings.potential.push(...newFindings);
  }

  // ============================================
  // STAGE 2: INVESTIGATE - Validate correctness
  // ============================================
  async investigateFindings(): Promise<void> {
    // Use utility function to investigate
    const investigated = investigateMathFindings(this.findings.potential);

    // Store results
    this.findings.investigated = investigated;
  }

  // ============================================
  // STAGE 3: LOCATE - Find exact positions
  // ============================================
  async locateFindings(documentText: string): Promise<void> {
    // Use utility function to locate
    const { located, dropped } = locateMathFindings(
      this.findings.investigated,
      documentText
    );

    // Store results
    this.findings.located = located;

    // Log if any were dropped
    if (dropped > 0) {
      logger.info(`MathPlugin: ${dropped} findings couldn't be located`);
    }
  }

  // ============================================
  // STAGE 4: ANALYZE - Generate insights
  // ============================================
  async analyzeFindingPatterns(): Promise<void> {
    // Use utility function to analyze
    const analysis = analyzeMathFindings(
      this.findings.potential,
      this.findings.located
    );

    // Store results
    this.findings.summary = analysis.summary;
    this.findings.analysisSummary = analysis.analysisSummary;
    this.findings.recommendations = analysis.recommendations;
  }

  // ============================================
  // STAGE 5: GENERATE - Create UI comments
  // ============================================
  getComments(documentText: string): Comment[] {
    const comments = generateMathCommentsWithOffsets(this.findings.located, documentText);
    logger.info(`MathPlugin: getComments returning ${comments.length} comments from ${this.findings.located.length} located findings`);
    return comments;
  }

  // ============================================
  // LEGACY METHODS (for BasePlugin compatibility)
  // ============================================

  /**
   * Legacy processChunk method
   */
  async processChunk(chunk: TextChunk): Promise<ChunkResult> {
    await this.extractPotentialFindings(chunk);

    return {
      findings: [], // Deprecated
      llmCalls: this.getLLMInteractions().slice(-1),
      metadata: {
        tokensUsed: this.getTotalCost(),
        processingTime: 0,
      },
    };
  }

  /**
   * Legacy synthesize method
   */
  async synthesize(): Promise<SynthesisResult> {
    // Run all stages if not already done
    await this.investigateFindings();
    
    // IMPORTANT: Must locate findings before generating comments!
    // This was missing and causing 0 comments to be generated
    if (this.findings.located.length === 0 && this.findings.investigated.length > 0) {
      // We need the document text to locate findings
      // For now, we'll skip location in synthesize and rely on generateComments
      logger.warn("MathPlugin: synthesize called but cannot locate findings without document text");
    }
    
    await this.analyzeFindingPatterns();

    return {
      summary: this.findings.summary || "",
      analysisSummary: this.findings.analysisSummary || "",
      recommendations: this.findings.recommendations || [],
      llmCalls: [],
    };
  }

  protected createInitialState(): {} {
    return {};
  }

  // ============================================
  // ORCHESTRATION METHODS
  // ============================================

  /**
   * Main entry point for comment generation
   * Ensures all stages have been run in sequence
   */
  override generateComments(context: GenerateCommentsContext): Comment[] {
    try {
      // Ensure all stages have been run
      // Stage 3: Locate findings if not already done
      if (this.findings.located.length === 0 && this.findings.investigated.length > 0) {
        logger.info("MathPlugin: Running locate stage in generateComments");
        logger.info(`MathPlugin: Have ${this.findings.investigated.length} investigated findings to locate`);
        // Run locate findings synchronously since we're already in the comment generation phase
        const locationResult = locateMathFindings(
          this.findings.investigated,
          context.documentText
        );
        this.findings.located = locationResult.located;
        logger.info(`MathPlugin: Located ${this.findings.located.length} findings (dropped ${locationResult.dropped})`);
      } else {
        logger.info(`MathPlugin: generateComments called with ${this.findings.located.length} located, ${this.findings.investigated.length} investigated findings`);
      }

      // Return comments using the utility function
      return this.getComments(context.documentText);
    } catch (error) {
      const pluginError = createPluginError("generateComments", error, {
        potentialCount: this.findings.potential.length,
      });
      this.findings.errors.push(pluginError);
      logger.error("MathPlugin: Error generating comments", error);
      return [];
    }
  }

  // ============================================
  // DEBUG & UTILITY METHODS
  // ============================================

  /**
   * Get detailed debug information about all stages
   */
  debugJson(): any {
    return {
      pluginName: this.name(),
      findings: this.findings,
      stats: {
        potentialCount: this.findings.potential.length,
        investigatedCount: this.findings.investigated.length,
        locatedCount: this.findings.located.length,
        errorCount: this.findings.errors.length,
        correctEquations: this.findings.potential.filter(
          (f) => f.type === "math_correct"
        ).length,
        mathErrors: this.findings.potential.filter(
          (f) => f.type === "math_error"
        ).length,
      },
    };
  }

  /**
   * Override clearState to also clear findings
   */
  override clearState(): void {
    super.clearState();
    this.findings = {
      potential: [],
      investigated: [],
      located: [],
      errors: [],
      summary: undefined,
      analysisSummary: undefined,
      recommendations: [],
    };
  }
}
