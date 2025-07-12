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
  process.exit(1);
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

async function analyzeWithFileIO() {
  console.log('Starting analysis WITH file I/O...');
  const startTime = Date.now();
  
  try {
    // Read the sample file
    console.log('Reading sample.md...');
    const fileStartTime = Date.now();
    const content = await fs.readFile('./sample.md', 'utf-8');
    const fileReadTime = Date.now() - fileStartTime;
    console.log(`File read completed in ${fileReadTime}ms`);
    
    // Make API call
    console.log('Calling Claude API...');
    const apiStartTime = Date.now();
    
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `Please analyze this blog post for errors. Look for:
1. Mathematical or logical errors
2. Factual inaccuracies
3. Typos or grammatical issues
4. Contradictions or unclear reasoning

Here's the content:

${content}`
      }]
    });
    
    const apiTime = Date.now() - apiStartTime;
    console.log(`API call completed in ${apiTime}ms`);
    
    // Write results
    console.log('Writing results...');
    const writeStartTime = Date.now();
    await fs.writeFile('./with-file-io-results.md', response.content[0].text);
    const writeTime = Date.now() - writeStartTime;
    console.log(`File write completed in ${writeTime}ms`);
    
    const totalTime = Date.now() - startTime;
    
    // Summary
    console.log('\n=== TIMING SUMMARY (WITH FILE I/O) ===');
    console.log(`File read: ${fileReadTime}ms`);
    console.log(`API call: ${apiTime}ms`);
    console.log(`File write: ${writeTime}ms`);
    console.log(`Total time: ${totalTime}ms`);
    console.log(`I/O overhead: ${fileReadTime + writeTime}ms (${((fileReadTime + writeTime) / totalTime * 100).toFixed(1)}% of total)`);
    
    // Log cost
    console.log(`\nInput tokens: ${response.usage.input_tokens}`);
    console.log(`Output tokens: ${response.usage.output_tokens}`);
    const inputCost = (response.usage.input_tokens / 1000) * 0.003;
    const outputCost = (response.usage.output_tokens / 1000) * 0.015;
    console.log(`Estimated cost: $${(inputCost + outputCost).toFixed(4)}`);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

analyzeWithFileIO();