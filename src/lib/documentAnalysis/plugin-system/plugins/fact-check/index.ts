/**
 * Fact Check Plugin - Refactored version using new plugin architecture
 * Extracts and verifies factual claims, detects contradictions
 */

import { logger } from "../../../../logger";
import { BasePlugin } from "../../core/BasePlugin";
import { TextChunk } from "../../TextChunk";
import {
  SimpleAnalysisPlugin,
  AnalysisResult,
  RoutingExample,
  LLMInteraction,
} from "../../types";
import type { Comment } from "@/types/documentSchema";
import { extractWithTool } from "../../utils/extractionHelper";
import { 
  locateFindings, 
  generateCommentsFromFindings,
  GenericPotentialFinding,
  GenericInvestigatedFinding,
  GenericLocatedFinding
} from "../../utils/pluginHelpers";
import {
  FactCheckFindingStorage,
  FactExtractionResult,
  ContradictionResult,
  VerificationResult,
  getFactExtractionConfig,
  getContradictionDetectionConfig,
  getFactVerificationConfig,
} from "./types";
import { FactCheckPromptBuilder } from "./promptBuilder";
import { findFactLocation } from "./locationFinder";
import {
  convertFactResults,
  convertContradictions,
  investigateFactFindings,
  analyzeFactFindings,
  prioritizeClaimsForVerification,
} from "./analysisHelpers";

export class FactCheckPlugin extends BasePlugin<{}> implements SimpleAnalysisPlugin {
  private findings: FactCheckFindingStorage = {
    potential: [],
    investigated: [],
    located: [],
    contradictions: [],
    verifications: [],
  };
  private promptBuilder = new FactCheckPromptBuilder();
  private cost = 0;
  private analysisInteractions: LLMInteraction[] = [];

  constructor() {
    super({});
  }

  override name(): string {
    return "FACT_CHECK";
  }

  override promptForWhenToUse(): string {
    return `Call this when there are factual claims that could be verified. This includes:
- Specific statistics or data points (GDP was $21T in 2023)
- Historical facts (The Berlin Wall fell in 1989)
- Scientific claims (Water boils at 100°C at sea level)
- Claims about current events or recent developments
- Statements about organizations, people, or places
- Any claim presented as objective fact
Do NOT call for: opinions, predictions, hypotheticals, or general statements`;
  }

  override routingExamples(): RoutingExample[] {
    return [
      {
        chunkText: "The unemployment rate in the US was 3.7% in December 2023",
        shouldProcess: true,
        reason: "Contains specific statistical claim that can be verified",
      },
      {
        chunkText: "I believe the economy will improve next year",
        shouldProcess: false,
        reason: "Opinion/prediction, not a verifiable fact",
      },
      {
        chunkText: "Apple Inc. was founded in 1976 by Steve Jobs and Steve Wozniak",
        shouldProcess: true,
        reason: "Historical fact that can be verified",
      },
    ];
  }

  /**
   * Main analysis method - implements 5-stage pipeline
   */
  async analyze(chunks: TextChunk[], documentText: string): Promise<AnalysisResult> {
    logger.info(`[FactCheckPlugin] Starting analysis of ${chunks.length} chunks`);
    
    try {
      // Stage 1: Extract factual claims from all chunks
      await this.extractFactualClaims(chunks);
      logger.info(`[FactCheckPlugin] Stage 1: Extracted ${this.findings.potential.length} claims`);

      // Stage 2: Detect contradictions between claims
      await this.detectContradictions();
      logger.info(`[FactCheckPlugin] Stage 2: Found ${this.findings.contradictions.length} contradictions`);

      // Stage 3: Verify high-priority claims
      await this.verifyFactualClaims();
      logger.info(`[FactCheckPlugin] Stage 3: Verified ${this.findings.verifications.length} claims`);

      // Stage 4: Locate findings in document
      this.locateFactsInDocument(documentText);
      logger.info(`[FactCheckPlugin] Stage 4: Located ${this.findings.located.length} findings`);

      // Stage 5: Generate analysis and comments
      const { summary, analysisSummary } = analyzeFactFindings(
        this.findings.located,
        this.findings.contradictions,
        this.findings.verifications
      );
      this.findings.summary = summary;
      this.findings.analysisSummary = analysisSummary;

      const comments = generateCommentsFromFindings(this.findings.located, documentText);
      logger.info(`[FactCheckPlugin] Stage 5: Generated ${comments.length} comments`);

      return {
        summary,
        analysis: analysisSummary,
        comments,
        llmInteractions: this.analysisInteractions,
        cost: this.cost,
      };
    } catch (error) {
      logger.error(`[FactCheckPlugin] Analysis failed:`, error);
      throw error;
    }
  }

  /**
   * Stage 1: Extract factual claims from chunks
   */
  private async extractFactualClaims(chunks: TextChunk[]): Promise<void> {
    const extractionPromises = chunks.map(async (chunk) => {
      const config = getFactExtractionConfig(this.name());
      const prompt = this.promptBuilder.buildExtractionPrompt(chunk);

      try {
        const { result, cost, interaction } = await extractWithTool<{ claims: FactExtractionResult[] }>(
          chunk,
          { ...config, extractionPrompt: prompt }
        );

        this.cost += cost;
        this.analysisInteractions.push(interaction);

        if (result.claims && result.claims.length > 0) {
          const findings = convertFactResults(result.claims, chunk.id, this.name());
          this.findings.potential.push(...findings);
        }
      } catch (error) {
        logger.error(`[FactCheckPlugin] Failed to extract claims from chunk ${chunk.id}:`, error);
      }
    });

    await Promise.all(extractionPromises);
  }

