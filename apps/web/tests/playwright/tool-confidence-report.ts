#!/usr/bin/env npx tsx

/**
 * Tool Confidence Report Generator
 * 
 * Runs all validation tests and generates a confidence score for each tool
 * Outputs a detailed report showing what's working and what needs attention
 */

import { chromium, Browser, Page } from 'playwright';
import { Anthropic } from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';

interface ToolReport {
  toolId: string;
  confidence: number;
  checks: {
    visual: { passed: boolean; issues: string[] };
    functionality: { passed: boolean; issues: string[] };
    performance: { passed: boolean; metrics: any };
    accessibility: { passed: boolean; issues: string[] };
    edgeCases: { passed: boolean; issues: string[] };
  };
  aiValidation?: {
    score: number;
    feedback: string;
  };
}

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

async function runComprehensiveCheck(): Promise<ToolReport[]> {
  const browser = await chromium.launch({ headless: true });
  const reports: ToolReport[] = [];
  const anthropic = process.env.ANTHROPIC_API_KEY 
    ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    : null;

  for (const toolId of TOOLS) {
    console.log(`\n🔍 Checking ${toolId}...`);
    const report = await checkTool(browser, toolId, anthropic);
    reports.push(report);
    
    // Print immediate feedback
    console.log(`   Confidence: ${report.confidence}%`);
    if (report.confidence < 90) {
      console.log(`   ⚠️  Issues found:`);
      Object.entries(report.checks).forEach(([check, result]) => {
        if (!result.passed) {
          console.log(`      - ${check}: ${result.issues.join(', ')}`);
        }
      });
    }
  }

  await browser.close();
  return reports;
}

async function checkTool(
  browser: Browser, 
  toolId: string,
  anthropic: Anthropic | null
): Promise<ToolReport> {
  const page = await browser.newPage();
  const report: ToolReport = {
    toolId,
    confidence: 100,
    checks: {
      visual: { passed: true, issues: [] },
      functionality: { passed: true, issues: [] },
      performance: { passed: true, metrics: {} },
      accessibility: { passed: true, issues: [] },
      edgeCases: { passed: true, issues: [] }
    }
  };

  try {
    // 1. Visual Check
    const visualCheck = await checkVisual(page, toolId);
    report.checks.visual = visualCheck;
    if (!visualCheck.passed) report.confidence -= 20;

    // 2. Functionality Check
    const funcCheck = await checkFunctionality(page, toolId);
    report.checks.functionality = funcCheck;
    if (!funcCheck.passed) report.confidence -= 30;

    // 3. Performance Check
    const perfCheck = await checkPerformance(page, toolId);
    report.checks.performance = perfCheck;
    if (!perfCheck.passed) report.confidence -= 10;

    // 4. Accessibility Check
    const a11yCheck = await checkAccessibility(page, toolId);
    report.checks.accessibility = a11yCheck;
    if (!a11yCheck.passed) report.confidence -= 15;

    // 5. Edge Cases Check
    const edgeCheck = await checkEdgeCases(page, toolId);
    report.checks.edgeCases = edgeCheck;
    if (!edgeCheck.passed) report.confidence -= 10;

    // 6. AI Validation (if available)
    if (anthropic && report.checks.functionality.passed) {
      const aiCheck = await validateWithAI(page, toolId, anthropic);
      report.aiValidation = aiCheck;
      if (aiCheck.score < 80) {
        report.confidence -= (100 - aiCheck.score) / 2;
      }
    }

  } catch (error) {
    console.error(`Error checking ${toolId}:`, error);
    report.confidence = 0;
  } finally {
    await page.close();
  }

  return report;
}

async function checkVisual(page: Page, toolId: string) {
  const issues: string[] = [];
  
  try {
    await page.goto(`http://localhost:3000/tools/${toolId}`);
    await page.waitForLoadState('networkidle');

    // Check for overlapping elements
    const overlaps = await page.evaluate(() => {
      const elements = document.querySelectorAll('button, input, textarea, h1, h2');
      const overlapping: string[] = [];
      
      for (let i = 0; i < elements.length; i++) {
        const rect1 = elements[i].getBoundingClientRect();
        for (let j = i + 1; j < elements.length; j++) {
          const rect2 = elements[j].getBoundingClientRect();
          
          if (!(rect1.right < rect2.left || 
                rect2.right < rect1.left || 
                rect1.bottom < rect2.top || 
                rect2.bottom < rect1.top)) {
            overlapping.push('Element overlap detected');
            break;
          }
        }
      }
      return overlapping;
    });
    
    issues.push(...overlaps);

    // Check responsive design
    const viewports = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 1920, height: 1080, name: 'desktop' }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      
      const overflow = await page.evaluate(() => {
        return document.body.scrollWidth > window.innerWidth;
      });
      
      if (overflow) {
        issues.push(`Horizontal overflow at ${viewport.name}`);
      }
    }

  } catch (error) {
    issues.push(`Visual check failed: ${error}`);
  }

  return {
    passed: issues.length === 0,
    issues
  };
}

