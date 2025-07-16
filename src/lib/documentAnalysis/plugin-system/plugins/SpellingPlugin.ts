/**
 * Spelling and grammar checking plugin
 */

import { logger } from "../../../../lib/logger";
import checkSpellingGrammarTool
  from "../../../../tools/check-spelling-grammar/index";
import { BasePlugin } from "../BasePlugin";
import { TextChunk } from "../TextChunk";
import {
  ChunkResult,
  Finding,
  RoutingExample,
  SynthesisResult,
} from "../types";
import { LocationUtils } from "../../utils/LocationUtils";

interface SpellingState {
  errors: Array<{
    text: string;
    correction: string;
    type: "spelling" | "grammar" | "style";
    chunkId: string;
    context: string;
    lineNumber?: number;
    lineText?: string;
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

    const findings: Finding[] = [];
    
    // Create location utils for this chunk
    const chunkLocationUtils = new LocationUtils(chunk.text);

    // Process errors
    result.errors.forEach((error) => {
      // Try to find the error text in the chunk
      const errorPosition = chunk.text.indexOf(error.text);
      let locationHint: Finding['locationHint'] = undefined;
      let lineNumber: number | undefined;
      let lineText: string | undefined;
      
      if (errorPosition !== -1) {
        // Get line info within the chunk
        const locationInfo = chunkLocationUtils.getLocationInfo(
          errorPosition, 
          errorPosition + error.text.length
        );
        
        if (locationInfo) {
          // If chunk has global line info, adjust the line numbers
          if (chunk.metadata?.lineInfo) {
            lineNumber = chunk.metadata.lineInfo.startLine + locationInfo.start.lineNumber - 1;
            locationHint = {
              lineNumber,
              lineText: locationInfo.start.lineText,
              matchText: error.text,
            };
          } else {
            // Use chunk-relative line numbers
            lineNumber = locationInfo.start.lineNumber;
            locationHint = {
              lineNumber,
              lineText: locationInfo.start.lineText,
              matchText: error.text,
            };
          }
          lineText = locationInfo.start.lineText;
        }
      }

      this.state.errors.push({
        ...error,
        chunkId: chunk.id,
        context: error.context || chunk.getContext(0, 50),
        lineNumber,
        lineText,
      });

      // Track patterns
      const count = this.state.commonPatterns.get(error.type) || 0;
      this.state.commonPatterns.set(error.type, count + 1);

      findings.push({
        type: `${error.type}_error`,
        severity: "low",
        message: `${error.type} error: "${error.text}" → "${error.correction}"`,
        locationHint,
        metadata: {
          original: error.text,
          suggestion: error.correction,
          errorType: error.type,
        },
      });
    });

    return {
      findings,
      llmCalls: result.llmInteractions,
      metadata: {
        tokensUsed: result.llmInteractions.reduce((total, interaction) => total + interaction.tokensUsed.total, 0),
        processingTime: result.llmInteractions.reduce((total, interaction) => total + interaction.duration, 0)
      },
    };
  }

  async synthesize(): Promise<SynthesisResult> {
    const totalErrors = this.state.errors.length;

    // Group errors by type
    const errorsByType = new Map<string, number>();
    this.state.errors.forEach((error) => {
      errorsByType.set(error.type, (errorsByType.get(error.type) || 0) + 1);
    });

    // Find most common errors
    const commonErrors = this.findCommonErrors();

    let summary = `Found ${totalErrors} spelling/grammar issues`;
    if (errorsByType.size > 0) {
      const types = Array.from(errorsByType.entries())
        .map(([type, count]) => `${count} ${type}`)
        .join(", ");
      summary += ` (${types})`;
    }

    if (commonErrors.length > 0) {
      summary += `. Most frequent: ${commonErrors
        .slice(0, 3)
        .map((e) => `"${e.text}"`)
        .join(", ")}.`;
    }

    const findings: Finding[] = [];

    // Add finding for systematic issues
    if (totalErrors > 20) {
      findings.push({
        type: "systematic_issue",
        severity: "medium",
        message: `Document has numerous spelling/grammar issues (${totalErrors} total). Consider comprehensive proofreading.`,
      });
    }

    // Add findings for repeated errors
    commonErrors.forEach((error) => {
      if (error.count > 2) {
        findings.push({
          type: "repeated_error",
          severity: "low",
          message: `"${error.text}" appears ${error.count} times (suggest: "${error.correction}")`,
        });
      }
    });

    return {
      summary,
      findings,
      llmCalls: [],
    };
  }

  protected createInitialState(): SpellingState {
    return {
      errors: [],
      commonPatterns: new Map(),
    };
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
