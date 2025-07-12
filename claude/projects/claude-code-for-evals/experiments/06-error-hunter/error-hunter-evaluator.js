#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class ErrorHunterEvaluator {
  constructor(config = {}) {
    this.maxIterations = config.maxIterations || 6;
    this.workingDoc = config.workingDoc || 'error_hunting_eval.md';
    this.verbose = config.verbose !== false;
  }

  log(message) {
    if (this.verbose) console.log(message);
  }

  async runClaude(prompt, maxTurns = 10, tools = 'Read,Write') {
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
    this.log(`🔍 Starting Error Hunter evaluation of ${articlePath}`);
    const startTime = Date.now();

    // Initialize working document with error-hunting focus
    await this.initializeDocument(articlePath);

    // Run iterations
    let iterationsUsed = 0;
    for (let i = 1; i <= this.maxIterations; i++) {
      this.log(`\n🔍 Iteration ${i}/${this.maxIterations}`);
      
      const completed = await this.runIteration(i, articlePath);
      iterationsUsed = i;
      
      if (completed && i >= 4) { // Minimum 4 iterations
        this.log('✅ Error hunting complete!');
        break;
      }
    }

    // Extract final report
    const finalReport = await this.extractFinalReport();
    
    const duration = Date.now() - startTime;
    this.log(`\n⏱️  Total time: ${Math.round(duration / 1000)}s`);

    return {
      success: true,
      output: finalReport,
      iterations: iterationsUsed,
      duration,
      workingDoc: this.workingDoc
    };
  }

  async initializeDocument(articlePath) {
    const prompt = `Create a working document for error-hunting evaluation of ${articlePath}.

CRITICAL: Focus on finding SPECIFIC, CONCRETE errors, not vague criticisms.

Structure the document with these sections:
- Metadata
- Error Hunting Tasks (8 specific tasks):
  □ Find typos and grammatical errors (quote exact text)
  □ Verify all numerical claims with web search
  □ Check mathematical statements for accuracy
  □ Identify logical contradictions
  □ Fact-check specific claims about people/organizations
  □ Verify citations and references work
  □ Find inconsistent terminology or notation
  □ Identify unsupported factual assertions
- Current Focus
- Errors Found (with line numbers and exact quotes)
- Verification Results
- Final Report

Set max iterations to ${this.maxIterations}. 
Goal: Find at least 10 specific, quotable errors or issues.`;

    await this.runClaude(prompt, 8, 'Write');
  }

  getTaskForIteration(iterNum) {
    const tasks = [
      {
        name: "Find typos and grammatical errors",
        prompt: `Search for typos, repeated words, grammatical errors. 
Quote the EXACT text with line numbers. 
Look for things like "crossing crossing" or broken sentence structures.
Find at least 3-5 specific issues.`
      },
      {
        name: "Verify numerical claims",
        prompt: `Find EVERY numerical claim in the article.
Use WebSearch to verify each one.
Examples: "NBA average height 6'7"", population frequencies, percentages.
Mark each as ✓ (verified), ✗ (wrong), or ~ (approximately correct).
Include the correct numbers if wrong.`,
        tools: 'Read,Write,WebSearch'
      },
      {
        name: "Check mathematical statements",
        prompt: `Examine all mathematical claims carefully.
Look for:
- Confusion between R and R-squared
- Wrong formulas or relationships  
- Incorrect statistical interpretations
- Calculation errors
Quote the exact problematic text and explain the error.`,
        tools: 'Read,Write,WebSearch'
      },
      {
        name: "Find logical contradictions",
        prompt: `Identify places where the article contradicts itself.
Look for:
- Conflicting recommendations
- Statements that undermine earlier claims
- Inconsistent examples
Quote both parts that contradict each other.`
      },
      {
        name: "Fact-check people and organizations",
        prompt: `Find all claims about specific people or organizations.
Use WebSearch to verify:
- Claims about Bill Gates' intelligence
- Sports statistics
- Research citations
Mark each as verified or unverified with evidence.`,
        tools: 'Read,Write,WebSearch'
      },
      {
        name: "Check citations and references",
        prompt: `Check every link and reference.
Try to access them (note if broken).
Check if citations actually support the claims.
Note outdated sources (pre-2020).
List each problematic citation.`,
        tools: 'Read,Write,WebSearch'
      },
      {
        name: "Find terminology inconsistencies",
        prompt: `Look for inconsistent use of terms or notation.
Examples:
- "+4SD" vs "4SD"
- "R-square" vs "R-squared" vs "R²"
- Switching between technical and casual language
Quote each inconsistency.`
      },
      {
        name: "Identify unsupported assertions",
        prompt: `Find factual claims presented without evidence.
Look for:
- "I'd guess" followed by specific numbers
- Claims about "most" or "all" without data
- Speculation presented as fact
Quote the exact unsupported claims.`
      }
    ];

    // Cycle through tasks or pick based on iteration
    return tasks[Math.min(iterNum - 1, tasks.length - 1)];
  }

  async runIteration(iterNum, articlePath) {
    const task = this.getTaskForIteration(iterNum);
    const tools = task.tools || 'Read,Write';
    
    const prompt = `You are iteration ${iterNum} of ${this.maxIterations} doing error-hunting.

1. Read the working document at ${this.workingDoc}
2. Read the article at ${articlePath} 
3. Current task: ${task.name}

${task.prompt}

4. Add ALL findings to the "Errors Found" section with:
   - Line number or section
   - EXACT quote of problematic text
   - Specific explanation of the error
   - Correction if applicable

5. Mark task complete [x]
6. If this is iteration ${this.maxIterations} or you've found 15+ specific errors, 
   create the final report summarizing all concrete issues found.

Be extremely specific. Vague criticisms are not useful.`;

    await this.runClaude(prompt, 15, tools);

    // Check if we have enough errors or reached max iterations
    if (fs.existsSync(this.workingDoc)) {
      const content = fs.readFileSync(this.workingDoc, 'utf-8');
      const errorCount = (content.match(/Line \d+:|Section:|Error \d+:/g) || []).length;
      return errorCount >= 15 || iterNum >= this.maxIterations;
    }
    return false;
  }

  async extractFinalReport() {
    const prompt = `Read ${this.workingDoc} and create a final error report.

Structure:
# Error Hunting Report: [Article Title]

## Summary
- Total specific errors found: [number]
- Most serious issues: [top 3]

## Specific Errors by Category

### Typos and Grammar
[List each with line number and exact quote]

### Numerical Errors  
[List each with claim vs. reality]

### Mathematical Mistakes
[List each with explanation]

### Logical Contradictions
[List contradicting statements]

### Unverified Claims
[List each with verification status]

### Other Issues
[Any additional specific problems]

## Recommendations
[Specific fixes for the most important errors]

Save as final_error_report.md`;

    await this.runClaude(prompt, 5, 'Read,Write');
    
    if (fs.existsSync('final_error_report.md')) {
      return fs.readFileSync('final_error_report.md', 'utf-8');
    }
    return null;
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: ./error-hunter-evaluator.js <article-path> [options]');
    console.log('Options:');
    console.log('  --iterations <n>  Max iterations (default: 6, min: 4)');
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
      config.maxIterations = Math.max(4, parseInt(args[i + 1]));
      i++;
    } else if (args[i] === '--output' && args[i + 1]) {
      config.workingDoc = args[i + 1];
      i++;
    } else if (args[i] === '--quiet') {
      config.verbose = false;
    }
  }

  const evaluator = new ErrorHunterEvaluator(config);
  evaluator.evaluate(articlePath)
    .then(result => {
      console.log('\n📊 Error Hunting Results:');
      console.log(`Iterations used: ${result.iterations}`);
      console.log(`Duration: ${result.duration}ms`);
      console.log(`Working doc: ${result.workingDoc}`);
      console.log(`Final report: final_error_report.md`);
    })
    .catch(error => {
      console.error('Evaluation failed:', error);
      process.exit(1);
    });
}

module.exports = ErrorHunterEvaluator;