#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import yaml from 'yaml';
import { parseArgs } from 'util';
import Anthropic from '@anthropic-ai/sdk';

const prisma = new PrismaClient();
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Configuration schemas
const DesiderataSchema = z.object({
  requirements: z.array(z.object({
    id: z.string(),
    description: z.string(),
    patterns: z.array(z.string()), // Regex patterns to check for
    weight: z.number().default(1),
  })),
  avoid: z.array(z.object({
    id: z.string(),
    description: z.string(),
    patterns: z.array(z.string()),
    weight: z.number().default(1),
  })),
});

const CommentTypeSchema = z.object({
  title: z.string(),
  emoji: z.string().optional(),
  requiresAnalysisBlock: z.boolean().default(false),
  keyInfoPatterns: z.array(z.string()), // What should be outside analysis blocks
});

const ImprovementConfigSchema = z.object({
  startingAgentPath: z.string(),
  testDocumentIds: z.array(z.string()),
  desiderata: DesiderataSchema,
  commentTypes: z.array(CommentTypeSchema),
  maxIterations: z.number().default(10),
  successThreshold: z.number().default(0.85),
  experimentExpiryDays: z.number().default(7),
});

type ImprovementConfig = z.infer<typeof ImprovementConfigSchema>;
type DesiderataResult = {
  requirementsMet: Record<string, boolean>;
  avoidanceViolations: Record<string, boolean>;
  commentTypesCoverage: Record<string, number>;
  analysisBlockUsage: { total: number; appropriate: number };
  overallScore: number;
  examples: Record<string, string[]>;
};

// Claude oversight schemas
const ClaudeDecisionSchema = z.object({
  action: z.enum(['KEEP', 'REVERT', 'MODIFY', 'STOP']),
  reasoning: z.string(),
  confidence: z.number().min(0).max(1),
  modifications: z.array(z.string()).optional(),
  riskAssessment: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  qualityTrend: z.enum(['IMPROVING', 'STABLE', 'DEGRADING']),
});

type ClaudeDecision = z.infer<typeof ClaudeDecisionSchema>;

interface IterationContext {
  iteration: number;
  currentScore: number;
  previousScore: number;
  analysis: DesiderataResult;
  evaluationSamples: string[];
  agentDiff: string;
  proposedChanges: { primaryInstructions: string[]; formatting: string[] };
  history: { iteration: number; score: number; action: string }[];
}

// Parse command line arguments
function parseCliArgs() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      config: { type: 'string', short: 'c' },
      'dry-run': { type: 'boolean', default: false },
      verbose: { type: 'boolean', short: 'v', default: false },
      'api-url': { type: 'string', default: 'http://localhost:4000' },
      'api-key': { type: 'string' },
      'background': { type: 'boolean', default: false },
      'progress-file': { type: 'string', default: './agent-improvement-progress.json' },
    },
  });
  return values;
}

// Load agent YAML file
async function loadAgent(agentPath: string) {
  const content = await fs.readFile(agentPath, 'utf-8');
  return yaml.parse(content);
}

// Save improved agent
async function saveAgent(agent: any, outputPath: string) {
  const content = yaml.stringify(agent);
  await fs.writeFile(outputPath, content, 'utf-8');
}

// Generate agent diff for Claude review
function generateAgentDiff(beforeAgent: any, afterAgent: any): string {
  const before = yaml.stringify(beforeAgent);
  const after = yaml.stringify(afterAgent);
  
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');
  
  let diff = '```diff\n';
  const maxLines = Math.max(beforeLines.length, afterLines.length);
  
  for (let i = 0; i < maxLines; i++) {
    const beforeLine = beforeLines[i] || '';
    const afterLine = afterLines[i] || '';
    
    if (beforeLine !== afterLine) {
      if (beforeLine) diff += `- ${beforeLine}\n`;
      if (afterLine) diff += `+ ${afterLine}\n`;
    } else if (beforeLine) {
      diff += `  ${beforeLine}\n`;
    }
  }
  diff += '```';
  
  return diff;
}

