/**
 * Spelling and Grammar Verification Plugin
 * 
 * Analyzes text for spelling errors, grammatical mistakes, and style issues.
 * All logic is self-contained for easy understanding and maintenance.
 */

import type { Comment } from "@/types/documentSchema";

import { logger } from "../../../../logger";
import { PipelinePlugin } from "../../core/PipelinePlugin";
import { TextChunk } from "../../TextChunk";
import {
  RoutingExample,
  LLMInteraction,
} from "../../types";
import { extractWithTool, type ExtractionConfig } from "../../utils/extractionHelper";
import {
  locateFindings,
  generateCommentsFromFindings,
  type GenericPotentialFinding,
  type GenericInvestigatedFinding,
  type GenericLocatedFinding,
} from "../../utils/pluginHelpers";
import { generateFindingId } from "../../utils/findingHelpers";
import { getSpellingExtractionConfig, type SpellingExtractionResult, type SpellingFindingStorage } from "./types";
import { SpellingPromptBuilder } from "./promptBuilder";
import { SpellingErrorAnalyzer } from "./errorAnalyzer";

export class SpellingPlugin extends PipelinePlugin<SpellingFindingStorage> {
  constructor() {
    super();
  }

  name(): string {
    return "SPELLING";
  }

  promptForWhenToUse(): string {
    return `Call this for ALL text chunks to check spelling, grammar, and style. This is a basic check that should run on every chunk unless it's pure code, data, or references.`;
  }

  override routingExamples(): RoutingExample[] {
    return [
      {
        chunkText: "The quick brown fox jumps over the lazy dog.",
        shouldProcess: true,
        reason: "Normal text should be checked for spelling and grammar",
      },
      {
        chunkText: "Thier are many problms with this sentance.",
        shouldProcess: true,
        reason: "Text with obvious errors needs checking",
      },
      {
        chunkText: "[1] Smith, J. (2023). Title. Journal. [2] Doe, J. (2022)...",
        shouldProcess: false,
        reason: "Pure reference lists can be skipped",
      },
      {
        chunkText: "function calculate() { return 2 + 2; }",
        shouldProcess: false,
        reason: "Code blocks should not be spell-checked",
      },
    ];
  }

  protected createInitialFindingStorage(): SpellingFindingStorage {
    return {
      potential: [],
      investigated: [],
      located: [],
    };
  }

  /**
   * Extract spelling/grammar findings from a text chunk
   */
  protected async extractFromChunk(chunk: TextChunk): Promise<void> {
    const promptBuilder = new SpellingPromptBuilder();
    
    const extraction = await extractWithTool<{
      errors: SpellingExtractionResult['errors'];
    }>(chunk, {
      ...getSpellingExtractionConfig(this.name()),
      extractionPrompt: promptBuilder.buildExtractionPrompt(
        chunk,
        "Be thorough but focus on clear errors. Consider the document's context and technical nature when evaluating potential issues."
      )
    });
    
    // Track the interaction and cost using parent method
    await this.trackLLMCall(async () => extraction);

    const newFindings = this.convertToFindings(
      extraction.result.errors || [],
      chunk.id
    );

    // Add to our storage
    this.findings.potential.push(...newFindings);
  }

  /**
   * Convert extraction results to potential findings
   */
  private convertToFindings(
    errors: SpellingExtractionResult['errors'],
    chunkId: string
  ): GenericPotentialFinding[] {
    const findings: GenericPotentialFinding[] = [];

    errors.forEach((error) => {
      findings.push({
        id: generateFindingId(this.name(), `${error.type}-error`),
        type: `spelling_${error.type}`,
        data: {
          text: error.text,
          correction: error.correction,
          type: error.type,
          rule: error.rule,
          context: error.context,
          severity: error.severity || 'low'
        },
        highlightHint: {
          searchText: error.text,
          chunkId: chunkId,
          lineNumber: undefined,
        },
      });
    });

    return findings;
  }

  /**
   * Investigate findings and add severity/messages
   */
  protected investigateFindings(): void {
    this.findings.investigated = this.findings.potential.map(finding => ({
      ...finding,
      severity: this.determineSeverity(finding.data),
      message: this.createErrorMessage(finding.data)
    }));
  }

