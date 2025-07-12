// experiment.ts
import { IterativeEvaluator } from './iterative-evaluator';
import * as fs from 'fs';

interface ExperimentConfig {
  articleUrl: string;
  maxIterations: number;
  workingDocPath: string;
}

async function runExperiment(config: ExperimentConfig) {
  console.log('🧪 Starting iterative evaluation experiment');
  
  const startTime = Date.now();
  const evaluator = new IterativeEvaluator(config.maxIterations);
  
  try {
    // Run evaluation
    const result = await evaluator.evaluate(config.articleUrl);
    
    // Save results
    const experimentData = {
      config,
      startTime,
      endTime: Date.now(),
      duration: Date.now() - startTime,
      result,
      workingDocument: fs.readFileSync(config.workingDocPath, 'utf-8')
    };
    
    fs.writeFileSync(
      `experiment_${Date.now()}.json`,
      JSON.stringify(experimentData, null, 2)
    );
    
    console.log(`✅ Experiment complete in ${experimentData.duration}ms`);
    
  } catch (error) {
    console.error('❌ Experiment failed:', error);
  }
}

// Run simple experiment
runExperiment({
  articleUrl: 'https://example.com/test-article',
  maxIterations: 5,
  workingDocPath: './evaluation_working.md'
});