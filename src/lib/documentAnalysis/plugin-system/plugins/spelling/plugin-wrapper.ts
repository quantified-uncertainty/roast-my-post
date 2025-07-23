import { SpellingAnalyzerJob } from "./index";
import { logger } from "@/lib/logger";
import { TextChunk } from "../../TextChunk";
import {
  AnalysisResult,
  RoutingExample,
  SimpleAnalysisPlugin,
  LLMInteraction,
} from "../../types";

/**
 * Wrapper class to maintain compatibility with the plugin system
 */
export class SpellingPlugin implements SimpleAnalysisPlugin {
  private analyzer: SpellingAnalyzerJob | null = null;

  constructor() {}

  name(): string {
    return SpellingAnalyzerJob.displayName();
  }

  promptForWhenToUse(): string {
    return SpellingAnalyzerJob.promptForWhenToUse();
  }

  routingExamples(): RoutingExample[] {
    return SpellingAnalyzerJob.routingExamples();
  }

  async analyze(
    chunks: TextChunk[],
    documentText: string,
    context?: { userId?: string }
  ): Promise<AnalysisResult> {
    logger.info(`SpellingPlugin: Analyzing document with ${chunks.length} chunks`);
    
    this.analyzer = new SpellingAnalyzerJob({
      documentText,
      chunks,
    });

    return await this.analyzer.analyze(context);
  }

  getDebugInfo(): Record<string, unknown> {
    if (!this.analyzer) {
      return { error: "No analysis run yet" };
    }
    return this.analyzer.getDebugInfo();
  }

  getCost(): number {
    if (!this.analyzer) {
      return 0;
    }
    try {
      const results = this.analyzer.getResults();
      return results.cost;
    } catch {
      // Analysis hasn't been run yet
      return 0;
    }
  }

  getLLMInteractions(): LLMInteraction[] {
    if (!this.analyzer) {
      return [];
    }
    try {
      const results = this.analyzer.getResults();
      return results.llmInteractions;
    } catch {
      // Analysis hasn't been run yet
      return [];
    }
  }
}