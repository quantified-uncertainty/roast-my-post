/**
 * Example usage of the simplified ForecastAnalyzerJob
 */

import { ForecastAnalyzerJob } from './index';
import { TextChunk } from '../../TextChunk';

async function runForecastAnalysis(documentText: string, chunks: TextChunk[]) {
  // Create the analyzer
  const analyzer = new ForecastAnalyzerJob({ documentText, chunks });
  
  // Run the analysis
  const results = await analyzer.analyze();
  
  // Access results
  console.log('Summary:', results.summary);
  console.log('Analysis:', results.analysis);
  console.log('Comments:', results.comments.length);
  console.log('Total cost:', results.cost);
  
  // Debug info if needed
  const debug = analyzer.getDebugInfo();
  console.log('Debug info:', debug);
  
  return results;
}

// Example of registering this analyzer in a system
export function registerForecastAnalyzer() {
  return {
    name: ForecastAnalyzerJob.displayName(),
    promptForWhenToUse: ForecastAnalyzerJob.promptForWhenToUse(),
    routingExamples: ForecastAnalyzerJob.routingExamples(),
    
    // Factory function to create analyzer instances
    createAnalyzer: (documentText: string, chunks: TextChunk[]) => {
      return new ForecastAnalyzerJob({ documentText, chunks });
    },
    
    // Run analysis
    analyze: async (documentText: string, chunks: TextChunk[]) => {
      const analyzer = new ForecastAnalyzerJob({ documentText, chunks });
      return analyzer.analyze();
    }
  };
}