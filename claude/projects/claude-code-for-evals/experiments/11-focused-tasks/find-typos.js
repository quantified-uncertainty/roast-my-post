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

async function findTypos() {
  console.log('=== TYPO HUNTER ===');
  console.log('Starting focused search for typos and grammatical errors...\n');
  const startTime = Date.now();
  
  try {
    const content = await fs.readFile('./input.md', 'utf-8');
    
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `You are a typo and grammar error detector. Your ONLY job is to find spelling mistakes, typos, and grammatical errors in this blog post.

Focus exclusively on:
- Spelling errors
- Typos (repeated words, missing letters, etc.)
- Grammar mistakes
- Punctuation errors
- Formatting inconsistencies (e.g., inconsistent spacing)

DO NOT report on mathematical accuracy, factual content, or writing style. ONLY typos and grammar.

For each error found, provide:
1. The exact text with the error (with some context)
2. What the error is
3. The corrected version

Blog post:

${content}`
      }]
    });
    
    const elapsedTime = Date.now() - startTime;
    
    // Write results
    const report = `# Typos and Grammar Errors Report

Generated in: ${elapsedTime}ms
Tokens used: ${response.usage.input_tokens} input, ${response.usage.output_tokens} output
Estimated cost: $${((response.usage.input_tokens / 1000) * 0.003 + (response.usage.output_tokens / 1000) * 0.015).toFixed(4)}

## Findings

${response.content[0].text}`;
    
    await fs.writeFile('./typos-report.md', report);
    
    console.log(`Analysis complete in ${elapsedTime}ms`);
    console.log(`Report written to typos-report.md`);
    console.log(`Found errors: Check the report for details`);
    
    // Log to combined output
    await fs.appendFile('./combined-analysis.log', `\n=== TYPOS & GRAMMAR (${elapsedTime}ms) ===\n${response.content[0].text}\n`);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

findTypos();