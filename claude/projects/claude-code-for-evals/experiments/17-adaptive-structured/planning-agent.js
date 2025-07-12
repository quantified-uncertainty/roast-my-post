#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧠 PLANNING AGENT: Analyzing current state...\n');

// Initialize state directory
const stateDir = path.join(__dirname, 'state');
if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
}

// Load task templates for reference
const { taskTemplates } = require('./lib/task-templates.js');
const availableTaskTypes = Object.keys(taskTemplates);

// Load current state
let currentFindings = [];
let analysisHistory = [];
let coverageMap = {};
let iterationCount = 0;

try {
    if (fs.existsSync(path.join(stateDir, 'current-findings.json'))) {
        currentFindings = JSON.parse(fs.readFileSync(path.join(stateDir, 'current-findings.json'), 'utf8'));
    }
    if (fs.existsSync(path.join(stateDir, 'analysis-history.json'))) {
        analysisHistory = JSON.parse(fs.readFileSync(path.join(stateDir, 'analysis-history.json'), 'utf8'));
    }
    if (fs.existsSync(path.join(stateDir, 'coverage-map.json'))) {
        coverageMap = JSON.parse(fs.readFileSync(path.join(stateDir, 'coverage-map.json'), 'utf8'));
    }
    if (fs.existsSync(path.join(stateDir, 'iteration-count.txt'))) {
        iterationCount = parseInt(fs.readFileSync(path.join(stateDir, 'iteration-count.txt'), 'utf8'));
    }
} catch (error) {
    console.log('📝 Starting fresh analysis (no previous state found)\n');
}

// Calculate quality metrics
const qualityMetrics = {
    totalFindings: currentFindings.length,
    bySeverity: {
        critical: currentFindings.filter(f => f.severity === 'critical').length,
        major: currentFindings.filter(f => f.severity === 'major').length,
        minor: currentFindings.filter(f => f.severity === 'minor').length
    },
    byCategory: {},
    coverageScore: 0,
    qualityScore: 0
};

// Count by category
currentFindings.forEach(f => {
    qualityMetrics.byCategory[f.category] = (qualityMetrics.byCategory[f.category] || 0) + 1;
});

// Calculate coverage score (0-100)
const coveredTaskTypes = Object.keys(coverageMap).filter(k => coverageMap[k]);
qualityMetrics.coverageScore = Math.round((coveredTaskTypes.length / availableTaskTypes.length) * 100);

// Calculate quality score based on finding distribution
if (currentFindings.length > 0) {
    qualityMetrics.qualityScore = Math.round(
        (qualityMetrics.bySeverity.critical * 10 +
         qualityMetrics.bySeverity.major * 5 +
         qualityMetrics.bySeverity.minor * 1) / currentFindings.length * 10
    );
}

// Determine uncovered task types
const uncoveredTaskTypes = availableTaskTypes.filter(t => !coverageMap[t]);

// Create planning prompt
const prompt = `You are an intelligent analysis orchestrator for document analysis. Your job is to analyze a document and find errors, issues, and problems.

CURRENT STATE:
- Iteration: ${iterationCount + 1}
- Total findings: ${qualityMetrics.totalFindings}
- Critical findings: ${qualityMetrics.bySeverity.critical}
- Major findings: ${qualityMetrics.bySeverity.major}
- Minor findings: ${qualityMetrics.bySeverity.minor}
- Categories found: ${Object.keys(qualityMetrics.byCategory).join(', ') || 'none'}
- Coverage score: ${qualityMetrics.coverageScore}%
- Quality score: ${qualityMetrics.qualityScore}/100
- Previous strategies: ${analysisHistory.map(h => h.strategy).join(', ') || 'none'}

AVAILABLE TASK TYPES:
${availableTaskTypes.map(t => `- ${t}: ${taskTemplates[t].name}`).join('\n')}

UNCOVERED AREAS:
${uncoveredTaskTypes.length > 0 ? uncoveredTaskTypes.join(', ') : 'All areas have been analyzed'}

AVAILABLE STRATEGIES:
1. PARALLEL_EXPLORE - Run multiple task types in parallel
2. DEEP_DIVE - Focus deeply on one specific area
3. SYNTHESIS - Consolidate findings into a report
4. GAP_FILL - Target specific uncovered areas
5. COMPLETE - Analysis is sufficient

DECISION CRITERIA:
- Use PARALLEL_EXPLORE when starting or need broad coverage
- Use DEEP_DIVE when critical issues need investigation
- Use GAP_FILL when specific areas are uncovered
- Use SYNTHESIS when you have 30+ quality findings
- Use COMPLETE when coverage >80% and quality findings >40

OUTPUT JSON ONLY:
{
  "strategy": "STRATEGY_NAME",
  "reasoning": "Brief explanation",
  "taskTypes": ["array of task types for PARALLEL_EXPLORE or GAP_FILL"],
  "focus": "focus area for DEEP_DIVE",
  "confidence": 0.0-1.0
}`;

