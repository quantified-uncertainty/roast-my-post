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

async function findContradictions() {
  console.log('=== CONTRADICTION HUNTER ===');
  console.log('Starting focused search for contradictions and inconsistencies...\n');
  const startTime = Date.now();
  
  try {
    const content = await fs.readFile('./input.md', 'utf-8');
    
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `You are a contradiction and inconsistency detector. Your ONLY job is to find contradictions, inconsistencies, and unclear arguments in this blog post.

Focus exclusively on:
- Statements that contradict each other
- Claims that are inconsistent with presented evidence
- Arguments that don't follow from their premises
- Unclear or ambiguous statements that could be misinterpreted
- Internal logical inconsistencies

DO NOT report on typos, grammar, or mathematical errors. ONLY contradictions and logical inconsistencies.

For each issue found, provide:
1. The contradicting/inconsistent statements (with quotes)
2. Why they contradict or are inconsistent
3. How this affects the argument's validity

Blog post:

${content}`
      }]
    });
    
    const elapsedTime = Date.now() - startTime;
    
    // Write results
    const report = `# Contradictions and Inconsistencies Report

Generated in: ${elapsedTime}ms
Tokens used: ${response.usage.input_tokens} input, ${response.usage.output_tokens} output
Estimated cost: $${((response.usage.input_tokens / 1000) * 0.003 + (response.usage.output_tokens / 1000) * 0.015).toFixed(4)}

## Findings

${response.content[0].text}`;
    
    await fs.writeFile('./contradictions-report.md', report);
    
    console.log(`Analysis complete in ${elapsedTime}ms`);
    console.log(`Report written to contradictions-report.md`);
    console.log(`Found issues: Check the report for details`);
    
    // Log to combined output
    await fs.appendFile('./combined-analysis.log', `\n=== CONTRADICTIONS (${elapsedTime}ms) ===\n${response.content[0].text}\n`);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

findContradictions();