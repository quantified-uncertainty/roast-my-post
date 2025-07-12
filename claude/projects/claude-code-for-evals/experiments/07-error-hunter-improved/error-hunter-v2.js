#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class ErrorHunterV2 {
  constructor(config = {}) {
    this.inputFile = config.inputFile;
    this.maxIterations = config.maxIterations || 6;
    this.maxTurns = config.maxTurns || 15;
    this.baseDir = path.dirname(this.inputFile);
    
    // Create directory structure
    this.dirs = {
      logs: path.join(this.baseDir, 'logs'),
      iterations: path.join(this.baseDir, 'logs', 'iterations'),
      working: path.join(this.baseDir, 'working'),
      output: path.join(this.baseDir, 'output')
    };
    
    Object.values(this.dirs).forEach(dir => {
      fs.mkdirSync(dir, { recursive: true });
    });
    
    // File paths
    this.files = {
      mainLog: path.join(this.dirs.logs, 'run.log'),
      errorsJson: path.join(this.dirs.working, 'errors.json'),
      workingDoc: path.join(this.dirs.working, 'working.md'),
      finalReport: path.join(this.dirs.output, 'report.md'),
      summary: path.join(this.dirs.output, 'summary.json')
    };
    
    // Initialize tracking
    this.errors = [];
    this.iterationResults = [];
    this.totalCost = 0;
    this.totalTokens = 0;
    this.startTime = Date.now();
  }
  
  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [${level}] ${message}\n`;
    fs.appendFileSync(this.files.mainLog, logLine);
    console.log(message);
  }
  
  logIteration(iterNum, message) {
    const iterLog = path.join(this.dirs.iterations, `iter-${iterNum}.log`);
    const timestamp = new Date().toISOString();
    fs.appendFileSync(iterLog, `[${timestamp}] ${message}\n`);
  }
  
  estimateCost(iterationNum, turnsUsed) {
    // Rough estimation based on observed patterns
    const inputTokens = 3000; // ~3k words in input
    const contextGrowth = this.errors.length * 100; // Each error adds ~100 tokens
    const outputTokens = 500; // Average output per turn
    const toolTokens = 200; // Tool use overhead
    
    const totalTokensPerTurn = inputTokens + contextGrowth + outputTokens + toolTokens;
    const iterationTokens = totalTokensPerTurn * turnsUsed;
    
    // Claude pricing (rough estimate)
    const costPer1kTokens = 0.003; // $3 per million
    const iterationCost = (iterationTokens / 1000) * costPer1kTokens;
    
    this.totalTokens += iterationTokens;
    this.totalCost += iterationCost;
    
    return {
      tokens: iterationTokens,
      cost: iterationCost,
      totalTokens: this.totalTokens,
      totalCost: this.totalCost
    };
  }
  
  getTasks() {
    return [
      {
        name: "Find typos and grammatical errors",
        description: "Look for repeated words, missing punctuation, spelling errors, grammar issues. Quote exact text with line numbers.",
        tools: "Read,Write"
      },
      {
        name: "Verify numerical claims",
        description: "Check all numbers, statistics, percentages. Use web search to verify factual accuracy. Note any unsupported claims.",
        tools: "Read,Write,WebSearch"
      },
      {
        name: "Check mathematical statements",
        description: "Verify formulas, calculations, geometric claims. Look especially for R vs R-squared confusion. Check angle calculations.",
        tools: "Read,Write"
      },
      {
        name: "Identify logical contradictions",
        description: "Find statements that contradict each other. Look for inconsistent arguments or self-contradicting examples.",
        tools: "Read,Write"
      },
      {
        name: "Fact-check people and organizations",
        description: "Verify claims about specific people (e.g., Bill Gates), organizations (AMF), statistics about groups (NBA players).",
        tools: "Read,Write,WebSearch"
      },
      {
        name: "Verify citations and references",
        description: "Check if links work, assess source quality, identify missing citations, note potential copyright issues with images.",
        tools: "Read,Write,WebSearch"
      }
    ];
  }
  
  initializeWorkingDoc() {
    const content = `# Error Hunting Progress - ${path.basename(this.inputFile)}

## Overview
- Started: ${new Date().toISOString()}
- Target: Find specific, actionable errors with exact quotes and line numbers
- Max iterations: ${this.maxIterations}

## Tasks
${this.getTasks().map((t, i) => `${i + 1}. ${t.name}`).join('\n')}

## Errors Found

### Iteration 1: ${this.getTasks()[0].name}
*In progress...*

