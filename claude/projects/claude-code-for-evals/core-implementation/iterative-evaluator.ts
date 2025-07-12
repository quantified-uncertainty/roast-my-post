// iterative-evaluator.ts
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface IterationResult {
  completed: boolean;
  tasksCompleted: string[];
  nextFocus: string;
}

export class IterativeEvaluator {
  private workingDoc: string;
  private maxIterations: number;

  constructor(maxIterations = 10) {
    this.maxIterations = maxIterations;
    this.workingDoc = path.join(process.cwd(), 'evaluation_working.md');
  }

  async evaluate(articleUrl: string): Promise<string> {
    // Initialize working document
    await this.runClaude(
      `Create a working document for evaluating: ${articleUrl}
       Include sections: metadata, planning, working memory, drafts, final output.
       Mark status as IN_PROGRESS.`,
      5
    );

    // Run iterations
    for (let i = 1; i <= this.maxIterations; i++) {
      console.log(`\n=== Iteration ${i}/${this.maxIterations} ===`);
      
      const result = await this.runIteration(i);
      
      if (result.completed) {
        console.log('✓ Evaluation complete!');
        break;
      }
    }

    // Extract final output
    return await this.extractFinalOutput();
  }

  private async runIteration(iterationNum: number): Promise<IterationResult> {
    const prompt = `
      You are iteration ${iterationNum} of ${this.maxIterations}.
      Read ${this.workingDoc} and:
      1. Check "Current Focus" section
      2. Complete that task (use 5-10 turns)
      3. Update document with your findings
      4. Mark completed tasks with [x]
      5. Update "Current Focus" for next iteration
      6. If all tasks done, set Status: COMPLETE
    `;

    await this.runClaude(prompt, 10);

    // Check completion status
    const content = fs.readFileSync(this.workingDoc, 'utf-8');
    const completed = content.includes('Status: COMPLETE');

    return {
      completed,
      tasksCompleted: this.extractCompletedTasks(content),
      nextFocus: this.extractCurrentFocus(content)
    };
  }

  private async runClaude(prompt: string, maxTurns: number): Promise<void> {
    const cmd = [
      'claude',
      '-p', `"${prompt}"`,
      '--max-turns', maxTurns.toString(),
      '--allowedTools', 'Read,Write,WebSearch,mcp__roast-my-post__*'
    ].join(' ');

    execSync(cmd, { stdio: 'inherit' });
  }

  private extractCompletedTasks(content: string): string[] {
    const matches = content.match(/- \[x\] (.+)/g) || [];
    return matches.map(m => m.replace('- [x] ', ''));
  }

  private extractCurrentFocus(content: string): string {
    const match = content.match(/Working on: (.+)/);
    return match ? match[1] : 'Unknown';
  }

  private async extractFinalOutput(): Promise<string> {
    await this.runClaude(
      `Read ${this.workingDoc} and extract ONLY the final JSON output`,
      3
    );
    
    // In practice, would capture stdout
    return 'final_output.json';
  }
}