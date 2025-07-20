/**
 * Spelling and grammar checking plugin
 */

import type { Comment } from "@/types/documentSchema";

import { logger } from "../../../../lib/logger";
import checkSpellingGrammarTool
  from "../../../../tools/check-spelling-grammar/index";
import { ErrorPatternAnalyzer } from "../analyzers/ErrorPatternAnalyzer";
import { FindingBuilder } from "../builders/FindingBuilder";
import { BasePlugin } from "../core/BasePlugin";
import { TextChunk } from "../TextChunk";
import {
  ChunkResult,
  Finding,
  GenerateCommentsContext,
  LocatedFinding,
  RoutingExample,
  SynthesisResult,
} from "../types";

interface SpellingState {
  errors: Array<{
    text: string;
    correction: string;
    type: "spelling" | "grammar" | "style";
    chunkId: string;
    context: string;
    lineNumber?: number;
    lineText?: string;
    startLine?: number;
    endLine?: number;
    matchText?: string;
    location?: { start: number; end: number };
  }>;
  commonPatterns: Map<string, number>;
}

export class SpellingPlugin extends BasePlugin<SpellingState> {
  constructor() {
    super({
      errors: [],
      commonPatterns: new Map(),
    });
  }

  name(): string {
    return "SPELLING";
  }

  promptForWhenToUse(): string {
    return `Call this for ALL text chunks to check spelling, grammar, and style. This is a basic check that should run on every chunk unless explicitly excluded.`;
  }

  override routingExamples(): RoutingExample[] {
    return [
      {
        chunkText: "Any normal text content",
        shouldProcess: true,
        reason: "All text should be checked for spelling and grammar",
      },
      {
        chunkText:
          "[1] Smith, J. (2023). Title. Journal. [2] Doe, J. (2022)...",
        shouldProcess: false,
        reason: "Pure reference lists can be skipped",
      },
    ];
  }

  async processChunk(chunk: TextChunk): Promise<ChunkResult> {
    const result = await checkSpellingGrammarTool.execute(
      {
        text: chunk.text,
        context: chunk.getExpandedContext(100),
        includeStyle: true,
        maxErrors: 50,
      },
      {
        userId: "spelling-plugin",
        logger: logger,
      }
    );

    logger.debug(
      `SpellingPlugin: Found ${result.errors.length} errors in chunk ${chunk.id}`
    );

    const findings: Finding[] = [];

    // Process errors
    result.errors.forEach((error) => {
      // Create finding with automatic location tracking first
      const finding = FindingBuilder.forError(
        error.type,
        error.text,
        `${error.type} error: "${error.text}" → "${error.correction}"`,
        "low"
      )
        .inChunk(chunk)
        .withMetadata({
          original: error.text,
          suggestion: error.correction,
          errorType: error.type,
        })
        .build();

      // Only add as LocatedFinding if we have location info
      if (
        finding.locationHint?.lineNumber &&
        finding.locationHint?.lineText &&
        finding.locationHint?.matchText
      ) {
        const locatedFinding: LocatedFinding = {
          ...finding,
          locationHint: {
            lineNumber: finding.locationHint.lineNumber,
            lineText: finding.locationHint.lineText,
            matchText: finding.locationHint.matchText,
            startLineNumber: finding.locationHint.startLineNumber,
            endLineNumber: finding.locationHint.endLineNumber,
          },
        };
        this.addChunkFindings([locatedFinding]);
      }

      // Store error in state for pattern analysis
      this.addToStateArray("errors", [
        {
          ...error,
          chunkId: chunk.id,
          context: error.context || chunk.getContext(0, 50),
        },
      ]);

      // Track patterns
      const count = this.state.commonPatterns.get(error.type) || 0;
      this.state.commonPatterns.set(error.type, count + 1);

      findings.push(finding);
    });

    return {
      findings,
      llmCalls: result.llmInteractions,
      metadata: {
        tokensUsed: result.llmInteractions.reduce(
          (total, interaction) => total + interaction.tokensUsed.total,
          0
        ),
        processingTime: result.llmInteractions.reduce(
          (total, interaction) => total + interaction.duration,
          0
        ),
      },
    };
  }

