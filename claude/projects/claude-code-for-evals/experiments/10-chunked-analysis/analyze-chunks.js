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

async function analyzeChunk(chunkPath, chunkNumber) {
  console.log(`\n=== Analyzing Chunk ${chunkNumber} ===`);
  const startTime = Date.now();
  
  try {
    const content = await fs.readFile(chunkPath, 'utf-8');
    console.log(`Chunk ${chunkNumber} size: ${content.length} characters`);
    
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `You are analyzing chunk ${chunkNumber} of a blog post. Look for:
1. Mathematical or logical errors
2. Factual inaccuracies
3. Typos or grammatical issues
4. Contradictions or unclear reasoning

Focus only on errors in this specific chunk. Be concise.

Chunk content:

${content}`
      }]
    });
    
    const elapsedTime = Date.now() - startTime;
    
    return {
      chunkNumber,
      response: response.content[0].text,
      time: elapsedTime,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens
    };
    
  } catch (error) {
    console.error(`Error analyzing chunk ${chunkNumber}:`, error);
    return null;
  }
}

async function consolidateResults(results) {
  console.log('\n=== Consolidating Results ===');
  const startTime = Date.now();
  
  const consolidationPrompt = `Here are error analyses from 3 chunks of a blog post. Please consolidate them into a single, well-organized report. Group similar errors together and eliminate any duplicates.

${results.map(r => `Chunk ${r.chunkNumber}:\n${r.response}`).join('\n\n---\n\n')}

Please provide a consolidated error report with:
1. A summary of key issues found
2. Detailed findings organized by error type
3. Overall assessment`;
  
  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: consolidationPrompt
      }]
    });
    
    const elapsedTime = Date.now() - startTime;
    
    return {
      consolidated: response.content[0].text,
      time: elapsedTime,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens
    };
    
  } catch (error) {
    console.error('Error consolidating results:', error);
    return null;
  }
}

async function runChunkedAnalysis() {
  console.log('Starting chunked analysis...');
  const overallStartTime = Date.now();
  
  // Analyze chunks in parallel
  const chunkPromises = [
    analyzeChunk('./chunk1.md', 1),
    analyzeChunk('./chunk2.md', 2),
    analyzeChunk('./chunk3.md', 3)
  ];
  
  console.log('\nAnalyzing all chunks in parallel...');
  const results = await Promise.all(chunkPromises);
  
  // Filter out any failed chunks
  const successfulResults = results.filter(r => r !== null);
  
  if (successfulResults.length === 0) {
    console.error('All chunk analyses failed!');
    process.exit(1);
  }
  
  // Consolidate results
  const consolidation = await consolidateResults(successfulResults);
  
  // Write outputs
  console.log('\nWriting results...');
  
  // Write individual chunk results
  for (const result of successfulResults) {
    await fs.writeFile(
      `./chunk${result.chunkNumber}-analysis.md`,
      `# Chunk ${result.chunkNumber} Analysis\n\nTime: ${result.time}ms\n\n${result.response}`
    );
  }
  
  // Write consolidated report
  if (consolidation) {
    await fs.writeFile(
      './consolidated-report.md',
      `# Consolidated Error Report\n\nConsolidation time: ${consolidation.time}ms\n\n${consolidation.consolidated}`
    );
  }
  
  // Calculate totals
  const totalTime = Date.now() - overallStartTime;
  const totalInputTokens = successfulResults.reduce((sum, r) => sum + r.inputTokens, 0) + 
                          (consolidation ? consolidation.inputTokens : 0);
  const totalOutputTokens = successfulResults.reduce((sum, r) => sum + r.outputTokens, 0) + 
                           (consolidation ? consolidation.outputTokens : 0);
  
  const inputCost = (totalInputTokens / 1000) * 0.003;
  const outputCost = (totalOutputTokens / 1000) * 0.015;
  const totalCost = inputCost + outputCost;
  
  // Summary report
  console.log('\n=== CHUNKED ANALYSIS SUMMARY ===');
  console.log(`Chunks analyzed: ${successfulResults.length}/3`);
  console.log('\nTiming breakdown:');
  successfulResults.forEach(r => {
    console.log(`  Chunk ${r.chunkNumber}: ${r.time}ms`);
  });
  if (consolidation) {
    console.log(`  Consolidation: ${consolidation.time}ms`);
  }
  console.log(`  Total time: ${totalTime}ms`);
  
  console.log('\nToken usage:');
  console.log(`  Total input tokens: ${totalInputTokens}`);
  console.log(`  Total output tokens: ${totalOutputTokens}`);
  console.log(`  Estimated cost: $${totalCost.toFixed(4)}`);
  
  // Write summary
  const summary = {
    chunks: successfulResults.length,
    timings: {
      chunks: successfulResults.map(r => ({ chunk: r.chunkNumber, time: r.time })),
      consolidation: consolidation ? consolidation.time : null,
      total: totalTime
    },
    tokens: {
      input: totalInputTokens,
      output: totalOutputTokens
    },
    cost: totalCost
  };
  
  await fs.writeFile('./summary.json', JSON.stringify(summary, null, 2));
  console.log('\nSummary written to summary.json');
}

runChunkedAnalysis();