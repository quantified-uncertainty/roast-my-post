import { MathAnalyzerJob } from "./index";
import { logger } from "@/lib/logger";
import { TextChunk } from "../../TextChunk";
import {
  AnalysisResult,
  RoutingExample,
} from "../../types";

/**
 * Wrapper class to maintain compatibility with the plugin system
 */
export class MathPlugin {
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

  async analyzeDocument(
    documentText: string,
    chunks: TextChunk[],
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
}