  /**
   * Determine severity based on error type and context
   */
  private determineSeverity(data: { severity?: string; type?: string; [key: string]: unknown }): 'low' | 'medium' | 'high' {
    // Use severity from data if provided
    if (data.severity) {
      return data.severity;
    }
    
    // Grammar errors are typically more important
    if (data.type === 'grammar') {
      return 'medium';
    }
    
    // Default to low for spelling and style
    return 'low';
  }

  /**
   * Create a user-friendly error message
   */
  private createErrorMessage(data: { text?: string; correction?: string; type?: string; rule?: string; [key: string]: unknown }): string {
    const { text, correction, type, rule } = data;
    
    let message = `${this.capitalizeFirst(type)} error: "${text}" should be "${correction}"`;
    
    if (rule) {
      message += ` (${rule})`;
    }
    
    return message;
  }

  /**
   * Locate findings in document text
   */
  protected locateFindings(documentText: string): void {
    const { located, dropped } = locateFindings(
      this.findings.investigated,
      documentText,
      { 
        mathSpecific: false,
        allowFuzzy: true,
        fallbackToContext: true 
      }
    );

    this.findings.located = located;

    if (dropped > 0) {
      logger.info(`SpellingPlugin: ${dropped} findings couldn't be located`);
    }
  }

  /**
   * Analyze findings and generate summary
   */
  protected analyzeFindingPatterns(): void {
    const errorAnalyzer = new SpellingErrorAnalyzer();
    
    // Convert findings to error format for analysis
    const errors = this.findings.potential.map(f => ({
      text: f.data.text,
      correction: f.data.correction,
      type: f.data.type
    }));
    
    const analysisResult = errorAnalyzer.analyze(errors);
    const commonPatterns = errorAnalyzer.identifyCommonPatterns(errors);
    
    // Generate summary
    const totalErrors = this.findings.potential.length;
    const errorsByType = this.getErrorCountsByType();
    
    this.findings.summary = analysisResult.summary;
    
    // Generate detailed analysis
    let analysisSummary = `## Spelling & Grammar Analysis\n\n`;
    
    if (totalErrors === 0) {
      analysisSummary += `No spelling or grammar issues found in the document.\n`;
    } else {
      analysisSummary += `### Error Summary\n`;
      analysisSummary += `- Total issues found: ${totalErrors}\n`;
      
      if (errorsByType.size > 0) {
        analysisSummary += `- Breakdown by type:\n`;
        errorsByType.forEach((count, type) => {
          analysisSummary += `  - ${this.capitalizeFirst(type)}: ${count}\n`;
        });
      }
      
      if (commonPatterns.length > 0) {
        analysisSummary += `\n### Common Patterns\n`;
        commonPatterns.forEach(pattern => {
          analysisSummary += `- ${pattern}\n`;
        });
      }
      
      if (analysisResult.mostCommonPattern && analysisResult.mostCommonPattern.examples.length > 0) {
        analysisSummary += `\n### Examples of ${this.capitalizeFirst(analysisResult.mostCommonPattern.type)} Errors\n`;
        analysisResult.mostCommonPattern.examples.slice(0, 3).forEach(example => {
          analysisSummary += `- "${example.text}" → "${example.correction}"\n`;
        });
      }
    }
    
    this.findings.analysisSummary = analysisSummary;
  }

  /**
   * Generate UI comments from located findings
   */
  protected generateCommentsFromFindings(documentText: string): Comment[] {
    const comments = generateCommentsFromFindings(this.findings.located, documentText);
    logger.info(`SpellingPlugin: Generated ${comments.length} comments from ${this.findings.located.length} located findings`);
    return comments;
  }

  /**
   * Helper methods
   */
  private getErrorCountsByType(): Map<string, number> {
    const counts = new Map<string, number>();
    this.findings.potential.forEach(finding => {
      const type = finding.data.type;
      counts.set(type, (counts.get(type) || 0) + 1);
    });
    return counts;
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

}