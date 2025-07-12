#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Get output directory from command line
const outputDir = process.argv[2];
if (!outputDir) {
    console.error('Usage: findings-parser.js <output-directory>');
    process.exit(1);
}

// Read all task output files
const taskFiles = fs.readdirSync(outputDir)
    .filter(f => f.startsWith('task-') && f.endsWith('.json'))
    .sort();

const findings = [];
let totalTasks = 0;
let successfulTasks = 0;

taskFiles.forEach(file => {
    totalTasks++;
    try {
        const taskData = JSON.parse(fs.readFileSync(path.join(outputDir, file), 'utf8'));
        
        if (taskData.status !== 'success' || !taskData.rawOutput) {
            return;
        }
        
        successfulTasks++;
        
        // Parse the raw output to extract findings
        const rawOutput = taskData.rawOutput;
        const lines = rawOutput.split('\n');
        
        let currentFinding = null;
        let inFinding = false;
        
        lines.forEach(line => {
            // Detect finding patterns
            // Pattern 1: Numbered findings (1. 2. 3. etc)
            const numberedMatch = line.match(/^(\d+)\.\s+(.+)/);
            // Pattern 2: Bullet points with line numbers
            const bulletMatch = line.match(/^[-•]\s*.*[Ll]ine\s+(\d+)/);
            // Pattern 3: Headers with line numbers
            const headerMatch = line.match(/^#{1,4}\s+.*[Ll]ine\s+(\d+)/);
            // Pattern 4: Error/Issue keywords with line numbers
            const errorMatch = line.match(/(error|issue|problem|incorrect|missing|wrong).*[Ll]ine\s+(\d+)/i);
            
            if (numberedMatch || bulletMatch || headerMatch || errorMatch) {
                // Save previous finding if exists
                if (currentFinding && currentFinding.description) {
                    findings.push(currentFinding);
                }
                
                // Extract line number
                let lineNum = null;
                if (line.match(/[Ll]ine\s+(\d+)/)) {
                    lineNum = parseInt(line.match(/[Ll]ine\s+(\d+)/)[1]);
                }
                
                // Determine severity based on keywords
                let severity = 'minor';
                if (line.match(/critical|fundamental|severe|major error/i)) {
                    severity = 'critical';
                } else if (line.match(/significant|important|major|substantial/i)) {
                    severity = 'major';
                }
                
                // Determine category
                let category = 'general';
                if (line.match(/spell|typo|grammar/i)) {
                    category = 'spelling/grammar';
                } else if (line.match(/fact|claim|statistic|accuracy/i)) {
                    category = 'factual';
                } else if (line.match(/logic|reasoning|contradiction/i)) {
                    category = 'logical';
                } else if (line.match(/clarity|unclear|confusing|readability/i)) {
                    category = 'clarity';
                } else if (line.match(/format|structure|heading/i)) {
                    category = 'formatting';
                } else if (line.match(/math|calculation|formula/i)) {
                    category = 'mathematical';
                }
                
                // Start new finding
                currentFinding = {
                    source: file,
                    taskDesc: taskData.taskDesc,
                    category: category,
                    severity: severity,
                    lineNumbers: lineNum ? [lineNum] : [],
                    description: line.trim(),
                    quotes: [],
                    timestamp: new Date().toISOString()
                };
                inFinding = true;
            } else if (inFinding && currentFinding) {
                // Continue building current finding
                
                // Check for quotes (lines that start with > or are in quotes)
                if (line.match(/^\s*>/) || line.match(/[""].*[""]/) || line.match(/[''].*['']/) ) {
                    currentFinding.quotes.push(line.trim());
                }
                
                // Check for additional line numbers
                const additionalLines = line.matchAll(/[Ll]ine\s+(\d+)/g);
                for (const match of additionalLines) {
                    const lineNum = parseInt(match[1]);
                    if (!currentFinding.lineNumbers.includes(lineNum)) {
                        currentFinding.lineNumbers.push(lineNum);
                    }
                }
                
                // Add to description if it contains useful info
                if (line.trim() && !line.match(/^\s*[-•]?\s*$/) && !line.match(/^#{1,4}\s*$/)) {
                    currentFinding.description += ' ' + line.trim();
                }
                
                // End finding on empty line or new section
                if (line.trim() === '' || line.match(/^#{1,4}\s+/)) {
                    if (currentFinding.description) {
                        findings.push(currentFinding);
                    }
                    currentFinding = null;
                    inFinding = false;
                }
            }
        });
        
        // Don't forget the last finding
        if (currentFinding && currentFinding.description) {
            findings.push(currentFinding);
        }
        
    } catch (error) {
        console.error(`Error parsing ${file}:`, error.message);
    }
});

// Sort findings by severity and line number
const severityOrder = { critical: 0, major: 1, minor: 2 };
findings.sort((a, b) => {
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    
    const lineA = a.lineNumbers[0] || 999999;
    const lineB = b.lineNumbers[0] || 999999;
    return lineA - lineB;
});

// Output results
const output = {
    outputDir: outputDir,
    totalTasks: totalTasks,
    successfulTasks: successfulTasks,
    findingsCount: findings.length,
    findingsBySeverity: {
        critical: findings.filter(f => f.severity === 'critical').length,
        major: findings.filter(f => f.severity === 'major').length,
        minor: findings.filter(f => f.severity === 'minor').length
    },
    findingsByCategory: {},
    findings: findings
};

// Count by category
findings.forEach(f => {
    output.findingsByCategory[f.category] = (output.findingsByCategory[f.category] || 0) + 1;
});

console.log(JSON.stringify(output, null, 2));