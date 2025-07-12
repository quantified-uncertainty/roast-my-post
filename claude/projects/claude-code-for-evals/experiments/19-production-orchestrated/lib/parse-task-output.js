#!/usr/bin/env node

/**
 * Parse Claude Code output to extract structured findings
 */

const fs = require('fs');

const VALID_CATEGORIES = [
    'mathematical_accuracy', 'statistical_validity', 'logical_consistency',
    'spelling_grammar', 'clarity_readability', 'structural_analysis',
    'factual_verification', 'missing_content', 'argument_strength',
    'code_quality', 'citation_accuracy'
];

const VALID_SEVERITIES = ['critical', 'major', 'minor'];

function parseFinding(findingText) {
    const lines = findingText.trim().split('\n');
    const finding = {};
    
    for (const line of lines) {
        const categoryMatch = line.match(/^Category:\s*(.+)$/i);
        if (categoryMatch) {
            finding.category = categoryMatch[1].trim();
        }
        
        const severityMatch = line.match(/^Severity:\s*(.+)$/i);
        if (severityMatch) {
            finding.severity = severityMatch[1].trim().toLowerCase();
        }
        
        const lineMatch = line.match(/^Line:\s*(\d+)$/i);
        if (lineMatch) {
            finding.line = parseInt(lineMatch[1]);
        }
        
        const quoteMatch = line.match(/^Quote:\s*"(.+)"$/i);
        if (quoteMatch) {
            finding.quote = quoteMatch[1];
        }
        
        const issueMatch = line.match(/^Issue:\s*(.+)$/i);
        if (issueMatch) {
            finding.issue = issueMatch[1].trim();
            
            // Extract source URL if present in the issue text
            const sourceMatch = finding.issue.match(/Source:\s*(https?:\/\/[^\s]+|[\w\.]+\/[\w\/\-\.]+)/i);
            if (sourceMatch) {
                finding.sourceUrl = sourceMatch[1];
            }
        }
    }
    
    return finding;
}

function validateFinding(finding) {
    return (
        finding.category && VALID_CATEGORIES.includes(finding.category) &&
        finding.severity && VALID_SEVERITIES.includes(finding.severity) &&
        finding.line && finding.line > 0 &&
        finding.quote && finding.quote.length >= 5 && finding.quote.length <= 100 &&
        finding.issue && finding.issue.length >= 10 && finding.issue.length <= 200
    );
}

function parseTaskOutput(outputPath, taskType) {
    const content = fs.readFileSync(outputPath, 'utf8');
    
    // Check for "no issues found" message
    if (content.includes(`No ${taskType} issues found`)) {
        return {
            taskType,
            findings: [],
            metadata: {
                noIssuesFound: true
            }
        };
    }
    
    // Extract all [FINDING] blocks
    const findingPattern = /\[FINDING\]([\s\S]*?)\[\/FINDING\]/g;
    const matches = [...content.matchAll(findingPattern)];
    
    const findings = [];
    const errors = [];
    
    for (const match of matches) {
        const finding = parseFinding(match[1]);
        finding.source = taskType;
        finding.timestamp = new Date().toISOString();
        
        if (validateFinding(finding)) {
            findings.push(finding);
        } else {
            errors.push({
                raw: match[0],
                parsed: finding,
                reason: 'Validation failed'
            });
        }
    }
    
    return {
        taskType,
        findings,
        metadata: {
            totalMatches: matches.length,
            validFindings: findings.length,
            errors: errors.length,
            errorDetails: errors
        }
    };
}

// Main execution
if (require.main === module) {
    const [outputPath, taskType] = process.argv.slice(2);
    
    if (!outputPath || !taskType) {
        console.error('Usage: parse-task-output.js <output-path> <task-type>');
        process.exit(1);
    }
    
    try {
        const result = parseTaskOutput(outputPath, taskType);
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error(JSON.stringify({
            error: error.message,
            taskType,
            findings: []
        }));
        process.exit(1);
    }
}

module.exports = { parseTaskOutput, validateFinding };