`;
    fs.writeFileSync(this.files.workingDoc, content);
    fs.writeFileSync(this.files.errorsJson, JSON.stringify([], null, 2));
  }
  
  async runIteration(iterNum) {
    const task = this.getTasks()[iterNum - 1];
    if (!task) return null;
    
    this.log(`\n🔍 Iteration ${iterNum}/${this.maxIterations}: ${task.name}`);
    this.logIteration(iterNum, `Starting: ${task.name}`);
    
    const prompt = `You are conducting error-hunting iteration ${iterNum} of ${this.maxIterations}.

Current task: ${task.name}
Description: ${task.description}

Instructions:
1. Read the input document: ${this.inputFile}
2. Read the current working document: ${this.files.workingDoc}
3. Focus ONLY on: ${task.description}
4. Find NEW errors not already listed in the working document
5. For each error found:
   - Quote the EXACT text (with context if needed)
   - Provide the EXACT line number
   - Explain why it's an error
   - Suggest a fix if applicable
6. Update the working document by:
   - Adding your findings under the appropriate iteration section
   - Keeping all previous findings intact
   - Marking the current iteration as complete
   - Adding a placeholder for the next iteration if applicable

Be specific and actionable. Focus on finding 3-5 high-quality errors for this task.`;
    
    const startTime = Date.now();
    let output = '';
    
    try {
      output = execSync(
        `claude -p "${prompt}" --max-turns ${this.maxTurns} --allowedTools ${task.tools}`,
        { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
      );
      
      const duration = Date.now() - startTime;
      // Extract turns from output or use default
      const turnsMatch = output.match(/Running Claude with (\d+) turns/);
      const turnsUsed = turnsMatch ? parseInt(turnsMatch[1]) : 5;
      
      this.logIteration(iterNum, `Completed in ${duration}ms with ${turnsUsed} turns`);
      this.logIteration(iterNum, `Output:\n${output}`);
      
      // Read the updated working document to count errors
      const updatedWorkingDoc = fs.existsSync(this.files.workingDoc) 
        ? fs.readFileSync(this.files.workingDoc, 'utf8') 
        : '';
      const beforeCount = this.errors.length;
      const allErrors = this.parseErrorsFromWorkingDoc(updatedWorkingDoc);
      const newErrors = allErrors.length - beforeCount;
      
      const costEstimate = this.estimateCost(iterNum, turnsUsed || 5);
      
      const result = {
        iteration: iterNum,
        task: task.name,
        duration: duration,
        turnsUsed: turnsUsed || 5,
        errorsFound: newErrors,
        cost: costEstimate.cost,
        tokens: costEstimate.tokens
      };
      
      this.iterationResults.push(result);
      this.log(`✓ Found ${newErrors} new errors | Cost: $${costEstimate.cost.toFixed(4)} | Total: $${costEstimate.totalCost.toFixed(4)}`);
      
      // Update errors.json
      fs.writeFileSync(this.files.errorsJson, JSON.stringify(allErrors, null, 2));
      this.errors = allErrors;
      
      return result;
      
    } catch (error) {
      this.log(`ERROR in iteration ${iterNum}: ${error.message}`, 'ERROR');
      this.logIteration(iterNum, `ERROR: ${error.message}`);
      return null;
    }
  }
  
  parseErrorsFromWorkingDoc(content) {
    const errors = [];
    const lines = content.split('\n');
    let currentCategory = '';
    let errorId = 1;
    
    lines.forEach(line => {
      if (line.startsWith('### Iteration')) {
        currentCategory = line.replace('### ', '').split(':')[1]?.trim() || 'Unknown';
      } else if (line.match(/^\d+\.\s+\*\*Line \d+\*\*/)) {
        const lineMatch = line.match(/Line (\d+)/);
        const lineNum = lineMatch ? parseInt(lineMatch[1]) : 0;
        const description = line.replace(/^\d+\.\s+\*\*Line \d+\*\*:\s*/, '');
        
        errors.push({
          id: errorId++,
          category: currentCategory,
          line: lineNum,
          description: description,
          severity: this.categorizeSeverity(description)
        });
      }
    });
    
    return errors;
  }
  
  categorizeSeverity(description) {
    if (description.toLowerCase().includes('r-squared') || 
        description.toLowerCase().includes('mathematical')) {
      return 'Critical';
    } else if (description.toLowerCase().includes('missing') || 
               description.toLowerCase().includes('incorrect')) {
      return 'Major';
    }
    return 'Minor';
  }
  
  generateFinalReport() {
    this.log('\n📊 Generating final report...');
    
    const duration = (Date.now() - this.startTime) / 1000;
    const errorsByCategory = {};
    const errorsBySeverity = { Critical: 0, Major: 0, Minor: 0 };
    
    this.errors.forEach(error => {
      errorsByCategory[error.category] = (errorsByCategory[error.category] || 0) + 1;
      errorsBySeverity[error.severity]++;
    });
    
    const report = `# Error Hunting Report: ${path.basename(this.inputFile)}
