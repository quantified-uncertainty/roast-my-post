#!/usr/bin/env node

/**
 * Combine findings from all task outputs
 */

const fs = require('fs');
const path = require('path');

function combineFindings(outputDir) {
    const tasksDir = path.join(outputDir, 'tasks');
    const allFindings = [];
    
    // Read all task output files
    const taskFiles = fs.readdirSync(tasksDir)
        .filter(f => f.endsWith('.json') && !f.endsWith('.raw'));
    
    taskFiles.forEach(file => {
        try {
            const content = fs.readFileSync(path.join(tasksDir, file), 'utf8');
            const data = JSON.parse(content);
            
            if (data.findings && Array.isArray(data.findings)) {
                // Add unique IDs to findings
                data.findings.forEach((finding, idx) => {
                    finding.id = `finding-${allFindings.length + idx + 1}`;
                    finding.validated = true;
                });
                allFindings.push(...data.findings);
            }
        } catch (e) {
            console.error(`Error reading ${file}:`, e.message);
        }
    });
    
    // Sort by severity and line number
    const severityOrder = { critical: 0, major: 1, minor: 2 };
    allFindings.sort((a, b) => {
        const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
        if (severityDiff !== 0) return severityDiff;
        return a.line - b.line;
    });
    
    // Write combined findings
    const outputPath = path.join(outputDir, 'all-findings.json');
    fs.writeFileSync(outputPath, JSON.stringify(allFindings, null, 2));
    
    // Also create a raw version for reference
    const rawPath = path.join(outputDir, 'all-findings-raw.json');
    fs.writeFileSync(rawPath, JSON.stringify(allFindings, null, 2));
    
    console.log(`Combined ${allFindings.length} findings from ${taskFiles.length} tasks`);
    console.log(`Output: ${outputPath}`);
    
    return allFindings;
}

// Main execution
if (require.main === module) {
    const outputDir = process.argv[2];
    
    if (!outputDir) {
        console.error('Usage: combine-findings.js <output-dir>');
        process.exit(1);
    }
    
    try {
        combineFindings(outputDir);
    } catch (error) {
        console.error('Error combining findings:', error.message);
        process.exit(1);
    }
}

module.exports = { combineFindings };