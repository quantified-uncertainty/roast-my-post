#!/usr/bin/env node

/**
 * Create synthesis prompt for final report generation
 */

const fs = require('fs');

function createSynthesisPrompt(documentPath, findingsPath, patternsPath) {
    const document = fs.readFileSync(documentPath, 'utf8');
    const findings = JSON.parse(fs.readFileSync(findingsPath, 'utf8'));
    const patterns = JSON.parse(fs.readFileSync(patternsPath, 'utf8'));
    
    // Group findings by category and severity
    const findingsByCategory = {};
    const findingsBySeverity = {
        critical: [],
        major: [],
        minor: []
    };
    
    findings.forEach(finding => {
        if (!findingsByCategory[finding.category]) {
            findingsByCategory[finding.category] = [];
        }
        findingsByCategory[finding.category].push(finding);
        findingsBySeverity[finding.severity].push(finding);
    });
    
    const prompt = `You are a senior technical editor preparing a comprehensive analysis report. You have been provided with validated findings from multiple expert reviewers who analyzed a document from different perspectives.

Your task is to create a professional, well-structured report that synthesizes all findings into a coherent narrative.

## Document Being Analyzed

${document}

## Validated Findings (${findings.length} total)

Critical Issues (${findingsBySeverity.critical.length}):
${findingsBySeverity.critical.map(f => `- Line ${f.line}: ${f.issue} (${f.category})`).join('\n')}

Major Issues (${findingsBySeverity.major.length}):
${findingsBySeverity.major.map(f => `- Line ${f.line}: ${f.issue} (${f.category})`).join('\n')}

Minor Issues (${findingsBySeverity.minor.length}):
${findingsBySeverity.minor.map(f => `- Line ${f.line}: ${f.issue} (${f.category})`).join('\n')}

## Identified Patterns

${patterns.patterns.map(p => `- ${p.name}: ${p.description} (${p.instances} instances)`).join('\n')}

## Your Report Should Include:

1. **Executive Summary** (3-4 paragraphs)
   - Overall assessment of the document
   - Most critical issues that need immediate attention
   - Key strengths of the document (if any)
   - Overall recommendation

2. **Critical Issues** (detailed section)
   - Each critical issue explained with context
   - Why it matters
   - Specific fix required

3. **Major Issues** (organized by theme/category)
   - Group related issues together
   - Explain the impact
   - Suggest improvements

4. **Minor Issues** (brief listing)
   - Quick fixes needed
   - Can be in bullet format

5. **Positive Aspects** (if applicable)
   - What the document does well
   - Innovative approaches
   - Clear explanations

6. **Recommendations**
   - Prioritized list of actions
   - Specific steps to improve the document
   - Areas that may need expert review

7. **Technical Summary**
   - Statistics about issues found
   - Coverage of the analysis
   - Confidence in findings

## Guidelines:

- Be professional but accessible
- Prioritize actionable feedback
- Group similar issues to avoid repetition
- Provide specific examples from the document
- Balance criticism with recognition of strengths
- Use clear section headings and formatting
- Include specific line references for major issues

Create a comprehensive report that would be useful for the document author to improve their work.`;
    
    return prompt;
}

// Main execution
if (require.main === module) {
    const [documentPath, findingsPath, patternsPath] = process.argv.slice(2);
    
    if (!documentPath || !findingsPath || !patternsPath) {
        console.error('Usage: create-synthesis-prompt.js <document-path> <findings-path> <patterns-path>');
        process.exit(1);
    }
    
    try {
        const prompt = createSynthesisPrompt(documentPath, findingsPath, patternsPath);
        console.log(prompt);
    } catch (error) {
        console.error('Error creating synthesis prompt:', error.message);
        process.exit(1);
    }
}

module.exports = { createSynthesisPrompt };