Generated: ${new Date().toISOString()}

## Executive Summary
- **Total Errors Found**: ${this.errors.length}
- **Iterations Completed**: ${this.iterationResults.length}/${this.maxIterations}
- **Total Duration**: ${duration.toFixed(1)} seconds
- **Total Cost**: $${this.totalCost.toFixed(4)}
- **Cost per Error**: $${(this.totalCost / Math.max(this.errors.length, 1)).toFixed(4)}

## Error Breakdown

### By Severity
- Critical: ${errorsBySeverity.Critical} errors
- Major: ${errorsBySeverity.Major} errors  
- Minor: ${errorsBySeverity.Minor} errors

### By Category
${Object.entries(errorsByCategory).map(([cat, count]) => `- ${cat}: ${count} errors`).join('\n')}

## Iteration Performance
${this.iterationResults.map(r => 
  `- Iteration ${r.iteration} (${r.task}): ${r.errorsFound} errors, $${r.cost.toFixed(4)}, ${(r.duration/1000).toFixed(1)}s`
).join('\n')}

## Most Critical Issues

${this.errors.filter(e => e.severity === 'Critical').slice(0, 5).map(e => 
  `1. **Line ${e.line}** (${e.category}): ${e.description}`
).join('\n')}

## All Errors Found

${this.errors.map(e => 
  `${e.id}. **Line ${e.line}** [${e.severity}] - ${e.category}\n   ${e.description}`
).join('\n\n')}

---
Report generated by Error Hunter v2
`;
    
    fs.writeFileSync(this.files.finalReport, report);
    
    // Write summary JSON
    const summary = {
      inputFile: this.inputFile,
      timestamp: new Date().toISOString(),
      duration: duration,
      iterations: {
        completed: this.iterationResults.length,
        max: this.maxIterations
      },
      errors: {
        total: this.errors.length,
        bySeverity: errorsBySeverity,
        byCategory: errorsByCategory
      },
      cost: {
        total: this.totalCost,
        perError: this.totalCost / Math.max(this.errors.length, 1),
        tokens: this.totalTokens
      },
      iterations: this.iterationResults
    };
    
    fs.writeFileSync(this.files.summary, JSON.stringify(summary, null, 2));
    this.log(`\n✅ Report saved to: ${this.files.finalReport}`);
    this.log(`📈 Summary saved to: ${this.files.summary}`);
  }
  
  async run() {
    this.log(`🚀 Error Hunter v2 starting...`);
    this.log(`📄 Input: ${this.inputFile}`);
    this.log(`🎯 Max iterations: ${this.maxIterations}`);
    
    this.initializeWorkingDoc();
    
    for (let i = 1; i <= this.maxIterations; i++) {
      const result = await this.runIteration(i);
      if (!result) {
        this.log(`Stopping at iteration ${i} due to error`, 'WARN');
        break;
      }
      
      // Stop if we've found enough errors or if cost is getting high
      if (this.errors.length >= 25 || this.totalCost > 3.0) {
        this.log(`Stopping early: ${this.errors.length} errors found, cost: $${this.totalCost.toFixed(4)}`);
        break;
      }
    }
    
    this.generateFinalReport();
    
    const duration = (Date.now() - this.startTime) / 1000;
    this.log(`\n🏁 Error Hunter complete!`);
    this.log(`⏱️  Duration: ${duration.toFixed(1)}s`);
    this.log(`💰 Total cost: $${this.totalCost.toFixed(4)}`);
    this.log(`📝 Errors found: ${this.errors.length}`);
  }
}

// Export for use in other scripts
module.exports = ErrorHunterV2;

// Run directly if called as script
if (require.main === module) {
  const inputFile = process.argv[2];
  if (!inputFile) {
    console.error('Usage: node error-hunter-v2.js <input-file>');
    process.exit(1);
  }
  
  const hunter = new ErrorHunterV2({
    inputFile: path.resolve(inputFile),
    maxIterations: 6
  });
  
  hunter.run().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}