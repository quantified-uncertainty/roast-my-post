#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import { z } from 'zod';

const prisma = new PrismaClient();

async function testAnalysis() {
  // Load the config
  const configPath = './scripts/epistemic-agent-config.json';
  const configContent = await fs.readFile(configPath, 'utf-8');
  const config = JSON.parse(configContent);
  console.log('🔍 Testing analysis against real evaluations...\n');
  
  // For now, use mock data to demonstrate the analysis
  const useMockData = true;
  
  if (useMockData) {
    console.log('Using mock evaluation data for demonstration...');
    
    // Mock evaluation data for testing
    const mockEvaluation = {
      id: 'mock-1',
      analysis: `
## 🎯 Key Claims Analysis

**Central Claims:**
1. The author argues for increased AI safety funding: Evidence strength: moderate | Hidden assumptions: assumes current funding is insufficient
2. Technical alignment is presented as solvable: Evidence strength: weak | Alternative interpretation: may be intractable

<analysis>
The document makes several strong claims about AI safety but lacks empirical backing for key assertions. The reasoning relies heavily on intuition pumps rather than concrete evidence.
</analysis>

**Most Controversial Claim:** AI alignment can be solved with current approaches
**Most Robust Claim:** More resources should be allocated to safety research

## 🧠 Cognitive Biases Detected

**Primary biases observed:**
- **Confirmation bias**: Manifests in selective citation of supportive research
- **Availability heuristic**: Evidence: "recent incidents prove the risk" suggests overweighting recent events

**Impact on conclusions:** These biases lead to overconfidence in proposed solutions`,
      comments: [{
        id: 'comment-1',
        content: `### 🔍 Critical Missing Context
        
What's absent but necessary:
1. **Comparative risk analysis**: Why it matters: Cannot assess if AI risk deserves priority over other x-risks
2. **Cost-benefit of proposed interventions**: Changes interpretation by: revealing opportunity costs

Most damaging omission: No discussion of how proposed solutions might fail`
      }]
    };
    
    analyzeEvaluation(mockEvaluation as any, config);
    
    // Add a second mock evaluation to show variety
    const mockEvaluation2 = {
      id: 'mock-2',
      analysis: `
## 🔍 Critical Missing Context

What's absent but necessary:
1. **Literature review**: Why it matters: No engagement with existing research on the topic
2. **Alternative hypotheses**: Changes interpretation by: revealing selection bias

Most damaging omission: No discussion of implementation challenges

## 👻 Hidden Assumptions

<analysis>
The analysis reveals several unstated premises that undermine the argument's foundation.
</analysis>

Unstated premises:
- Assumes: Linear progress in AI capabilities → But: Could hit hard limits
- Assumes: Regulatory capture is preventable → Alternative view: Industry dominance inevitable

Keystone assumption: That alignment research will keep pace with capabilities

## 📈 Quantitative Claims Audit

Claims examined:
- "90% of researchers agree" → Source: [uncited] | Plausible: no/unclear
- "$50B investment needed" → Includes: R&D only | Excludes: infrastructure costs

Red flags:
🚩 Suspiciously round numbers without uncertainty
🚩 Percentages without base rates`,
      comments: [{
        id: 'comment-2',
        content: `### 🛡️ Robustness Test

Core argument survives if:
- ✅ Current funding doubles? Yes - scalable approach
- ❌ Key researchers leave field? No - depends on specific expertise
- ⚠️ Timeline extended by 5 years? Weakened but viable

Single points of failure: Dependence on continued government support`
      }]
    };
    
    console.log('\n--- Second Evaluation ---');
    analyzeEvaluation(mockEvaluation2 as any, config);
  }
}

function analyzeEvaluation(evaluation: any, config: any) {
  const fullText = (evaluation.analysis || '') + '\n' + 
    evaluation.comments.map((c: any) => c.content).join('\n');
  
  const results = {
    requirements: {} as Record<string, boolean>,
    violations: {} as Record<string, boolean>,
    commentTypes: {} as Record<string, number>,
    examples: {} as Record<string, string[]>
  };

  // Check requirements
  for (const req of config.desiderata.requirements) {
    const patterns = req.patterns.map((p: string) => new RegExp(p, 'gi'));
    const matches = patterns.some((pattern: RegExp) => pattern.test(fullText));
    results.requirements[req.id] = matches;
    
    if (matches) {
      const example = fullText.match(patterns[0])?.[0];
      if (example) {
        results.examples[req.id] = [example.substring(0, 100) + '...'];
      }
    }
  }

  // Check violations
  for (const avoid of config.desiderata.avoid) {
    const patterns = avoid.patterns.map((p: string) => new RegExp(p, 'gi'));
    const matches = patterns.some((pattern: RegExp) => pattern.test(fullText));
    results.violations[avoid.id] = matches;
  }

  // Check comment types
  for (const type of config.commentTypes) {
    const typeRegex = new RegExp(type.emoji ? `${type.emoji}\\s*${type.title}` : type.title, 'i');
    const matches = fullText.match(typeRegex);
    results.commentTypes[type.title] = matches ? 1 : 0;
  }

  // Print results
  console.log('\n✅ Requirements Met:');
  for (const [req, met] of Object.entries(results.requirements)) {
    console.log(`  ${met ? '✓' : '✗'} ${req}`);
    if (met && results.examples[req]) {
      console.log(`     Example: "${results.examples[req][0]}"`);
    }
  }

  console.log('\n❌ Violations:');
  for (const [viol, occurred] of Object.entries(results.violations)) {
    console.log(`  ${occurred ? '⚠️' : '✓'} ${viol}: ${occurred ? 'VIOLATED' : 'OK'}`);
  }

  console.log('\n📝 Comment Types Found:');
  for (const [type, count] of Object.entries(results.commentTypes)) {
    console.log(`  ${count > 0 ? '✓' : '✗'} ${type}`);
  }

  // Analysis blocks
  const analysisBlocks = fullText.match(/<analysis>[\s\S]*?<\/analysis>/gi) || [];
  console.log(`\n📊 Analysis Blocks: ${analysisBlocks.length} found`);
}

testAnalysis()
  .catch(console.error)
  .finally(() => prisma.$disconnect());