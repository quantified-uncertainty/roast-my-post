#!/usr/bin/env node

/**
 * Analyze patterns in findings
 */

const fs = require('fs');

function analyzePatterns(findingsPath) {
    const findings = JSON.parse(fs.readFileSync(findingsPath, 'utf8'));
    
    const patterns = {
        byCategory: {},
        bySeverity: {},
        hotspots: [],
        patterns: [],
        statistics: {
            total: findings.length,
            averagePerLine: 0,
            mostCommonCategory: '',
            mostCommonSeverity: ''
        }
    };
    
    // Count by category and severity
    findings.forEach(finding => {
        patterns.byCategory[finding.category] = (patterns.byCategory[finding.category] || 0) + 1;
        patterns.bySeverity[finding.severity] = (patterns.bySeverity[finding.severity] || 0) + 1;
    });
    
    // Find hotspots (lines with multiple issues)
    const lineCount = {};
    findings.forEach(finding => {
        lineCount[finding.line] = (lineCount[finding.line] || 0) + 1;
    });
    
    Object.entries(lineCount).forEach(([line, count]) => {
        if (count >= 2) {
            patterns.hotspots.push({
                line: parseInt(line),
                issueCount: count,
                findings: findings.filter(f => f.line === parseInt(line))
            });
        }
    });
    
    // Sort hotspots by issue count
    patterns.hotspots.sort((a, b) => b.issueCount - a.issueCount);
    
    // Identify specific patterns
    
    // Pattern 1: Mathematical confusion (R vs R²)
    const mathConfusion = findings.filter(f => 
        f.category === 'mathematical_accuracy' && 
        (f.issue.includes('R²') || f.issue.includes('R-squared') || f.issue.includes('R^2'))
    );
    
    if (mathConfusion.length >= 3) {
        patterns.patterns.push({
            type: 'systematic_error',
            name: 'R vs R² Confusion',
            description: 'Consistent confusion between correlation coefficient (R) and coefficient of determination (R²)',
            instances: mathConfusion.length,
            severity: 'critical',
            lines: mathConfusion.map(f => f.line)
        });
    }
    
    // Pattern 2: Missing calculations
    const missingCalcs = findings.filter(f => 
        f.category === 'missing_content' && 
        (f.issue.includes('calculation') || f.issue.includes('formula') || f.issue.includes('derivation'))
    );
    
    if (missingCalcs.length >= 2) {
        patterns.patterns.push({
            type: 'missing_content_pattern',
            name: 'Missing Mathematical Support',
            description: 'Multiple instances of claims without supporting calculations',
            instances: missingCalcs.length,
            severity: 'major',
            lines: missingCalcs.map(f => f.line)
        });
    }
    
    // Pattern 3: Clarity issues cluster
    const clarityIssues = findings.filter(f => f.category === 'clarity_readability');
    if (clarityIssues.length >= 5) {
        // Check if they cluster in certain sections
        const sectionClusters = [];
        let currentCluster = [clarityIssues[0]];
        
        for (let i = 1; i < clarityIssues.length; i++) {
            if (clarityIssues[i].line - clarityIssues[i-1].line <= 10) {
                currentCluster.push(clarityIssues[i]);
            } else {
                if (currentCluster.length >= 3) {
                    sectionClusters.push(currentCluster);
                }
                currentCluster = [clarityIssues[i]];
            }
        }
        
        if (currentCluster.length >= 3) {
            sectionClusters.push(currentCluster);
        }
        
        if (sectionClusters.length > 0) {
            patterns.patterns.push({
                type: 'quality_cluster',
                name: 'Clarity Issue Clusters',
                description: 'Sections with concentrated clarity problems',
                instances: sectionClusters.length,
                severity: 'major',
                clusters: sectionClusters.map(cluster => ({
                    startLine: cluster[0].line,
                    endLine: cluster[cluster.length - 1].line,
                    issueCount: cluster.length
                }))
            });
        }
    }
    
    // Calculate statistics
    patterns.statistics.mostCommonCategory = Object.entries(patterns.byCategory)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'none';
    
    patterns.statistics.mostCommonSeverity = Object.entries(patterns.bySeverity)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'none';
    
    if (findings.length > 0) {
        const maxLine = Math.max(...findings.map(f => f.line));
        patterns.statistics.averagePerLine = (findings.length / maxLine).toFixed(2);
    }
    
    return patterns;
}

// Main execution
if (require.main === module) {
    const findingsPath = process.argv[2];
    if (!findingsPath) {
        console.error('Usage: analyze-patterns.js <findings-path>');
        process.exit(1);
    }
    
    try {
        const patterns = analyzePatterns(findingsPath);
        console.log(JSON.stringify(patterns, null, 2));
    } catch (error) {
        console.error('Error analyzing patterns:', error.message);
        process.exit(1);
    }
}

module.exports = { analyzePatterns };