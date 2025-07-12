#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Optimized Claude Code Error Hunter\n');

// Pre-read the document
const inputContent = fs.readFileSync(path.join(__dirname, 'input.md'), 'utf8');

// Create a comprehensive prompt with the content already included
const prompt = `I'm providing you with a document to analyze for errors. 

<document>
${inputContent}
</document>

Please analyze this document and find 25-30 specific errors including:
1. Typos and grammatical errors (with line numbers)
2. Mathematical mistakes (especially R vs R-squared confusion)  
3. Logical contradictions
4. Factual errors requiring verification
5. Citation and reference issues

For each error, provide:
- Line number
- Exact quote
- Explanation of the error
- Suggested fix

IMPORTANT: 
- Use WebSearch tool when you need to verify facts
- Work through the document systematically
- Output your findings as you go
- No need to read files - I've provided the content above
- Just output your findings directly to the console

Start your analysis now.`;

console.log('Running Claude with pre-loaded content...\n');

const startTime = Date.now();

// Run Claude with the content already provided
execSync(
  `claude -p "${prompt.replace(/"/g, '\\"')}" --max-turns 20 --allowedTools WebSearch`,
  { stdio: 'inherit' }
);

const duration = (Date.now() - startTime) / 1000;
console.log(`\n⏱️  Completed in ${duration.toFixed(1)} seconds`);

// Note: Output will be in console, user can redirect to file if needed
console.log('\n💡 Tip: Run with > output.md to save results to file');