#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class IterativeEvaluator {
  constructor(config = {}) {
    this.maxIterations = config.maxIterations || 6;
    this.workingDoc = config.workingDoc || 'evaluation_working.md';
    this.verbose = config.verbose !== false;
  }

  log(message) {
    if (this.verbose) console.log(message);
  }

  async runClaude(prompt, maxTurns = 10, tools = 'Read,Write') {
    // Escape prompt for shell
    const escapedPrompt = prompt
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\$/g, '\\$')
      .replace(/`/g, '\\`');
    
    const cmd = `claude -p "${escapedPrompt}" --max-turns ${maxTurns} --allowedTools ${tools}`;
    
    this.log(`Running Claude with ${maxTurns} turns...`);
    
    try {
      const result = execSync(cmd, { 
        stdio: this.verbose ? 'inherit' : 'pipe',
        encoding: 'utf-8'
      });
      return result;
    } catch (error) {
      console.error(`Claude command failed: ${error.message}`);
      throw error;
    }
  }

  async evaluate(articlePath) {
    this.log(`🚀 Starting iterative evaluation of ${articlePath}`);
    const startTime = Date.now();

    // Initialize working document
    await this.initializeDocument(articlePath);

    // Run iterations
    let completed = false;
    let iterationsUsed = 0;
    for (let i = 1; i <= this.maxIterations; i++) {
      this.log(`\n🔄 Iteration ${i}/${this.maxIterations}`);
      
      completed = await this.runIteration(i, articlePath);
      iterationsUsed = i;
      
      if (completed) {
        this.log('✅ Evaluation complete!');
        break;
      }
    }

    // Extract final output
    const finalOutput = await this.extractFinalOutput();
    
    const duration = Date.now() - startTime;
    this.log(`\n⏱️  Total time: ${Math.round(duration / 1000)}s`);

    return {
      success: completed,
      output: finalOutput,
      iterations: iterationsUsed,
      duration,
      workingDoc: this.workingDoc
    };
  }

  async initializeDocument(articlePath) {
    const prompt = `Create a working document for evaluating the article at ${articlePath}.
    
Include these sections:
- Metadata (title, status, iterations)
- Task list with checkboxes:
  □ Extract key claims
  □ Verify facts
  □ Analyze logic
  □ Assess writing style
  □ Generate final evaluation
- Current focus section
- Working memory for findings
- Draft outputs section

Keep it organized and clear.`;

    await this.runClaude(prompt, 5, 'Write');
  }

  async runIteration(iterNum, articlePath) {
    const prompt = `You are iteration ${iterNum} of ${this.maxIterations}.

1. Read the working document at ${this.workingDoc}
2. Read the article at ${articlePath}
3. Check the "Current Focus" task
4. Complete that task thoroughly (aim for 150-200 words)
5. Update the working document with your findings
6. Mark the task complete with [x]
7. Set the next "Current Focus" task
8. If all tasks are done, set Status: COMPLETE`;

    await this.runClaude(prompt, 10, 'Read,Write,WebSearch');

    // Check if complete
    if (fs.existsSync(this.workingDoc)) {
      const content = fs.readFileSync(this.workingDoc, 'utf-8');
      return content.includes('Status: COMPLETE');
    }
    return false;
  }

  async extractFinalOutput() {
    const prompt = `Read ${this.workingDoc} and extract the final evaluation.
    
Create a clean, professional evaluation document with:
- Summary of findings
- Strengths
- Weaknesses  
- Recommendations
- Key highlights

Save as final_evaluation.md`;

    await this.runClaude(prompt, 5, 'Read,Write');
    
    if (fs.existsSync('final_evaluation.md')) {
      return fs.readFileSync('final_evaluation.md', 'utf-8');
    }
    return null;
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: ./iterative-evaluator-v2.js <article-path> [options]');
    console.log('Options:');
    console.log('  --iterations <n>  Max iterations (default: 6)');
    console.log('  --output <file>   Working document name');
    console.log('  --quiet           Less verbose output');
    process.exit(1);
  }

  const articlePath = args[0];
  const config = {
    maxIterations: 6,
    verbose: true
  };

  // Parse options
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--iterations' && args[i + 1]) {
      config.maxIterations = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--output' && args[i + 1]) {
      config.workingDoc = args[i + 1];
      i++;
    } else if (args[i] === '--quiet') {
      config.verbose = false;
    }
  }

  const evaluator = new IterativeEvaluator(config);
  evaluator.evaluate(articlePath)
    .then(result => {
      console.log('\n📊 Evaluation Results:');
      console.log(`Status: ${result.success ? 'Complete' : 'Incomplete'}`);
      console.log(`Iterations used: ${result.iterations}`);
      console.log(`Duration: ${result.duration}ms`);
      console.log(`Working doc: ${result.workingDoc}`);
    })
    .catch(error => {
      console.error('Evaluation failed:', error);
      process.exit(1);
    });
}

module.exports = IterativeEvaluator;