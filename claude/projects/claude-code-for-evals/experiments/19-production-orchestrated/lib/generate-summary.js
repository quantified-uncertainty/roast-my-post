#!/usr/bin/env node

/**
 * Generate executive summary JSON
 */

const fs = require('fs');

function generateSummary(findingsPath, patternsPath) {
    const findings = JSON.parse(fs.readFileSync(findingsPath, 'utf8'));
    const patterns = JSON.parse(fs.readFileSync(patternsPath, 'utf8'));
    
    // Calculate key metrics
    const severityCounts = {
        critical: findings.filter(f => f.severity === 'critical').length,
        major: findings.filter(f => f.severity === 'major').length,
        minor: findings.filter(f => f.severity === 'minor').length
    };
    
    // Identify top issues
    const criticalIssues = findings
        .filter(f => f.severity === 'critical')
        .slice(0, 5)
        .map(f => ({
            line: f.line,
            category: f.category,
            issue: f.issue
        }));
    
    // Calculate quality score (simple heuristic)
    const baseScore = 100;
    const deductions = {
        critical: 10,
        major: 3,
        minor: 1
    };
    
    let qualityScore = baseScore;
    qualityScore -= severityCounts.critical * deductions.critical;
    qualityScore -= severityCounts.major * deductions.major;
    qualityScore -= severityCounts.minor * deductions.minor;
    qualityScore = Math.max(0, qualityScore);
    
    // Determine overall assessment
    let overallAssessment;
    if (qualityScore >= 90) {
        overallAssessment = 'Excellent - Minor improvements needed';
    } else if (qualityScore >= 75) {
        overallAssessment = 'Good - Some issues need attention';
    } else if (qualityScore >= 60) {
        overallAssessment = 'Fair - Significant improvements required';
    } else if (qualityScore >= 40) {
        overallAssessment = 'Poor - Major revision needed';
    } else {
        overallAssessment = 'Critical - Fundamental issues throughout';
    }
    
    const summary = {
        metadata: {
            generatedAt: new Date().toISOString(),
            findingsCount: findings.length,
            patternsIdentified: patterns.patterns.length
        },
        metrics: {
            totalIssues: findings.length,
            severityCounts,
            categoryCounts: patterns.byCategory,
            qualityScore,
            issuesPerLine: parseFloat(patterns.statistics.averagePerLine)
        },
        topIssues: criticalIssues,
        systematicProblems: patterns.patterns.map(p => ({
            name: p.name,
            severity: p.severity,
            occurrences: p.instances
        })),
        hotspots: patterns.hotspots.slice(0, 3).map(h => ({
            line: h.line,
            issueCount: h.issueCount,
            categories: [...new Set(h.findings.map(f => f.category))]
        })),
        assessment: {
            overall: overallAssessment,
            mostProblematicCategory: patterns.statistics.mostCommonCategory,
            recommendedPriority: severityCounts.critical > 0 ? 'critical' : 
                               severityCounts.major > 5 ? 'major' : 'minor',
            estimatedEffort: severityCounts.critical * 30 + 
                           severityCounts.major * 10 + 
                           severityCounts.minor * 2 + ' minutes'
        },
        recommendations: generateRecommendations(findings, patterns)
    };
    
    return summary;
}

function generateRecommendations(findings, patterns) {
    const recommendations = [];
    
    // Critical issues first
    if (findings.some(f => f.severity === 'critical')) {
        recommendations.push({
            priority: 1,
            action: 'Address all critical issues immediately',
            reason: 'Critical issues invalidate key points or cause serious misunderstanding'
        });
    }
    
    // Systematic problems
    patterns.patterns.forEach((pattern, index) => {
        recommendations.push({
            priority: 2 + index,
            action: `Fix systematic issue: ${pattern.name}`,
            reason: pattern.description
        });
    });
    
    // Category-specific recommendations
    const categoryCounts = patterns.byCategory;
    
    if (categoryCounts.mathematical_accuracy > 3) {
        recommendations.push({
            priority: 10,
            action: 'Have a mathematician review all calculations and formulas',
            reason: 'Multiple mathematical errors detected'
        });
    }
    
    if (categoryCounts.clarity_readability > 5) {
        recommendations.push({
            priority: 11,
            action: 'Revise for clarity and readability',
            reason: 'Numerous clarity issues impact comprehension'
        });
    }
    
    if (categoryCounts.missing_content > 2) {
        recommendations.push({
            priority: 12,
            action: 'Add missing explanations and context',
            reason: 'Key information is missing or incomplete'
        });
    }
    
    // Sort by priority
    recommendations.sort((a, b) => a.priority - b.priority);
    
    return recommendations.slice(0, 5);  // Top 5 recommendations
}

// Main execution
if (require.main === module) {
    const [findingsPath, patternsPath] = process.argv.slice(2);
    
    if (!findingsPath || !patternsPath) {
        console.error('Usage: generate-summary.js <findings-path> <patterns-path>');
        process.exit(1);
    }
    
    try {
        const summary = generateSummary(findingsPath, patternsPath);
        console.log(JSON.stringify(summary, null, 2));
    } catch (error) {
        console.error('Error generating summary:', error.message);
        process.exit(1);
    }
}

module.exports = { generateSummary };