/**
 * Fact Check Plugin - Refactored version using new plugin architecture
 * Extracts and verifies factual claims, detects contradictions
 */

import { logger } from "../../../../logger";
import { PipelinePlugin } from "../../core/PipelinePlugin";
import { TextChunk } from "../../TextChunk";
import {
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

export class FactCheckPlugin extends PipelinePlugin<FactCheckFindingStorage> {
  private promptBuilder = new FactCheckPromptBuilder();

  constructor() {
    super();
  }

  name(): string {
    return "FACT_CHECK";
  }

  promptForWhenToUse(): string {
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

  protected createInitialFindingStorage(): FactCheckFindingStorage {
    return {
      potential: [],
      investigated: [],
      located: [],
      contradictions: [],
      verifications: [],
    };
  }

  /**
   * Extract factual claims from a single chunk
   */
  protected async extractFromChunk(chunk: TextChunk): Promise<void> {
    const config = getFactExtractionConfig(this.name());
    const prompt = this.promptBuilder.buildExtractionPrompt(chunk);

    try {
      const extraction = await extractWithTool<{ claims: FactExtractionResult[] }>(
        chunk,
        { ...config, extractionPrompt: prompt }
      );

      // Track LLM call using parent method
      if (extraction.interaction) {
        this.analysisInteractions.push(extraction.interaction);
      }
      if (extraction.cost) {
        this.totalCost += extraction.cost;
      }

      if (extraction.result.claims && extraction.result.claims.length > 0) {
        const findings = convertFactResults(extraction.result.claims, chunk.id, this.name());
        this.findings.potential.push(...findings);
      }
    } catch (error) {
      logger.error(`[FactCheckPlugin] Failed to extract claims from chunk ${chunk.id}:`, error);
    }
  }

  /**
   * Investigate findings - includes contradiction detection and verification
   */
  protected async investigateFindings(): Promise<void> {
    // First detect contradictions
    await this.detectContradictions();
    
    // Then verify high-priority claims
    await this.verifyFactualClaims();
    
    // Finally convert potential findings to investigated findings
    this.findings.investigated = investigateFactFindings(this.findings.potential, this.findings.verifications || []);
  }


  /**
   * Stage 2: Detect contradictions between claims
   */
  private async detectContradictions(): Promise<void> {
    if (this.findings.potential.length < 2) return;

    // Group claims by topic for more efficient contradiction detection
    const claimsByTopic = new Map<string, Array<{ text: string; topic: string }>>();
    
    this.findings.potential.forEach(finding => {
      const topic = (finding.data.topic as string) || 'general';
      if (!claimsByTopic.has(topic)) {
        claimsByTopic.set(topic, []);
      }
      claimsByTopic.get(topic)!.push({
        text: finding.data.text as string,
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

          const extraction = await extractWithTool<{ contradictions: ContradictionResult[] }>(
            dummyChunk,
            { ...config, extractionPrompt: prompt }
          );

          // Track LLM call using parent method
          await this.trackLLMCall(async () => extraction);
          const { result } = extraction;

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
      text: f.data.text as string,
      topic: f.data.topic as string
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

      const extraction = await extractWithTool<{ verifications: VerificationResult[] }>(
        dummyChunk,
        { ...config, extractionPrompt: prompt }
      );

      // Track LLM call using parent method
      if (extraction.interaction) {
        this.analysisInteractions.push(extraction.interaction);
      }
      if (extraction.cost) {
        this.totalCost += extraction.cost;
      }
      const { result } = extraction;

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
   * Locate findings in document text
   */
  protected locateFindings(documentText: string): void {
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
   * Analyze findings and generate summary
   */
  protected analyzeFindingPatterns(): void {
    const { summary, analysisSummary } = analyzeFactFindings(
      this.findings.located,
      this.findings.contradictions,
      this.findings.verifications
    );
    this.findings.summary = summary;
    this.findings.analysisSummary = analysisSummary;
  }

  /**
   * Generate UI comments from located findings
   */
  protected generateCommentsFromFindings(documentText: string): Comment[] {
    const comments = generateCommentsFromFindings(this.findings.located, documentText);
    logger.info(`[FactCheckPlugin] Generated ${comments.length} comments from ${this.findings.located.length} located findings`);
    return comments;
  }

}