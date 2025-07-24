/**
 * Wrapper to make FactCheckAnalyzerJob compatible with the SimpleAnalysisPlugin interface
 */

import { SimpleAnalysisPlugin, AnalysisResult, RoutingExample, LLMInteraction } from '../../types';
import { TextChunk } from '../../TextChunk';
import { sessionContext } from '../../../../helicone/sessionContext';
import { FactCheckAnalyzerJob } from './index';

export class FactCheckPlugin implements SimpleAnalysisPlugin {
  private analyzer: FactCheckAnalyzerJob | null = null;
  
  name(): string {
    return FactCheckAnalyzerJob.displayName();
  }
  
  promptForWhenToUse(): string {
    return FactCheckAnalyzerJob.promptForWhenToUse();
  }
  
  routingExamples(): RoutingExample[] {
    return FactCheckAnalyzerJob.routingExamples().map(text => ({
      chunkText: text,
      shouldProcess: true,
      reason: 'Contains factual claims to check'
    }));
  }
  
  async analyze(chunks: TextChunk[], documentText: string): Promise<AnalysisResult> {
    // Create a new analyzer for this analysis
    this.analyzer = new FactCheckAnalyzerJob();
    
    // Get the current session context to extract userId
    const currentSession = sessionContext.getSession();
    const context = currentSession?.userId ? { userId: currentSession.userId } : undefined;
    
    // The fact-check analyzer doesn't use context yet, but we pass it for future use
    return this.analyzer.analyze(documentText, chunks);
  }
  
  getCost(): number {
    if (!this.analyzer) return 0;
    return this.analyzer.getCost();
  }
  
  getLLMInteractions(): LLMInteraction[] {
    if (!this.analyzer) return [];
    return this.analyzer.getLLMInteractions();
  }
  
  getDebugInfo(): Record<string, unknown> {
    if (!this.analyzer) return {};
    return this.analyzer.getDebugInfo();
  }
}