  /**
   * Stage 2: Detect contradictions between claims
   */
  private async detectContradictions(): Promise<void> {
    if (this.findings.potential.length < 2) return;

    // Group claims by topic for more efficient contradiction detection
    const claimsByTopic = new Map<string, Array<{ text: string; topic: string }>>();
    
    this.findings.potential.forEach(finding => {
      const topic = finding.data.topic || 'general';
      if (!claimsByTopic.has(topic)) {
        claimsByTopic.set(topic, []);
      }
      claimsByTopic.get(topic)!.push({
        text: finding.data.text,
        topic: topic
      });
    });

    // Check for contradictions within each topic
    const contradictionPromises = Array.from(claimsByTopic.entries()).map(
      async ([topic, claims]) => {
        if (claims.length < 2) return;

        const config = getContradictionDetectionConfig(this.name());
        const prompt = this.promptBuilder.buildContradictionDetectionPrompt(claims);

        try {
          const dummyChunk = new TextChunk(
            `contradiction-check-${topic}`,
            claims.map(c => c.text).join('\n'),
            {
              position: { start: 0, end: 0 }
            }
          );

          const { result, cost, interaction } = await extractWithTool<{ contradictions: ContradictionResult[] }>(
            dummyChunk,
            { ...config, extractionPrompt: prompt }
          );

          this.cost += cost;
          this.analysisInteractions.push(interaction);

          if (result.contradictions && result.contradictions.length > 0) {
            this.findings.contradictions.push(...result.contradictions);
            
            // Convert contradictions to investigated findings
            const contradictionFindings = convertContradictions(
              result.contradictions,
              'document-wide',
              this.name()
            );
            this.findings.investigated.push(...contradictionFindings);
          }
        } catch (error) {
          logger.error(`[FactCheckPlugin] Failed to detect contradictions in topic ${topic}:`, error);
        }
      }
    );

    await Promise.all(contradictionPromises);
  }

  /**
   * Stage 3: Verify high-priority factual claims
   */
  private async verifyFactualClaims(): Promise<void> {
    // Prioritize claims for verification
    const claimsToVerify = prioritizeClaimsForVerification(this.findings.potential, 10);
    
    if (claimsToVerify.length === 0) {
      // No high-priority claims, just investigate all findings
      const investigated = investigateFactFindings(this.findings.potential, []);
      this.findings.investigated.push(...investigated);
      return;
    }

    // Prepare claims for batch verification
    const claimsData = claimsToVerify.map(f => ({
      text: f.data.text,
      topic: f.data.topic
    }));

    const config = getFactVerificationConfig(this.name());
    const prompt = this.promptBuilder.buildVerificationPrompt(claimsData);

    try {
      const dummyChunk = new TextChunk(
        'verification-batch',
        claimsData.map(c => c.text).join('\n'),
        {
          position: { start: 0, end: 0 }
        }
      );

      const { result, cost, interaction } = await extractWithTool<{ verifications: VerificationResult[] }>(
        dummyChunk,
        { ...config, extractionPrompt: prompt }
      );

      this.cost += cost;
      this.analysisInteractions.push(interaction);

      if (result.verifications) {
        this.findings.verifications = result.verifications;
      }

      // Investigate all findings with verification results
      const investigated = investigateFactFindings(
        this.findings.potential,
        this.findings.verifications
      );
      this.findings.investigated.push(...investigated);
    } catch (error) {
      logger.error(`[FactCheckPlugin] Failed to verify claims:`, error);
      // Still investigate findings without verification
      const investigated = investigateFactFindings(this.findings.potential, []);
      this.findings.investigated.push(...investigated);
    }
  }

  /**
   * Stage 4: Locate facts in the document
   */
  private locateFactsInDocument(documentText: string): void {
    const { located, dropped } = locateFindings(
      this.findings.investigated,
      documentText,
      {
        allowFuzzy: true,
        fallbackToContext: true
      }
    );

    this.findings.located = located;
    
    if (dropped > 0) {
      logger.warn(`[FactCheckPlugin] Dropped ${dropped} findings that couldn't be located`);
    }
  }

  /**
   * Get cost of all LLM operations
   */
  getCost(): number {
    return this.cost;
  }

  /**
   * Get all LLM interactions for monitoring
   */
  override getLLMInteractions(): LLMInteraction[] {
    return this.analysisInteractions;
  }

  /**
   * Get debug information about the plugin's state
   */
  getDebugInfo(): Record<string, unknown> {
    return {
      findings: this.findings,
      stats: {
        potentialClaims: this.findings.potential.length,
        investigatedClaims: this.findings.investigated.length,
        locatedFindings: this.findings.located.length,
        contradictions: this.findings.contradictions.length,
        verifications: this.findings.verifications.length,
        cost: this.cost,
        llmCalls: this.analysisInteractions.length,
      },
      stageResults: {
        extraction: this.findings.potential.map(f => ({
          text: f.data.text,
          topic: f.data.topic,
          importance: f.data.importance
        })),
        contradictions: this.findings.contradictions,
        verifications: this.findings.verifications,
        located: this.findings.located.map(f => ({
          text: f.highlightHint.searchText,
          message: f.message,
          location: f.locationHint
        }))
      }
    };
  }

  // Legacy methods for backwards compatibility
  protected override createInitialState(): Record<string, unknown> {
    return {};
  }

  override async processChunk(chunk: TextChunk): Promise<any> {
    throw new Error("processChunk is not supported in SimpleAnalysisPlugin - use analyze() instead");
  }

  override async synthesize(): Promise<any> {
    throw new Error("synthesize is not supported in SimpleAnalysisPlugin - use analyze() instead");
  }
}