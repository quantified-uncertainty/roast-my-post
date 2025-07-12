#!/usr/bin/env node

const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

// REQUIRES: npm install @anthropic-ai/sdk

async function runWithRealCostTracking() {
  console.log('🚀 Direct API Error Hunter with Real Cost Tracking\n');
  
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });
  
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ Please set ANTHROPIC_API_KEY environment variable');
    console.log('Get your API key from: https://console.anthropic.com/account/keys');
    process.exit(1);
  }
  
  const inputContent = fs.readFileSync(path.join(__dirname, 'input.md'), 'utf8');
  
  const prompt = `Analyze this document for errors. Find 25-30 specific errors including:
1. Typos and grammatical errors (with line numbers)
2. Mathematical mistakes (especially R vs R-squared confusion)
3. Logical contradictions
4. Factual errors
5. Citation issues

For each error provide: line number, exact quote, explanation, and fix.

Document to analyze:
${inputContent}`;

  console.log('📊 Making API call...\n');
  const startTime = Date.now();
  
  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }]
    });
    
    const duration = (Date.now() - startTime) / 1000;
    
    // Extract real usage data
    const usage = response.usage;
    
    // Claude pricing (as of Jan 2025)
    const INPUT_COST_PER_1M = 3.00;  // $3 per million input tokens
    const OUTPUT_COST_PER_1M = 15.00; // $15 per million output tokens
    
    const inputCost = (usage.input_tokens / 1_000_000) * INPUT_COST_PER_1M;
    const outputCost = (usage.output_tokens / 1_000_000) * OUTPUT_COST_PER_1M;
    const totalCost = inputCost + outputCost;
    
    // Save results
    fs.writeFileSync('output.md', response.content[0].text);
    
    // Save cost report
    const costReport = {
      timestamp: new Date().toISOString(),
      model: 'claude-3-5-sonnet-20241022',
      usage: {
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens,
        total_tokens: usage.input_tokens + usage.output_tokens
      },
      cost: {
        input: `$${inputCost.toFixed(4)}`,
        output: `$${outputCost.toFixed(4)}`,
        total: `$${totalCost.toFixed(4)}`
      },
      performance: {
        duration_seconds: duration,
        tokens_per_second: (usage.input_tokens + usage.output_tokens) / duration
      }
    };
    
    fs.writeFileSync('cost-report.json', JSON.stringify(costReport, null, 2));
    
    // Display results
    console.log('✅ Analysis complete!\n');
    console.log('📊 REAL USAGE STATS:');
    console.log(`- Input tokens: ${usage.input_tokens.toLocaleString()}`);
    console.log(`- Output tokens: ${usage.output_tokens.toLocaleString()}`);
    console.log(`- Total tokens: ${(usage.input_tokens + usage.output_tokens).toLocaleString()}`);
    console.log('\n💰 REAL COSTS:');
    console.log(`- Input cost: $${inputCost.toFixed(4)}`);
    console.log(`- Output cost: $${outputCost.toFixed(4)}`);
    console.log(`- TOTAL COST: $${totalCost.toFixed(4)}`);
    console.log(`\n⏱️  Duration: ${duration.toFixed(1)} seconds`);
    console.log(`📄 Results saved to: output.md`);
    console.log(`📊 Cost report saved to: cost-report.json`);
    
    // Count errors found
    const errorCount = (response.content[0].text.match(/Line \d+/gi) || []).length;
    console.log(`\n🔍 Errors found: ~${errorCount}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('api_key')) {
      console.log('\n💡 To get an API key:');
      console.log('1. Go to https://console.anthropic.com');
      console.log('2. Sign up or log in');
      console.log('3. Go to API Keys section');
      console.log('4. Create a new key');
      console.log('5. Run: export ANTHROPIC_API_KEY=your-key-here');
    }
  }
}

// Run
if (require.main === module) {
  runWithRealCostTracking().catch(console.error);
}