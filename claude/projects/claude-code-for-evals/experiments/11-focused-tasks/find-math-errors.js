#!/usr/bin/env node

import fs from 'fs/promises';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from project root
dotenv.config({ path: path.join(__dirname, '../../../../../.env') });

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ERROR: ANTHROPIC_API_KEY not found in environment');
  console.error('Please set ANTHROPIC_API_KEY in your .env file');
  process.exit(1);
}


const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

async function findMathErrors() {
  console.log('=== MATH ERROR HUNTER ===');
  console.log('Starting focused search for mathematical and statistical errors...\n');
  const startTime = Date.now();
  
  try {
    const content = await fs.readFile('./input.md', 'utf-8');
    
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `You are a mathematical error detector. Your ONLY job is to find mathematical, statistical, and logical errors in this blog post. 

Focus exclusively on:
- Incorrect mathematical statements or calculations
- Statistical misinterpretations or errors
- Logical fallacies or flawed reasoning
- Misuse of mathematical concepts
- Errors in probability or correlation interpretations

DO NOT report on typos, grammar, or general writing issues. ONLY mathematical/logical errors.

For each error found, provide:
1. The exact quote containing the error
2. Why it's mathematically/logically incorrect
3. What the correct statement should be

Blog post:

${content}`
      }]
    });
    
    const elapsedTime = Date.now() - startTime;
    
    // Write results
    const report = `# Mathematical and Logical Errors Report

Generated in: ${elapsedTime}ms
Tokens used: ${response.usage.input_tokens} input, ${response.usage.output_tokens} output
Estimated cost: $${((response.usage.input_tokens / 1000) * 0.003 + (response.usage.output_tokens / 1000) * 0.015).toFixed(4)}

## Findings

${response.content[0].text}`;
    
    await fs.writeFile('./math-errors-report.md', report);
    
    console.log(`Analysis complete in ${elapsedTime}ms`);
    console.log(`Report written to math-errors-report.md`);
    console.log(`Found errors: Check the report for details`);
    
    // Log to combined output
    await fs.appendFile('./combined-analysis.log', `\n=== MATH ERRORS (${elapsedTime}ms) ===\n${response.content[0].text}\n`);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

findMathErrors();