// Extract sample evaluations for Claude review
function extractEvaluationSamples(evaluations: any[], maxSamples: number = 3): string[] {
  return evaluations.slice(0, maxSamples).map(evaluation => {
    const content = (evaluation.analysis || '') + '\n' + 
      evaluation.comments?.map((c: any) => c.description).join('\n') || '';
    return content.substring(0, 1000) + (content.length > 1000 ? '...' : '');
  });
}

// Create experiment via API
async function createExperiment(
  agent: any, 
  iteration: number, 
  testDocumentIds: string[],
  config: ImprovementConfig,
  apiUrl: string,
  apiKey?: string
): Promise<{ trackingId: string; batchId: string }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  
  const requestBody = {
    trackingId: `agent-improvement-${Date.now()}-iter${iteration}`,
    description: `Agent improvement iteration ${iteration}`,
    isEphemeral: true,
    expiresInDays: config.experimentExpiryDays,
    ephemeralAgent: {
      name: `${agent.name} v${agent.version} [Iter ${iteration}]`,
      description: agent.description,
      primaryInstructions: agent.primaryInstructions,
      selfCritiqueInstructions: agent.selfCritiqueInstructions,
      providesGrades: agent.providesGrades || false,
    },
    documentIds: testDocumentIds,
  };
  
  const response = await fetch(`${apiUrl}/api/batches`, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create experiment: ${response.status} ${error}`);
  }
  
  const result = await response.json();
  return {
    trackingId: result.batch.trackingId,
    batchId: result.batch.id,
  };
}

// Monitor job completion using batch API
async function waitForJobsComplete(
  batchId: string,
  apiUrl: string,
  apiKey?: string,
  maxWaitMinutes: number = 10
): Promise<boolean> {
  const headers: Record<string, string> = {};
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  
  const startTime = Date.now();
  const maxWaitMs = maxWaitMinutes * 60 * 1000;
  
  while (Date.now() - startTime < maxWaitMs) {
    try {
      // Use the batches API to check status
      const response = await fetch(`${apiUrl}/api/batches?type=experiment`, {
        headers,
      });
      
      if (!response.ok) {
        console.warn(`Failed to check batch status: ${response.status}`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }
      
      const data = await response.json();
      const batch = data.batches?.find((b: any) => b.id === batchId);
      
      if (!batch) {
        console.warn(`Batch ${batchId} not found`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }
      
      const stats = batch.jobStats;
      const total = stats.total;
      const completed = stats.completed + stats.failed;
      
      console.log(`Jobs: ${completed}/${total} complete (${stats.failed} failed)`);
      
      if (completed === total) {
        return stats.failed === 0;
      }
      
      await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (error) {
      console.warn(`Error checking job status:`, error);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  console.warn(`Jobs did not complete within ${maxWaitMinutes} minutes`);
  return false;
}

// Fetch experiment results using batch ID and direct database access
async function fetchExperimentResults(
  batchId: string,
  apiUrl: string,
  apiKey?: string
): Promise<{ evaluations: any[]; stats: any }> {
  console.log('🔍 Fetching evaluation results...');
  
  // Get evaluation versions directly from database via Prisma
  const evaluations = await prisma.evaluationVersion.findMany({
    where: {
      job: {
        agentEvalBatchId: batchId
      }
    },
    include: {
      comments: {
        select: {
          id: true,
          description: true,
          importance: true,
          grade: true
        }
      }
    }
  });
  
  console.log(`📋 Found ${evaluations.length} evaluation versions`);
  
  // Get batch stats
  const batch = await prisma.agentEvalBatch.findUnique({
    where: { id: batchId },
    include: {
      jobs: {
        select: { status: true }
      }
    }
  });
  
  const stats = batch ? {
    total: batch.jobs.length,
    completed: batch.jobs.filter(j => j.status === 'COMPLETED').length,
    failed: batch.jobs.filter(j => j.status === 'FAILED').length,
    running: batch.jobs.filter(j => j.status === 'RUNNING').length,
    pending: batch.jobs.filter(j => j.status === 'PENDING').length,
  } : { total: 0, completed: 0, failed: 0, running: 0, pending: 0 };
  
  return {
    evaluations,
    stats,
  };
}

// Analyze evaluation results against desiderata
async function analyzeResults(
  evaluations: any[],
  config: ImprovementConfig
): Promise<DesiderataResult> {
  const result: DesiderataResult = {
    requirementsMet: {},
    avoidanceViolations: {},
    commentTypesCoverage: {},
    analysisBlockUsage: { total: 0, appropriate: 0 },
    overallScore: 0,
    examples: {},
  };

  // Initialize tracking
  config.desiderata.requirements.forEach(req => {
    result.requirementsMet[req.id] = false;
    result.examples[req.id] = [];
  });
  config.desiderata.avoid.forEach(avoid => {
    result.avoidanceViolations[avoid.id] = false;
    result.examples[avoid.id] = [];
  });
  config.commentTypes.forEach(type => {
    result.commentTypesCoverage[type.title] = 0;
  });

  let totalEvaluations = 0;
  const requirementHits: Record<string, number> = {};
  const avoidanceHits: Record<string, number> = {};

  // Analyze each evaluation
  for (const evaluation of evaluations) {
    if (!evaluation) continue;
    totalEvaluations++;

    const fullText = evaluation.analysis || '';
    const allComments = evaluation.comments?.map(c => c.description).join('\n') || '';
    const combinedText = fullText + '\n' + allComments;

    // Check requirements with weighted scoring
    for (const req of config.desiderata.requirements) {
      if (!requirementHits[req.id]) requirementHits[req.id] = 0;
      
      const patterns = req.patterns.map(p => new RegExp(p, 'gi'));
      let matchCount = 0;
      
      for (const pattern of patterns) {
        const matches = combinedText.match(pattern);
        if (matches) {
          matchCount += matches.length;
          // Collect up to 3 examples
          if (result.examples[req.id].length < 3) {
            result.examples[req.id].push(...matches.slice(0, 3 - result.examples[req.id].length));
          }
        }
      }
      
      if (matchCount > 0) {
        requirementHits[req.id]++;
        result.requirementsMet[req.id] = true;
      }
    }

    // Check violations with severity tracking
    for (const avoid of config.desiderata.avoid) {
      if (!avoidanceHits[avoid.id]) avoidanceHits[avoid.id] = 0;
      
      const patterns = avoid.patterns.map(p => new RegExp(p, 'gi'));
      let violationCount = 0;
      
      for (const pattern of patterns) {
        const matches = combinedText.match(pattern);
        if (matches) {
          violationCount += matches.length;
          if (result.examples[avoid.id].length < 3) {
            result.examples[avoid.id].push(...matches.slice(0, 3 - result.examples[avoid.id].length));
          }
        }
      }
      
      if (violationCount > 0) {
        avoidanceHits[avoid.id]++;
        result.avoidanceViolations[avoid.id] = true;
      }
    }

    // Enhanced comment type analysis
    const analysisBlocks = combinedText.match(/<analysis>[\s\S]*?<\/analysis>/gi) || [];
    result.analysisBlockUsage.total += analysisBlocks.length;

    // Extract content outside analysis blocks
    let outsideAnalysisText = combinedText;
    analysisBlocks.forEach(block => {
      outsideAnalysisText = outsideAnalysisText.replace(block, '');
    });

    for (const comment of evaluation.comments || []) {
      // More sophisticated title detection
      const titlePatterns = [
        /^#{1,3}\s*(?:(🎯|🧠|🔍|👻|📊|🗺️|📈|🔄|🛡️)\s*)?(.+?)$/m,
        /^\*\*(?:(🎯|🧠|🔍|👻|📊|🗺️|📈|🔄|🛡️)\s*)?(.+?)\*\*:?$/m,
      ];
      
      for (const pattern of titlePatterns) {
        const titleMatch = comment.description.match(pattern);
        if (titleMatch) {
          const emoji = titleMatch[1] || '';
          const title = titleMatch[2].trim();
          
          const matchingType = config.commentTypes.find(t => {
            const titleLower = title.toLowerCase();
            const typeTitleLower = t.title.toLowerCase();
            return titleLower.includes(typeTitleLower) || 
                   typeTitleLower.includes(titleLower) ||
                   (t.emoji && emoji === t.emoji);
          });
          
          if (matchingType) {
            result.commentTypesCoverage[matchingType.title]++;
            
            // Check if key info is outside analysis blocks
            const hasAnalysisBlock = /<analysis>/.test(comment.description);
            if (hasAnalysisBlock && matchingType.requiresAnalysisBlock) {
              // Check if key patterns appear outside blocks
              const keyInfoOutside = matchingType.keyInfoPatterns.some(pattern =>
                outsideAnalysisText.includes(pattern)
              );
              if (keyInfoOutside) {
                result.analysisBlockUsage.appropriate++;
              }
            }
          }
          break; // Found a title, don't check other patterns
        }
      }
    }
  }

  // Calculate weighted overall score
  const reqCount = Object.keys(result.requirementsMet).length;
  const reqScore = config.desiderata.requirements.reduce((score, req) => {
    const hitRate = (requirementHits[req.id] || 0) / totalEvaluations;
    return score + (hitRate * req.weight);
  }, 0) / config.desiderata.requirements.reduce((sum, req) => sum + req.weight, 0);

  const violScore = config.desiderata.avoid.reduce((score, avoid) => {
    const violationRate = (avoidanceHits[avoid.id] || 0) / totalEvaluations;
    return score + ((1 - violationRate) * avoid.weight);
  }, 0) / config.desiderata.avoid.reduce((sum, avoid) => sum + avoid.weight, 0);

  const commentTypesFound = Object.values(result.commentTypesCoverage).filter(c => c > 0).length;
  const commentTypesTotal = config.commentTypes.length;
  const commentTypeScore = commentTypesFound / commentTypesTotal;

  const analysisBlockScore = result.analysisBlockUsage.total > 0 
    ? result.analysisBlockUsage.appropriate / result.analysisBlockUsage.total 
    : 0;

  result.overallScore = (
    reqScore * 0.4 +
    violScore * 0.3 +
    commentTypeScore * 0.2 +
    analysisBlockScore * 0.1
  );

  return result;
}

// Generate improvements based on analysis
function generateImprovements(
  analysis: DesiderataResult,
  currentAgent: any,
  config: ImprovementConfig
): { primaryInstructions: string[]; formatting: string[] } {
  const improvements = {
    primaryInstructions: [] as string[],
    formatting: [] as string[],
  };

  // For unmet requirements
  for (const [reqId, met] of Object.entries(analysis.requirementsMet)) {
    if (!met) {
      const req = config.desiderata.requirements.find(r => r.id === reqId);
      if (req) {
        improvements.primaryInstructions.push(
          `IMPORTANT: ${req.description}. Look for opportunities to identify and highlight these aspects.`
        );
      }
    }
  }

  // For violations that occurred
  for (const [violId, occurred] of Object.entries(analysis.avoidanceViolations)) {
    if (occurred) {
      const avoid = config.desiderata.avoid.find(a => a.id === violId);
      if (avoid) {
        improvements.primaryInstructions.push(
          `AVOID: ${avoid.description}. Instead, focus on more substantive insights.`
        );
      }
    }
  }

  // For missing comment types
  const missingTypes = config.commentTypes.filter(
    type => !analysis.commentTypesCoverage[type.title] || 
            analysis.commentTypesCoverage[type.title] === 0
  );
  
  if (missingTypes.length > 0) {
    const typesList = missingTypes.map(t => 
      `- **${t.emoji || ''}${t.title}**: [specific insight about ${t.title.toLowerCase()}]`
    ).join('\n');
    
    improvements.formatting.push(
      `When creating comments, ensure you include these types with catchy titles:\n${typesList}`
    );
  }

  // For analysis block usage
  if (analysis.analysisBlockUsage.total < 5) {
    improvements.formatting.push(
      `Use <analysis> blocks more frequently for detailed reasoning, keeping key conclusions outside the blocks for clarity.`
    );
  }

  return improvements;
}

// Claude oversight function - optimized for speed
async function askClaudeForDecision(context: IterationContext): Promise<ClaudeDecision> {
  console.log('🔍 Preparing Claude oversight (optimized)...');
  
  // More concise prompt for faster processing
  const prompt = `Review this agent improvement iteration:

**Score**: ${context.currentScore.toFixed(3)} (${context.currentScore > context.previousScore ? '+' : ''}${(context.currentScore - context.previousScore).toFixed(3)})

**Requirements Met**: ${Object.values(context.analysis.requirementsMet).filter(Boolean).length}/${Object.keys(context.analysis.requirementsMet).length}
**Violations**: ${Object.values(context.analysis.avoidanceViolations).filter(Boolean).length} detected
**Comment Types**: ${Object.values(context.analysis.commentTypesCoverage).filter(c => c > 0).length}/${Object.keys(context.analysis.commentTypesCoverage).length} covered

**Key Changes**:
${context.proposedChanges.primaryInstructions.slice(0, 2).map(change => `- ${change.substring(0, 100)}...`).join('\n')}

**Sample Output** (first 300 chars):
${context.evaluationSamples[0]?.substring(0, 300)}...

**Decision**: KEEP (good progress), REVERT (quality loss), MODIFY (needs tweaks), or STOP (optimal)?

JSON format:
{
  "action": "KEEP|REVERT|MODIFY|STOP",
  "reasoning": "Brief explanation",
  "confidence": 0.85,
  "riskAssessment": "LOW|MEDIUM|HIGH",
  "qualityTrend": "IMPROVING|STABLE|DEGRADING"
}`;

  const response = await anthropic.messages.create({
    model: 'claude-4-opus-20241022', // Using Claude 4 as specified in CLAUDE.md
    max_tokens: 500, // Reduced for faster response
    messages: [{ role: 'user', content: prompt }],
  });

  const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
  
  try {
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Claude response');
    }
    
    const jsonResponse = JSON.parse(jsonMatch[0]);
    return ClaudeDecisionSchema.parse(jsonResponse);
  } catch (error) {
    console.error('Failed to parse Claude response:', responseText);
    // Fallback decision
    return {
      action: 'REVERT',
      reasoning: 'Failed to parse Claude response - reverting for safety',
      confidence: 0.1,
      riskAssessment: 'HIGH',
      qualityTrend: 'STABLE',
    };
  }
}

// Apply improvements to agent configuration
function applyImprovements(
  agent: any,
  improvements: { primaryInstructions: string[]; formatting: string[] }
): any {
  const updatedAgent = { ...agent };
  
  // Add improvements to primary instructions
  if (improvements.primaryInstructions.length > 0) {
    const improvementSection = `
<improvement_focus>
${improvements.primaryInstructions.join('\n\n')}
</improvement_focus>
`;
    updatedAgent.primaryInstructions = agent.primaryInstructions + '\n' + improvementSection;
  }

  // Add formatting improvements to output structure
  if (improvements.formatting.length > 0) {
    const formattingSection = `
<enhanced_formatting>
${improvements.formatting.join('\n\n')}
</enhanced_formatting>
`;
    updatedAgent.primaryInstructions = updatedAgent.primaryInstructions.replace(
      '</output_structure>',
      formattingSection + '\n</output_structure>'
    );
  }

  // Update version
  const currentVersion = parseInt(agent.version) || 1;
  updatedAgent.version = String(currentVersion + 1);
  updatedAgent.description = agent.description + ' [Auto-improved]';

  return updatedAgent;
}

// Progress tracking
interface ProgressState {
  iteration: number;
  bestScore: number;
  currentAgent: any;
  bestAgent: any;
  history: { iteration: number; score: number; action: string }[];
  startTime: number;
  lastUpdate: number;
}

async function saveProgress(state: ProgressState, progressFile: string) {
  await fs.writeFile(progressFile, JSON.stringify(state, null, 2));
}

async function loadProgress(progressFile: string): Promise<ProgressState | null> {
  try {
    const content = await fs.readFile(progressFile, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

// Main improvement loop with Claude oversight
async function improveAgent(configPath: string, options: any) {
  console.log('🚀 Starting agent improvement process with Claude oversight...');
  
  // Load configuration
  const configContent = await fs.readFile(configPath, 'utf-8');
  const config = ImprovementConfigSchema.parse(JSON.parse(configContent));
  
  // Load starting agent
  let currentAgent = await loadAgent(config.startingAgentPath);
  const baseAgentName = path.basename(config.startingAgentPath, '.yaml');
  
  const progressFile = options['progress-file'] as string;
  
  // Try to load existing progress
  let state = await loadProgress(progressFile);
  
  let iteration = state?.iteration || 0;
  let bestScore = state?.bestScore || 0;
  let bestAgent = state?.bestAgent || currentAgent;
  let previousScore = state?.history?.slice(-1)[0]?.score || 0;
  const history = state?.history || [];
  
  if (state) {
    console.log(`📄 Resuming from iteration ${iteration}, best score: ${bestScore.toFixed(3)}`);
    currentAgent = state.currentAgent;
  }
  
  while (iteration < config.maxIterations) {
    console.log(`\n📊 Iteration ${iteration + 1}/${config.maxIterations}`);
    
    let analysis: DesiderataResult;
    let evaluationSamples: string[] = [];
    
    if (options['dry-run']) {
      console.log('🏃 Dry run mode - using mock data');
      
      // Simulate results for testing
      analysis = {
        requirementsMet: Object.fromEntries(
          config.desiderata.requirements.map(r => [r.id, Math.random() > 0.5])
        ),
        avoidanceViolations: Object.fromEntries(
          config.desiderata.avoid.map(a => [a.id, Math.random() > 0.7])
        ),
        commentTypesCoverage: Object.fromEntries(
          config.commentTypes.map(t => [t.title, Math.floor(Math.random() * 3)])
        ),
        analysisBlockUsage: { total: 5, appropriate: 3 },
        overallScore: 0.5 + (iteration * 0.1) + (Math.random() - 0.5) * 0.2,
        examples: {},
      };
      
      // Mock evaluation samples
      evaluationSamples = [
        '## 🎯 Key Claims Analysis\n\nCentral claims identified with evidence assessment...',
        '## 🧠 Cognitive Biases Detected\n\nConfirmation bias present in selective citation...',
        '## 🔍 Critical Missing Context\n\nLacks discussion of alternative hypotheses...'
      ];
      
    } else {
      // Real experiment mode
      console.log('🔬 Creating real experiment...');
      
      const apiUrl = options['api-url'] as string;
      const apiKey = options['api-key'] as string || process.env.ROAST_MY_POST_API_KEY;
      
      if (!apiKey) {
        console.error('❌ API key required for real experiments. Use --api-key or set ROAST_MY_POST_API_KEY');
        process.exit(1);
      }
      
      try {
        // Create experiment
        const { trackingId, batchId } = await createExperiment(
          currentAgent, 
          iteration + 1, 
          config.testDocumentIds, 
          config, 
          apiUrl, 
          apiKey
        );
        
        console.log(`📊 Experiment created: ${apiUrl}/experiments/${trackingId}`);
        console.log('⏳ Waiting for jobs to complete...');
        
        // Wait for completion
        const success = await waitForJobsComplete(batchId, apiUrl, apiKey);
        
        if (!success) {
          console.warn('⚠️ Some jobs failed or timed out');
        }
        
        // Fetch results
        const { evaluations } = await fetchExperimentResults(batchId, apiUrl, apiKey);
        console.log(`📋 Retrieved ${evaluations.length} evaluations`);
        
        // Analyze results
        analysis = await analyzeResults(evaluations, config);
        evaluationSamples = extractEvaluationSamples(evaluations);
        
      } catch (error) {
        console.error('❌ Experiment failed:', error);
        break;
      }
    }
    
    console.log(`📈 Current score: ${analysis.overallScore.toFixed(3)} (Previous: ${previousScore.toFixed(3)})`);
    
    // Early success check
    if (analysis.overallScore >= config.successThreshold) {
      console.log('✅ Success threshold reached!');
      break;
    }
    
    // Generate proposed improvements
    const proposedAgent = { ...currentAgent };
    const improvements = generateImprovements(analysis, currentAgent, config);
    const improvedAgent = applyImprovements(proposedAgent, improvements);
    
    // Prepare context for Claude
    const context: IterationContext = {
      iteration: iteration + 1,
      currentScore: analysis.overallScore,
      previousScore,
      analysis,
      evaluationSamples,
      agentDiff: generateAgentDiff(currentAgent, improvedAgent),
      proposedChanges: improvements,
      history,
    };
    
    // Ask Claude for decision
    console.log('🤔 Asking Claude for oversight...');
    let decision: ClaudeDecision;
    
    if (options['dry-run'] && !process.env.ANTHROPIC_API_KEY) {
      // Mock Claude decision for dry runs without API key
      decision = {
        action: Math.random() > 0.5 ? 'KEEP' : 'MODIFY',
        reasoning: `Mock decision: Score improved by ${(context.currentScore - context.previousScore).toFixed(3)}. ${
          context.currentScore > context.previousScore ? 'Changes seem beneficial.' : 'Changes need refinement.'
        }`,
        confidence: 0.75,
        riskAssessment: 'MEDIUM',
        qualityTrend: 'IMPROVING',
        modifications: context.currentScore < context.previousScore ? [
          'Focus more on catchy titles with emojis',
          'Ensure key insights appear outside analysis blocks'
        ] : undefined,
      };
      console.log('🤖 Using mock Claude decision (no API key provided)');
    } else {
      decision = await askClaudeForDecision(context);
    }
    
    console.log(`🎯 Claude Decision: ${decision.action} (Confidence: ${decision.confidence})`);
    console.log(`💭 Reasoning: ${decision.reasoning}`);
    console.log(`⚠️ Risk: ${decision.riskAssessment} | Quality Trend: ${decision.qualityTrend}`);
    
    // Execute Claude's decision
    let actionTaken = decision.action;
    switch (decision.action) {
      case 'KEEP':
        currentAgent = improvedAgent;
        console.log('✅ Keeping changes');
        break;
        
      case 'REVERT':
        console.log('🔄 Reverting to previous version');
        // currentAgent stays the same
        break;
        
      case 'MODIFY':
        if (decision.modifications && decision.modifications.length > 0) {
          console.log('🔧 Applying Claude modifications...');
          // Apply specific modifications from Claude
          const modifiedImprovements = {
            primaryInstructions: decision.modifications.filter(m => !m.includes('formatting')),
            formatting: decision.modifications.filter(m => m.includes('formatting')),
          };
          currentAgent = applyImprovements(currentAgent, modifiedImprovements);
        } else {
          console.log('⚠️ No specific modifications provided, keeping original');
        }
        break;
        
      case 'STOP':
        console.log('🛑 Claude recommends stopping - agent optimization complete');
        break;
    }
    
    // Track best version
    if (analysis.overallScore > bestScore) {
      bestScore = analysis.overallScore;
      bestAgent = { ...currentAgent };
    }
    
    // Update history
    history.push({
      iteration: iteration + 1,
      score: analysis.overallScore,
      action: actionTaken,
    });
    
    previousScore = analysis.overallScore;
    iteration++;
    
    // Save progress
    const currentState: ProgressState = {
      iteration,
      bestScore,
      currentAgent,
      bestAgent,
      history,
      startTime: state?.startTime || Date.now(),
      lastUpdate: Date.now(),
    };
    
    await saveProgress(currentState, progressFile);
    
    if (options.background) {
      console.log(`💾 Progress saved to ${progressFile}`);
    }
    
    if (decision.action === 'STOP') break;
  }
  
  // Save the improved agent
  const outputPath = `${baseAgentName}-improved-v${currentAgent.version}.yaml`;
  await saveAgent(bestAgent, outputPath);
  console.log(`\n✨ Best agent saved to: ${outputPath}`);
  console.log(`📊 Final score: ${bestScore.toFixed(3)}`);
  console.log(`🔄 Iterations completed: ${iteration}`);
}

// Main entry point
async function main() {
  try {
    const args = parseCliArgs();
    
    if (!args.config) {
      console.error('❌ Please provide a config file with --config');
      process.exit(1);
    }
    
    await improveAgent(args.config as string, args);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();