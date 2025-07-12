#!/usr/bin/env node

/**
 * Validate and deduplicate findings
 */

const fs = require('fs');

function calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = calculateEditDistance(longer, shorter);
    return (longer.length - editDistance) / parseFloat(longer.length);
}

function calculateEditDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    
    return matrix[str2.length][str1.length];
}

function areFindingsSimilar(finding1, finding2) {
    // Same line and category is a strong indicator
    if (finding1.line === finding2.line && finding1.category === finding2.category) {
        // Check if quotes are similar
        const quoteSimilarity = calculateSimilarity(finding1.quote, finding2.quote);
        if (quoteSimilarity > 0.8) {
            return true;
        }
        
        // Check if issues are similar
        const issueSimilarity = calculateSimilarity(finding1.issue, finding2.issue);
        if (issueSimilarity > 0.7) {
            return true;
        }
    }
    
    // Check for very similar quotes at nearby lines
    if (Math.abs(finding1.line - finding2.line) <= 2) {
        const quoteSimilarity = calculateSimilarity(finding1.quote, finding2.quote);
        const issueSimilarity = calculateSimilarity(finding1.issue, finding2.issue);
        
        if (quoteSimilarity > 0.9 && issueSimilarity > 0.8) {
            return true;
        }
    }
    
    return false;
}

function deduplicateFindings(findings) {
    const uniqueFindings = [];
    const severityOrder = { critical: 0, major: 1, minor: 2 };
    
    for (const finding of findings) {
        let isDuplicate = false;
        
        for (let i = 0; i < uniqueFindings.length; i++) {
            if (areFindingsSimilar(finding, uniqueFindings[i])) {
                isDuplicate = true;
                
                // Keep the more severe rating
                if (severityOrder[finding.severity] < severityOrder[uniqueFindings[i].severity]) {
                    uniqueFindings[i] = finding;
                }
                break;
            }
        }
        
        if (!isDuplicate) {
            uniqueFindings.push(finding);
        }
    }
    
    return uniqueFindings;
}

function validateAndDeduplicate(findingsPath) {
    const allFindings = JSON.parse(fs.readFileSync(findingsPath, 'utf8'));
    
    // Additional validation
    const validFindings = allFindings.filter(finding => {
        // Check for obvious garbage patterns
        if (finding.quote.includes('Line') && finding.quote.match(/Line \d+/)) {
            return false;  // Likely picked up a line number reference
        }
        
        if (finding.issue.length < 10 || finding.issue.length > 500) {
            return false;  // Issue description too short or too long
        }
        
        if (finding.quote.length < 3 || finding.quote.length > 200) {
            return false;  // Quote too short or too long
        }
        
        return true;
    });
    
    // Deduplicate
    const uniqueFindings = deduplicateFindings(validFindings);
    
    // Add metadata
    uniqueFindings.forEach((finding, index) => {
        finding.id = `finding-${index + 1}`;
        finding.validated = true;
    });
    
    return uniqueFindings;
}

// Main execution
if (require.main === module) {
    const findingsPath = process.argv[2];
    if (!findingsPath) {
        console.error('Usage: validate-findings.js <findings-path>');
        process.exit(1);
    }
    
    try {
        const validatedFindings = validateAndDeduplicate(findingsPath);
        console.log(JSON.stringify(validatedFindings, null, 2));
    } catch (error) {
        console.error('Error validating findings:', error.message);
        process.exit(1);
    }
}

module.exports = { validateAndDeduplicate, areFindingsSimilar };