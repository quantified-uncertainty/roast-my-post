import { MathAnalyzerJob } from "./index";
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
export class MathPlugin implements SimpleAnalysisPlugin {
  private analyzer: MathAnalyzerJob | null = null;

  constructor() {}

  name(): string {
    return MathAnalyzerJob.displayName();
  }

  promptForWhenToUse(): string {
    return MathAnalyzerJob.promptForWhenToUse();
  }

  routingExamples(): RoutingExample[] {
    return MathAnalyzerJob.routingExamples();
  }

  async analyze(
    chunks: TextChunk[],
    documentText: string,
    context?: { userId?: string }
  ): Promise<AnalysisResult> {
    logger.info(`MathPlugin: Analyzing document with ${chunks.length} chunks`);
    
    this.analyzer = new MathAnalyzerJob({
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