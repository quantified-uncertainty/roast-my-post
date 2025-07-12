#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🧠 PLANNING AGENT: Analyzing current state...\n');

// Initialize state directory
const stateDir = path.join(__dirname, 'state');
if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
}

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

// Prepare state summary for Claude
const stateSummary = {
    iteration: iterationCount + 1,
    findingsCount: currentFindings.length,
    findingsByCategory: {},
    previousStrategies: analysisHistory.map(h => h.strategy),
    analyzedAspects: Object.keys(coverageMap),
    totalTimeSpent: analysisHistory.reduce((sum, h) => sum + (h.duration || 0), 0)
};

// Count findings by category
currentFindings.forEach(f => {
    if (!stateSummary.findingsByCategory[f.category]) {
        stateSummary.findingsByCategory[f.category] = 0;
    }
    stateSummary.findingsByCategory[f.category]++;
});

// Create planning prompt
const prompt = `You are an intelligent analysis orchestrator for document analysis. Your job is to analyze a document at input.md and find errors, issues, and problems.

The document to analyze is about "Why the tails fall apart" - a statistical essay about correlations and extreme values.

Review the current state and decide what to do next for analyzing THIS DOCUMENT.

CURRENT STATE:
- Iteration: ${stateSummary.iteration}
- Total findings: ${stateSummary.findingsCount}
- Findings by category: ${JSON.stringify(stateSummary.findingsByCategory, null, 2)}
- Previous strategies used: ${stateSummary.previousStrategies.join(', ') || 'none'}
- Analyzed aspects: ${stateSummary.analyzedAspects.join(', ') || 'none'}
- Total time spent: ${Math.round(stateSummary.totalTimeSpent / 60)} minutes

AVAILABLE STRATEGIES:
1. PARALLEL_EXPLORE - Run 3-5 parallel tasks to explore different aspects
2. DEEP_DIVE - Sequential deep investigation of a specific topic
3. SYNTHESIS - Consolidate findings into a coherent report
4. GAP_FILL - Target specific missing areas
5. COMPLETE - Analysis is sufficient, finish

DECISION CRITERIA:
- Use PARALLEL_EXPLORE when starting or need broad coverage
- Use DEEP_DIVE when you found something needing investigation
- Use SYNTHESIS when you have 20+ findings across multiple categories
- Use GAP_FILL when you notice specific missing areas
- Use COMPLETE when analysis is comprehensive (usually 40+ findings)

OUTPUT YOUR DECISION AS A JSON OBJECT:
{
  "strategy": "STRATEGY_NAME",
  "reasoning": "Brief explanation of why this strategy",
  "tasks": ["array of specific tasks if PARALLEL_EXPLORE or GAP_FILL"],
  "focus": "specific focus area if DEEP_DIVE",
  "confidence": 0.0-1.0
}

Important: Output ONLY the JSON object, no other text.`;

// Save prompt for debugging
fs.writeFileSync(path.join(stateDir, 'planning-prompt.txt'), prompt);

// Run Claude to make decision
const { execSync } = require('child_process');

try {
    console.log('🤔 Asking Claude to decide next strategy...\n');
    
    const output = execSync(
        `claude -p '${prompt.replace(/'/g, "'\\''").replace(/\n/g, " ")}' --max-turns 2`,
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
        iteration: stateSummary.iteration,
        timestamp: new Date().toISOString(),
        decision: decision,
        stateSummary: stateSummary
    };
    
    // Append to decision log
    let decisionLog = [];
    if (fs.existsSync(path.join(stateDir, 'decision-log.json'))) {
        decisionLog = JSON.parse(fs.readFileSync(path.join(stateDir, 'decision-log.json'), 'utf8'));
    }
    decisionLog.push(decisionRecord);
    fs.writeFileSync(path.join(stateDir, 'decision-log.json'), JSON.stringify(decisionLog, null, 2));
    
    // Save current decision for executor
    fs.writeFileSync(path.join(stateDir, 'current-decision.json'), JSON.stringify(decision, null, 2));
    
    // Update iteration count
    fs.writeFileSync(path.join(stateDir, 'iteration-count.txt'), String(stateSummary.iteration));
    
    console.log(`\n✅ Decision made: ${decision.strategy}`);
    console.log(`📝 Reasoning: ${decision.reasoning}`);
    console.log(`🎯 Confidence: ${(decision.confidence * 100).toFixed(0)}%\n`);
    
    if (decision.strategy === 'COMPLETE') {
        console.log('🏁 Analysis complete! Check state/final-report.md for results.\n');
        process.exit(0);
    }
    
} catch (error) {
    console.error('❌ Error in planning:', error.message);
    
    // Fallback decision
    const fallback = {
        strategy: stateSummary.iteration === 1 ? 'PARALLEL_EXPLORE' : 'SYNTHESIS',
        reasoning: 'Fallback decision due to planning error',
        tasks: stateSummary.iteration === 1 ? [
            'Check for spelling errors, typos, and grammatical mistakes throughout the document',
            'Verify factual accuracy of all claims, statistics, and referenced information',
            'Analyze logical consistency and identify any contradictions or flawed reasoning',
            'Evaluate clarity and readability, flagging unclear passages or overly complex language'
        ] : [],
        confidence: 0.5
    };
    
    fs.writeFileSync(path.join(stateDir, 'current-decision.json'), JSON.stringify(fallback, null, 2));
    console.log(`\n⚠️  Using fallback strategy: ${fallback.strategy}\n`);
}