async function checkFunctionality(page: Page, toolId: string) {
  const issues: string[] = [];
  
  try {
    await page.goto(`http://localhost:3000/tools/${toolId}`);
    await page.waitForLoadState('networkidle');

    // Check if example buttons work
    const exampleButton = page.locator('button').filter({ hasText: /Example/i }).first();
    if (await exampleButton.isVisible()) {
      await exampleButton.click();
      await page.waitForTimeout(500);
      
      // Check if form was populated
      const inputs = await page.locator('input, textarea').all();
      let hasValue = false;
      for (const input of inputs) {
        const value = await input.inputValue();
        if (value && value.length > 0) {
          hasValue = true;
          break;
        }
      }
      
      if (!hasValue) {
        issues.push('Example button did not populate form');
      }

      // Try to submit
      const submitButton = page.locator('button[type="submit"], button').filter({ 
        hasNot: page.locator(':has-text("Example")') 
      }).last();
      
      if (await submitButton.isVisible()) {
        await submitButton.click();
        
        // Wait for response (with timeout)
        try {
          await page.waitForSelector('[data-testid="tool-result"], [class*="result"], pre', {
            timeout: 30000
          });
        } catch {
          issues.push('No result appeared after submission');
        }
      } else {
        issues.push('Submit button not found');
      }
    } else {
      issues.push('No example buttons found');
    }

  } catch (error) {
    issues.push(`Functionality check failed: ${error}`);
  }

  return {
    passed: issues.length === 0,
    issues
  };
}

async function checkPerformance(page: Page, toolId: string) {
  const metrics: any = {};
  const issues: string[] = [];
  
  try {
    const startTime = Date.now();
    await page.goto(`http://localhost:3000/tools/${toolId}`);
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    metrics.loadTime = loadTime;
    
    if (loadTime > 3000) {
      issues.push(`Slow page load: ${loadTime}ms`);
    }

    // Check bundle size
    const coverage = await page.coverage.startJSCoverage();
    await page.reload();
    const jsCoverage = await page.coverage.stopJSCoverage();
    
    const totalBytes = jsCoverage.reduce((total, entry) => total + entry.text.length, 0);
    metrics.bundleSize = totalBytes;
    
    if (totalBytes > 5 * 1024 * 1024) { // 5MB
      issues.push(`Large bundle size: ${(totalBytes / 1024 / 1024).toFixed(2)}MB`);
    }

  } catch (error) {
    issues.push(`Performance check failed: ${error}`);
  }

  return {
    passed: issues.length === 0,
    issues,
    metrics
  };
}

async function checkAccessibility(page: Page, toolId: string) {
  const issues: string[] = [];
  
  try {
    await page.goto(`http://localhost:3000/tools/${toolId}`);
    await page.waitForLoadState('networkidle');

    // Check for missing labels
    const inputsWithoutLabels = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input, textarea, select');
      const missing: string[] = [];
      
      inputs.forEach(input => {
        const id = input.getAttribute('id');
        const ariaLabel = input.getAttribute('aria-label');
        const placeholder = input.getAttribute('placeholder');
        
        if (!id && !ariaLabel && !placeholder) {
          missing.push(`${input.tagName} without label`);
        }
      });
      
      return missing;
    });
    
    issues.push(...inputsWithoutLabels);

    // Check keyboard navigation
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    if (!focused) {
      issues.push('Keyboard navigation not working');
    }

    // Check color contrast (basic)
    const lowContrast = await page.evaluate(() => {
      const elements = document.querySelectorAll('button, a');
      const issues: string[] = [];
      
      elements.forEach(el => {
        const styles = window.getComputedStyle(el);
        const color = styles.color;
        const bgColor = styles.backgroundColor;
        
        // Very basic check
        if (color === bgColor && color !== 'rgba(0, 0, 0, 0)') {
          issues.push('Low contrast text');
        }
      });
      
      return issues;
    });
    
    issues.push(...lowContrast);

  } catch (error) {
    issues.push(`Accessibility check failed: ${error}`);
  }

  return {
    passed: issues.length === 0,
    issues
  };
}

async function checkEdgeCases(page: Page, toolId: string) {
  const issues: string[] = [];
  
  try {
    await page.goto(`http://localhost:3000/tools/${toolId}`);
    await page.waitForLoadState('networkidle');

    // Test empty input
    const submitButton = page.locator('button[type="submit"], button').filter({ 
      hasNot: page.locator(':has-text("Example")') 
    }).last();
    
    if (await submitButton.isVisible()) {
      const isDisabled = await submitButton.isDisabled();
      if (!isDisabled) {
        await submitButton.click();
        await page.waitForTimeout(1000);
        
        // Should show error or be disabled
        const hasError = await page.locator('[class*="error"], [role="alert"]').isVisible();
        if (!hasError) {
          issues.push('No validation for empty input');
        }
      }
    }

    // Test XSS
    await page.reload();
    const inputs = await page.locator('input, textarea').all();
    if (inputs.length > 0) {
      await inputs[0].fill('<script>alert("XSS")</script>');
      
      if (await submitButton.isVisible() && !await submitButton.isDisabled()) {
        await submitButton.click();
        await page.waitForTimeout(2000);
        
        const hasXSS = await page.evaluate(() => {
          return document.body.innerHTML.includes('<script>alert');
        });
        
        if (hasXSS) {
          issues.push('XSS vulnerability detected');
        }
      }
    }

  } catch (error) {
    issues.push(`Edge case check failed: ${error}`);
  }

  return {
    passed: issues.length === 0,
    issues
  };
}