  async synthesize(): Promise<SynthesisResult> {
    const totalErrors = this.state.errors.length;

    // Use ErrorPatternAnalyzer for systematic analysis
    const analyzer = ErrorPatternAnalyzer.forSpelling();
    const analysis = analyzer.analyze(
      this.state.errors.map((e) => ({
        ...e,
        description: `${e.type} error: ${e.text} → ${e.correction}`,
      }))
    );

    // Find most common errors
    const commonErrors = this.findCommonErrors();

    // Build summary
    let summary = analysis.summary;
    if (commonErrors.length > 0) {
      summary += ` Most frequent: ${commonErrors
        .slice(0, 3)
        .map((e) => `"${e.text}"`)
        .join(", ")}.`;
    }

    // Build analysis summary markdown
    let analysisSummary = `## Spelling & Grammar Analysis\n\n`;

    if (totalErrors === 0) {
      analysisSummary += `No spelling or grammar errors found.\n`;
    } else {
      analysisSummary += `### Error Summary\n`;
      analysisSummary += `- Total errors: ${totalErrors}\n`;
      analysisSummary += `- Error types: ${Array.from(
        this.state.commonPatterns.entries()
      )
        .map(([type, count]) => `${type} (${count})`)
        .join(", ")}\n\n`;

      if (commonErrors.length > 0) {
        analysisSummary += `### Most Common Errors\n`;
        commonErrors.slice(0, 5).forEach((error) => {
          if (error.count > 1) {
            analysisSummary += `- "${error.text}" → "${error.correction}" (${error.count} occurrences)\n`;
          }
        });
        analysisSummary += `\n`;
      }

      // Add pattern insights
      if (analysis.patterns.size > 0) {
        analysisSummary += `### Patterns Detected\n`;
        analysis.patterns.forEach((pattern, type) => {
          if (pattern.count >= 3) {
            analysisSummary += `- **${type} errors**: ${pattern.count} instances\n`;
          }
        });
      }
    }

    return {
      summary,
      analysisSummary,
      recommendations: [],
      llmCalls: [],
    };
  }

  protected createInitialState(): SpellingState {
    return {
      errors: [],
      commonPatterns: new Map(),
    };
  }

  /**
   * Custom comment generation that can filter out repetitive errors
   */
  override generateComments(context: GenerateCommentsContext): Comment[] {
    const { maxComments = 30 } = context;

    // Get base comments from parent implementation
    const comments = super.generateComments(context);

    // Group comments by error text to identify repetitive issues
    const errorGroups = new Map<string, Comment[]>();

    comments.forEach((comment) => {
      // Extract original error text from metadata if available
      const errorText =
        (comment as any).metadata?.original ||
        comment.highlight?.quotedText ||
        "";
      const key = errorText.toLowerCase();

      if (!errorGroups.has(key)) {
        errorGroups.set(key, []);
      }
      errorGroups.get(key)!.push(comment);
    });

    // If an error appears many times, only keep first few instances
    const filteredComments: Comment[] = [];
    const maxInstancesPerError = 3;

    errorGroups.forEach((group, errorText) => {
      if (group.length > maxInstancesPerError) {
        // Keep first few instances and create a summary comment
        filteredComments.push(...group.slice(0, maxInstancesPerError));

        // Log that we're filtering repetitive errors
        logger.debug(
          `SpellingPlugin: Filtered ${group.length - maxInstancesPerError} additional instances of "${errorText}"`
        );
      } else {
        filteredComments.push(...group);
      }
    });

    // Sort by importance and location
    filteredComments.sort((a, b) => {
      // First by importance
      const importanceDiff = (b.importance || 0) - (a.importance || 0);
      if (importanceDiff !== 0) return importanceDiff;

      // Then by line number if available
      const aLine = (a.highlight as any)?.lineNumber || 0;
      const bLine = (b.highlight as any)?.lineNumber || 0;
      return aLine - bLine;
    });

    return filteredComments.slice(0, maxComments);
  }

  private findCommonErrors(): Array<{
    text: string;
    correction: string;
    count: number;
  }> {
    const errorCounts = new Map<
      string,
      { correction: string; count: number }
    >();

    this.state.errors.forEach((error) => {
      const key = error.text.toLowerCase();
      if (errorCounts.has(key)) {
        errorCounts.get(key)!.count++;
      } else {
        errorCounts.set(key, {
          correction: error.correction,
          count: 1,
        });
      }
    });

    return Array.from(errorCounts.entries())
      .map(([text, data]) => ({
        text,
        correction: data.correction,
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count);
  }
}
