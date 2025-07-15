#!/usr/bin/env tsx
/**
 * Test math checker variations without caching
 * This should reveal the true non-determinism
 */

import { anthropic } from '../src/types/openai';

// More ambiguous test cases that might produce variations
const ambiguousTestCase = `
  The expression 6/2(1+2) equals 9.
  
  In our approximation, π² ≈ 10.
  
  The limit of sin(x)/x as x approaches 0 is approximately 1.
  
  For practical purposes, we can say that 0.999... = 1.
  
  The probability interpretation suggests that √(-1) doesn't exist.
  
  When x is very large, e^(-x) is essentially 0.
`;

async function testWithoutCache() {
  console.log('Math Error Checker - No Cache Variation Test');
  console.log('===========================================\n');
  
  // Temporarily disable cache by not using the cached client
  const noCacheClient = new (await import('@anthropic-ai/sdk')).default({
    apiKey: process.env.ANTHROPIC_API_KEY || '',
  });
  
  const NUM_RUNS = 5;
  const results: any[] = [];
  
  for (let i = 1; i <= NUM_RUNS; i++) {
    console.log(`\nRun ${i}/${NUM_RUNS}:`);
    
    try {
      const response = await noCacheClient.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        temperature: 0,
        system: [{
          type: "text",
          text: `You are a mathematical reviewer. Identify calculation errors, logical fallacies, and incorrect mathematical statements.
          
CRITICAL: Use the report_math_errors tool to provide your analysis.

Focus on objective mathematical errors. Consider context and common approximations.`
        }],
        messages: [{
          role: "user",
          content: `Analyze this text for mathematical errors:\n\n${ambiguousTestCase}`
        }],
        tools: [{
          name: "report_math_errors",
          description: "Report mathematical errors found in the text",
          input_schema: {
            type: "object" as const,
            properties: {
              errors: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    text: { type: "string" },
                    description: { type: "string" },
                    severity: { type: "string", enum: ["critical", "major", "minor"] }
                  },
                  required: ["text", "description", "severity"]
                }
              }
            },
            required: ["errors"]
          }
        }],
        tool_choice: { type: "tool", name: "report_math_errors" }
      });
      
      const toolUse = response.content.find((c: any) => c.type === "tool_use") as any;
      if (toolUse) {
        const errors = toolUse.input.errors;
        console.log(`  Found ${errors.length} errors`);
        
        results.push({ run: i, errors, raw: response });
        
        // Show brief summary
        errors.forEach((e: any, idx: number) => {
          console.log(`    ${idx + 1}. [${e.severity}] "${e.text}"`);
        });
      }
    } catch (error) {
      console.error(`  Error in run ${i}:`, error);
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Analyze variations
  console.log('\n\n' + '='.repeat(60));
  console.log('VARIATION ANALYSIS');
  console.log('='.repeat(60));
  
  if (results.length >= 2) {
    // Compare all runs
    const errorTexts = results.map(r => 
      new Set(r.errors.map((e: any) => e.text))
    );
    
    // Find errors that don't appear in all runs
    const allErrorTexts = new Set<string>();
    errorTexts.forEach(set => set.forEach(text => allErrorTexts.add(text)));
    
    console.log(`\nTotal unique errors across all runs: ${allErrorTexts.size}`);
    
    allErrorTexts.forEach(text => {
      const appearances = results.filter(r => 
        r.errors.some((e: any) => e.text === text)
      ).length;
      
      if (appearances < results.length) {
        console.log(`\n"${text}"`);
        console.log(`  Appeared in ${appearances}/${results.length} runs (${(appearances/results.length*100).toFixed(0)}%)`);
        
        // Show how it was described in different runs
        const descriptions = new Set<string>();
        results.forEach(r => {
          const error = r.errors.find((e: any) => e.text === text);
          if (error) descriptions.add(error.description);
        });
        
        if (descriptions.size > 1) {
          console.log(`  ⚠️  Multiple descriptions found:`);
          descriptions.forEach(d => console.log(`    - ${d}`));
        }
      }
    });
    
    // Check for description variations on consistent errors
    console.log('\n\nDescription variations for consistent errors:');
    allErrorTexts.forEach(text => {
      const descriptions = results
        .map(r => r.errors.find((e: any) => e.text === text))
        .filter(e => e)
        .map(e => e.description);
      
      const uniqueDescriptions = [...new Set(descriptions)];
      if (uniqueDescriptions.length > 1 && descriptions.length === results.length) {
        console.log(`\n"${text}":`);
        uniqueDescriptions.forEach((d, i) => console.log(`  Version ${i+1}: ${d}`));
      }
    });
  }
}

// Run test
testWithoutCache().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});