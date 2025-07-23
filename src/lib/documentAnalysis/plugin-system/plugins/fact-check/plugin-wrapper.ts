import { FactCheckAnalyzerJob } from './index';
import type { SimpleAnalysisPlugin } from '../../types';

export const FactCheckPlugin: SimpleAnalysisPlugin = {
  name: () => FactCheckAnalyzerJob.displayName(),
  promptForWhenToUse: () => FactCheckAnalyzerJob.promptForWhenToUse(),
  routingExamples: () => FactCheckAnalyzerJob.routingExamples().map(text => ({
    chunkText: text,
    shouldProcess: true,
    reason: 'Contains factual claims to check'
  })),
  
  analyze: async (chunks, documentText) => {
    const job = new FactCheckAnalyzerJob();
    return job.analyze(documentText, chunks);
  },
  
  getCost: () => 0, // Will be calculated from LLM interactions
  getLLMInteractions: () => [] // Will be populated during analysis
};