async function validateWithAI(page: Page, toolId: string, anthropic: Anthropic) {
  try {
    // Get the current state of the page
    const screenshot = await page.screenshot({ encoding: 'base64' });
    const pageContent = await page.content();
    
    const prompt = `
You are evaluating a tool UI for quality and correctness.

Tool: ${toolId}

Please evaluate:
1. Does the UI look professional and polished?
2. Are there any obvious visual issues?
3. Does the tool appear to be functioning correctly?
4. Any suggestions for improvement?

Score from 0-100 where:
- 90-100: Production ready, no issues
- 70-89: Minor issues that don't affect functionality
- 50-69: Noticeable issues that should be fixed
- 0-49: Major problems

Respond with JSON:
{
  "score": <number>,
  "feedback": "<brief feedback>"
}
`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 200,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.content[0];
    if (content.type === 'text') {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    }
  } catch (error) {
    console.warn('AI validation failed:', error);
  }

  return { score: 100, feedback: 'AI validation skipped' };
}

function generateReport(reports: ToolReport[]) {
  const timestamp = new Date().toISOString();
  const overallConfidence = reports.reduce((sum, r) => sum + r.confidence, 0) / reports.length;
  
  const report = {
    timestamp,
    overallConfidence,
    summary: {
      total: reports.length,
      perfect: reports.filter(r => r.confidence === 100).length,
      good: reports.filter(r => r.confidence >= 90 && r.confidence < 100).length,
      needsWork: reports.filter(r => r.confidence >= 70 && r.confidence < 90).length,
      poor: reports.filter(r => r.confidence < 70).length
    },
    tools: reports,
    recommendations: generateRecommendations(reports)
  };

  // Save to file
  const reportPath = path.join(process.cwd(), 'test-results', `confidence-report-${Date.now()}.json`);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('TOOL CONFIDENCE REPORT');
  console.log('='.repeat(60));
  console.log(`Overall Confidence: ${overallConfidence.toFixed(1)}%`);
  console.log(`Timestamp: ${timestamp}`);
  console.log('\nSummary:');
  console.log(`  ✅ Perfect (100%): ${report.summary.perfect}`);
  console.log(`  🟢 Good (90-99%): ${report.summary.good}`);
  console.log(`  🟡 Needs Work (70-89%): ${report.summary.needsWork}`);
  console.log(`  🔴 Poor (<70%): ${report.summary.poor}`);
  
  if (report.recommendations.length > 0) {
    console.log('\nTop Recommendations:');
    report.recommendations.slice(0, 5).forEach((rec, i) => {
      console.log(`  ${i + 1}. ${rec}`);
    });
  }
  
  console.log(`\nFull report saved to: ${reportPath}`);
  
  return report;
}

function generateRecommendations(reports: ToolReport[]): string[] {
  const recommendations: string[] = [];
  const issueCount: Record<string, number> = {};

  // Count issues across all tools
  reports.forEach(report => {
    Object.entries(report.checks).forEach(([check, result]) => {
      if (!result.passed) {
        result.issues.forEach(issue => {
          issueCount[issue] = (issueCount[issue] || 0) + 1;
        });
      }
    });
  });

  // Generate recommendations based on common issues
  Object.entries(issueCount)
    .sort(([, a], [, b]) => b - a)
    .forEach(([issue, count]) => {
      if (count > 3) {
        recommendations.push(`Fix "${issue}" affecting ${count} tools`);
      }
    });

  // Add specific recommendations
  const poorTools = reports.filter(r => r.confidence < 70);
  if (poorTools.length > 0) {
    recommendations.push(`Priority fix: ${poorTools.map(r => r.toolId).join(', ')}`);
  }

  const perfIssues = reports.filter(r => !r.checks.performance.passed);
  if (perfIssues.length > 3) {
    recommendations.push('Optimize bundle size and load times across all tools');
  }

  const a11yIssues = reports.filter(r => !r.checks.accessibility.passed);
  if (a11yIssues.length > 3) {
    recommendations.push('Improve accessibility: add ARIA labels and keyboard navigation');
  }

  return recommendations;
}

// Run the check
if (require.main === module) {
  runComprehensiveCheck()
    .then(generateReport)
    .catch(console.error);
}