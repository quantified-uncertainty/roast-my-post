#!/usr/bin/env node

/**
 * Manual Tool Confidence Check
 * Tests each tool by navigating to it and checking basic functionality
 */

const puppeteer = require('puppeteer');

const TOOLS = [
  'check-math',
  'check-math-hybrid',
  'check-math-with-mathjs',
  'check-spelling-grammar',
  'fact-checker',
  'extract-factual-claims',
  'extract-forecasting-claims',
  'detect-language-convention',
  'document-chunker',
  'extract-math-expressions',
  'fuzzy-text-locator',
  'link-validator',
  'perplexity-research',
  'forecaster'
];

async function checkTool(page, toolId) {
  try {
    console.log(`\nChecking ${toolId}...`);
    
    // Navigate to tool
    await page.goto(`http://localhost:3000/tools/${toolId}`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Check page loaded
    const title = await page.title();
    if (title.includes('Error') || title.includes('404')) {
      return { tool: toolId, status: 'error', issue: 'Page error' };
    }
    
    // Find buttons
    const buttons = await page.$$eval('button', btns => 
      btns.map(b => b.textContent.trim())
    );
    
    // Check for example buttons (skip Try, Documentation, and submit button)
    const exampleButtons = buttons.filter(b => 
      b && !['Try', 'Documentation'].includes(b) && 
      !b.includes('Check') && !b.includes('Extract') && 
      !b.includes('Detect') && !b.includes('Find') && 
      !b.includes('Validate') && !b.includes('Research') && 
      !b.includes('Generate') && !b.includes('Chunk') && 
      !b.includes('Verify')
    );
    
    if (exampleButtons.length === 0) {
      return { tool: toolId, status: 'warning', issue: 'No examples found' };
    }
    
    // Try clicking first example
    const firstExample = exampleButtons[0];
    const [button] = await page.$x(`//button[contains(text(), "${firstExample.substring(0, 20)}")]`);
    
    if (button) {
      await button.click();
      await page.waitForTimeout(1000);
      
      // Check if form was populated
      const hasInput = await page.evaluate(() => {
        const inputs = document.querySelectorAll('input, textarea');
        return Array.from(inputs).some(i => i.value && i.value.length > 0);
      });
      
      if (!hasInput) {
        return { tool: toolId, status: 'warning', issue: 'Example did not populate form' };
      }
    }
    
    return { tool: toolId, status: 'success', issue: null };
    
  } catch (error) {
    return { tool: toolId, status: 'error', issue: error.message };
  }
}

async function main() {
  console.log('====================================');
  console.log('MANUAL TOOL CONFIDENCE CHECK');
  console.log('====================================');
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  const results = [];
  
  for (const tool of TOOLS) {
    const result = await checkTool(page, tool);
    results.push(result);
    
    const icon = result.status === 'success' ? '✅' : 
                 result.status === 'warning' ? '⚠️' : '❌';
    console.log(`${icon} ${tool}: ${result.issue || 'Working correctly'}`);
  }
  
  await browser.close();
  
  // Calculate confidence
  const successful = results.filter(r => r.status === 'success').length;
  const warnings = results.filter(r => r.status === 'warning').length;
  const errors = results.filter(r => r.status === 'error').length;
  const total = results.length;
  
  // Success = 100%, Warning = 50%, Error = 0%
  const score = (successful * 100 + warnings * 50) / total;
  
  console.log('\n====================================');
  console.log('RESULTS SUMMARY');
  console.log('====================================');
  console.log(`✅ Success: ${successful}/${total}`);
  console.log(`⚠️  Warnings: ${warnings}/${total}`);
  console.log(`❌ Errors: ${errors}/${total}`);
  console.log(`\nCONFIDENCE SCORE: ${score.toFixed(1)}%`);
  
  if (score >= 99) {
    console.log('🎉 EXCELLENT: 99% confidence achieved!');
  } else if (score >= 90) {
    console.log('🟢 GOOD: Almost at 99% confidence');
  } else if (score >= 70) {
    console.log('🟡 FAIR: Some issues need attention');
  } else {
    console.log('🔴 NEEDS WORK: Multiple issues found');
  }
  
  console.log('====================================');
  
  // Show issues if any
  if (errors > 0 || warnings > 0) {
    console.log('\nISSUES FOUND:');
    results.filter(r => r.status !== 'success').forEach(r => {
      console.log(`- ${r.tool}: ${r.issue}`);
    });
  }
}

main().catch(console.error);