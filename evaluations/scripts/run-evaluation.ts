#!/usr/bin/env npx tsx

// Load environment variables
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(process.cwd(), '..', '.env') });

import { runEvaluation } from '../server/runner';
import { testCases } from '../data/test-cases';
import * as fs from 'fs/promises';

async function main() {
  const args = process.argv.slice(2);
  const quick = args.includes('--quick');
  const runs = args.includes('--runs') ? 
    parseInt(args[args.indexOf('--runs') + 1]) : 3;
  
  // Select test cases
  const casesToRun = quick ? testCases.slice(0, 5) : testCases;
  
  console.log(`🚀 Running evaluation...`);
  console.log(`📝 Tests: ${casesToRun.length}`);
  console.log(`🔄 Runs per test: ${runs}`);
  console.log('');
  
  const startTime = Date.now();
  
  try {
    const results = await runEvaluation(casesToRun, runs);
    
    // Save results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const filename = `evaluation-${timestamp}.json`;
    const filepath = path.join(process.cwd(), 'results', filename);
    
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    await fs.writeFile(filepath, JSON.stringify(results, null, 2));
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('\n✅ Evaluation complete!');
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`📊 Results: ${results.metadata.passedTests}/${results.metadata.totalTests} passed (${results.metadata.passRate}%)`);
    console.log(`📈 Consistency: ${results.metadata.avgConsistency}%`);
    console.log(`💾 Saved to: ${filename}`);
    console.log('\nView results at: http://localhost:8765/results/' + filename);
    
  } catch (error) {
    console.error('❌ Evaluation failed:', error);
    process.exit(1);
  }
}

main();