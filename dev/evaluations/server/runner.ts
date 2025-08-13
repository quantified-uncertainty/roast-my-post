// Main runner that delegates to tool-specific runners
import { runEvaluation as runSpellingEvaluation } from './runners/check-spelling-grammar';
import { runMathEvaluation } from './runners/check-math-with-mathjs';

export async function runEvaluation(testCases: any[], runsPerTest: number, tool: string) {
  switch (tool) {
    case 'math':
      return runMathEvaluation(testCases, runsPerTest);
    case 'spelling':
    default:
      return runSpellingEvaluation(testCases, runsPerTest);
  }
}