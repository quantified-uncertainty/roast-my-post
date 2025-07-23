/**
 * Wrapper to make ForecastAnalyzerJob compatible with the SimpleAnalysisPlugin interface
 */

import { SimpleAnalysisPlugin, AnalysisResult, RoutingExample, LLMInteraction } from '../../types';
import { TextChunk } from '../../TextChunk';
import { ForecastAnalyzerJob } from './index';

export class ForecastPlugin implements SimpleAnalysisPlugin {
  private analyzer: ForecastAnalyzerJob | null = null;
  
  name(): string {
    return ForecastAnalyzerJob.displayName();
  }
  
  promptForWhenToUse(): string {
    return ForecastAnalyzerJob.promptForWhenToUse();
  }
  
  routingExamples(): RoutingExample[] {
    return ForecastAnalyzerJob.routingExamples();
  }
  
  async analyze(chunks: TextChunk[], documentText: string): Promise<AnalysisResult> {
    // Create a new analyzer for this analysis
    this.analyzer = new ForecastAnalyzerJob({ documentText, chunks });
    return this.analyzer.analyze();
  }
  
  getCost(): number {
    if (!this.analyzer) return 0;
    const results = this.analyzer.getResults();
    return results.cost;
  }
  
  getLLMInteractions(): LLMInteraction[] {
    if (!this.analyzer) return [];
    const results = this.analyzer.getResults();
    return results.llmInteractions;
  }
  
  getDebugInfo(): Record<string, unknown> {
    if (!this.analyzer) return {};
    return this.analyzer.getDebugInfo();
  }
}