// Run Claude to make decision
try {
    console.log('🤔 Planning next move...\n');
    
    const output = execSync(
        `claude -p '${prompt.replace(/'/g, "'\\''")}' --max-turns 1`,
        { encoding: 'utf8', maxBuffer: 5 * 1024 * 1024 }
    );
    
    // Extract JSON from output
    const jsonMatch = output.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('No JSON found in Claude output');
    }
    
    const decision = JSON.parse(jsonMatch[0]);
    
    // Validate decision
    const validStrategies = ['PARALLEL_EXPLORE', 'DEEP_DIVE', 'SYNTHESIS', 'GAP_FILL', 'COMPLETE'];
    if (!validStrategies.includes(decision.strategy)) {
        throw new Error(`Invalid strategy: ${decision.strategy}`);
    }
    
    // Save decision
    const decisionRecord = {
        iteration: iterationCount + 1,
        timestamp: new Date().toISOString(),
        decision: decision,
        metrics: qualityMetrics
    };
    
    // Append to decision log
    let decisionLog = [];
    if (fs.existsSync(path.join(stateDir, 'decision-log.json'))) {
        decisionLog = JSON.parse(fs.readFileSync(path.join(stateDir, 'decision-log.json'), 'utf8'));
    }
    decisionLog.push(decisionRecord);
    fs.writeFileSync(path.join(stateDir, 'decision-log.json'), JSON.stringify(decisionLog, null, 2));
    
    // Save current decision
    fs.writeFileSync(path.join(stateDir, 'current-decision.json'), JSON.stringify(decision, null, 2));
    
    // Update iteration count
    fs.writeFileSync(path.join(stateDir, 'iteration-count.txt'), String(iterationCount + 1));
    
    console.log(`✅ Decision: ${decision.strategy}`);
    console.log(`📝 Reasoning: ${decision.reasoning}`);
    console.log(`🎯 Confidence: ${(decision.confidence * 100).toFixed(0)}%\n`);
    
    if (decision.strategy === 'COMPLETE') {
        console.log('🏁 Analysis complete! Generate final report with synthesis.\n');
    }
    
} catch (error) {
    console.error('❌ Error in planning:', error.message);
    
    // Intelligent fallback based on state
    let fallbackStrategy = 'PARALLEL_EXPLORE';
    let fallbackTaskTypes = uncoveredTaskTypes.slice(0, 4);
    
    if (iterationCount === 0) {
        // First iteration: broad exploration
        fallbackTaskTypes = ['spelling_grammar', 'mathematical_accuracy', 'logical_consistency', 'factual_verification'];
    } else if (uncoveredTaskTypes.length > 0) {
        // Gap fill if areas uncovered
        fallbackStrategy = 'GAP_FILL';
    } else if (qualityMetrics.totalFindings > 30) {
        // Synthesis if enough findings
        fallbackStrategy = 'SYNTHESIS';
    }
    
    const fallback = {
        strategy: fallbackStrategy,
        reasoning: 'Fallback decision based on current state analysis',
        taskTypes: fallbackTaskTypes,
        confidence: 0.7
    };
    
    fs.writeFileSync(path.join(stateDir, 'current-decision.json'), JSON.stringify(fallback, null, 2));
    console.log(`\n⚠️  Using intelligent fallback: ${fallback.strategy}\n`);
}