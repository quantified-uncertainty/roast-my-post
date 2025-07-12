#!/usr/bin/env node

/**
 * Create a shorter synthesis prompt to reduce timeout risk
 */

const fs = require('fs');

function createShortSynthesisPrompt(documentPath, findingsPath, patternsPath) {
    const documentTitle = fs.readFileSync(documentPath, 'utf8').split('\n')[0].replace(/^#\s*/, '');
    const findings = JSON.parse(fs.readFileSync(findingsPath, 'utf8'));
    const patterns = JSON.parse(fs.readFileSync(patternsPath, 'utf8'));
    
    // Group findings by severity
    const findingsBySeverity = {
        critical: findings.filter(f => f.severity === 'critical'),
        major: findings.filter(f => f.severity === 'major'), 
        minor: findings.filter(f => f.severity === 'minor')
    };
    
    // Get current date for context
    const currentDate = new Date().toISOString().split('T')[0];
    
    // Create a much shorter prompt focused on key issues
    const prompt = `Create a concise analysis report for: "${documentTitle}"

IMPORTANT CONTEXT: Today's date is ${currentDate}. When discussing claims about dates, statistics, or "recent" events, consider that it is currently 2025.

## Findings Summary
Total: ${findings.length} issues
- Critical: ${findingsBySeverity.critical.length}
- Major: ${findingsBySeverity.major.length}  
- Minor: ${findingsBySeverity.minor.length}

## Critical Issues (${findingsBySeverity.critical.length})
${findingsBySeverity.critical.map(f => {
    let line = `- Line ${f.line}: ${f.issue}`;
    if (f.sourceUrl && !f.issue.includes(f.sourceUrl)) line += ` (Source: ${f.sourceUrl})`;
    return line;
}).join('\n')}

## Top Major Issues (first 5)
${findingsBySeverity.major.slice(0, 5).map(f => {
    let line = `- Line ${f.line}: ${f.issue}`;
    if (f.sourceUrl && !f.issue.includes(f.sourceUrl)) line += ` (Source: ${f.sourceUrl})`;
    return line;
}).join('\n')}

## Patterns Identified
${patterns.patterns.map(p => `- ${p.name}: ${p.description} (${p.instances} instances)`).join('\n')}

## Your Task
Write a focused 500-word analysis report with:
1. **Executive Summary** (2-3 sentences)
2. **Critical Issues** (explain top 3 critical problems and required fixes)
3. **Major Themes** (group major issues by category)
4. **Recommendations** (prioritized action items)

Keep it concise and actionable. Focus on the most important problems.
IMPORTANT: Preserve all source URLs and citations in your report.`;
    
    return prompt;
}

// Main execution
if (require.main === module) {
    const [documentPath, findingsPath, patternsPath] = process.argv.slice(2);
    
    if (!documentPath || !findingsPath || !patternsPath) {
        console.error('Usage: create-short-synthesis-prompt.js <document-path> <findings-path> <patterns-path>');
        process.exit(1);
    }
    
    try {
        const prompt = createShortSynthesisPrompt(documentPath, findingsPath, patternsPath);
        console.log(prompt);
    } catch (error) {
        console.error('Error creating short synthesis prompt:', error.message);
        process.exit(1);
    }
}

module.exports = { createShortSynthesisPrompt };