# Iterative Document Orchestration Pattern

## Core Concept

Instead of complex agent orchestration, use a **working document** as shared state between Claude Code instances. Each iteration:
1. Reads the current document
2. Performs its assigned work
3. Updates specific sections
4. Passes to next iteration

The document itself becomes the coordination mechanism - no message passing, no complex frameworks, just file I/O.

## Working Document Structure

```markdown
# Evaluation Working Document: [Article Title]

## Metadata
- Document ID: xyz123
- Article URL: https://example.com/article
- Status: IN_PROGRESS
- Current Phase: initial_analysis
- Iterations Completed: 0/10

## Constraints & Requirements
- Maximum 10 iterations
- Must evaluate: factual accuracy, logical consistency, writing quality
- Output format: structured JSON with highlights and comments
- Tone: constructive but thorough

## Planning & Coordination
### Completed Tasks
- [ ] Import and parse article
- [ ] Initial content analysis
- [ ] Fact checking
- [ ] Logic evaluation
- [ ] Style assessment
- [ ] Generate highlights
- [ ] Final synthesis

### Current Focus
Working on: Initial content analysis
Next up: Fact checking

### Iteration Log
1. [timestamp] Imported article, extracted main claims
2. [timestamp] Analyzed first 3 claims, need research on claim 4

## Working Memory
### Key Claims Identified
1. "AI will replace 50% of jobs by 2030" - NEEDS VERIFICATION
2. "Current models are approaching AGI" - DISPUTED
3. [more claims...]

### Research Notes
- Found study from MIT regarding job displacement...
- OpenAI's definition of AGI differs from...

### Identified Issues
- Claim 1 lacks citation
- Logical fallacy in paragraph 3 (slippery slope)
- Inconsistent terminology usage

## Draft Outputs
### Evaluation Summary (DRAFT)
The article makes several bold claims about AI's impact...

### Highlights (DRAFT)
```json
{
  "highlights": [
    {
      "text": "AI will replace 50% of jobs",
      "comment": "Lacks supporting evidence",
      "severity": "major"
    }
  ]
}
```

## Final Output
[To be completed in final iteration]
```

## Simple TypeScript Implementation

### Basic Iterative Evaluator
```typescript
// iterative-evaluator.ts
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface IterationResult {
  completed: boolean;
  tasksCompleted: string[];
  nextFocus: string;
}

class IterativeEvaluator {
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

// Usage
const evaluator = new IterativeEvaluator();
evaluator.evaluate('https://example.com/article');
```

### Experiment Runner
```typescript
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
```

### Minimal Working Example
```typescript
// minimal-example.ts
import { execSync } from 'child_process';
import * as fs from 'fs';

function iterativeEval(url: string, iterations = 5) {
  const doc = 'working.md';
  
  // Initialize
  execSync(`claude -p "Create working doc for ${url}" --allowedTools Write`);
  
  // Iterate
  for (let i = 1; i <= iterations; i++) {
    console.log(`Iteration ${i}...`);
    
    execSync(`claude -p "Iteration ${i}: Read ${doc}, do next task, update" \
      --max-turns 10 --allowedTools Read,Write,WebSearch`);
    
    if (fs.readFileSync(doc, 'utf-8').includes('COMPLETE')) break;
  }
  
  // Extract result
  execSync(`claude -p "Extract final output from ${doc}" --allowedTools Read`);
}

// Run it
iterativeEval('https://example.com/article');
```

## Cost Analysis for Simple Experiment

With prompt caching:
- Initial document creation: ~$0.005
- Per iteration (cached): ~$0.001
- 5 iterations total: ~$0.01
- Without caching: ~$0.05-0.10

## Next Steps for Experimentation

1. **Quick Test**: Run minimal example on a short article
2. **Measure**: Track iterations needed, time taken, cost
3. **Compare**: Run same article with direct approach
4. **Refine**: Adjust prompts based on results

The beauty is that this is just file I/O - no complex dependencies, easy to debug, and Claude Code's native strengths!