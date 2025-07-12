#!/usr/bin/env node

/**
 * Collect findings from all task outputs
 */

const fs = require('fs');
const path = require('path');

function collectFindings(tasksDir) {
    const allFindings = [];
    const taskFiles = fs.readdirSync(tasksDir).filter(f => f.endsWith('.json'));
    
    for (const file of taskFiles) {
        const filePath = path.join(tasksDir, file);
        try {
            const taskResult = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            
            if (taskResult.findings && Array.isArray(taskResult.findings)) {
                allFindings.push(...taskResult.findings);
            }
        } catch (error) {
            console.error(`Error reading ${file}:`, error.message);
        }
    }
    
    // Sort by line number, then by severity
    const severityOrder = { critical: 0, major: 1, minor: 2 };
    allFindings.sort((a, b) => {
        if (a.line !== b.line) {
            return a.line - b.line;
        }
        return severityOrder[a.severity] - severityOrder[b.severity];
    });
    
    return allFindings;
}

// Main execution
if (require.main === module) {
    const tasksDir = process.argv[2];
    if (!tasksDir) {
        console.error('Usage: collect-findings.js <tasks-dir>');
        process.exit(1);
    }
    
    try {
        const findings = collectFindings(tasksDir);
        console.log(JSON.stringify(findings, null, 2));
    } catch (error) {
        console.error('Error collecting findings:', error.message);
        process.exit(1);
    }
}

module.exports = { collectFindings };