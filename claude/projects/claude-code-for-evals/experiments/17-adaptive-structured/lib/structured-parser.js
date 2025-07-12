#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Valid values for validation
const VALID_CATEGORIES = [
  'spelling_grammar',
  'mathematical_error',
  'logical_flaw',
  'factual_error',
  'clarity_issue',
  'structural_problem',
  'missing_content'
];

const VALID_SEVERITIES = ['critical', 'major', 'minor'];

/**
 * Parse structured findings from Claude's output
 */
function parseStructuredFindings(rawOutput, source = 'unknown') {
  const findings = [];
  
  // Regular expression to match findings
  const findingRegex = /\[FINDING\]([\s\S]*?)\[\/FINDING\]/g;
  
  let match;
  while ((match = findingRegex.exec(rawOutput)) !== null) {
    const findingText = match[1];
    
    try {
      const finding = parseSingleFinding(findingText, source);
      if (finding && validateFinding(finding)) {
        findings.push(finding);
      }
    } catch (error) {
      console.error('Error parsing finding:', error.message);
    }
  }
  
  return findings;
}

/**
 * Parse a single finding from text
 */
function parseSingleFinding(text, source) {
  const lines = text.trim().split('\n').map(l => l.trim());
  const finding = {
    source: source,
    timestamp: new Date().toISOString()
  };
  
  for (const line of lines) {
    if (line.startsWith('Category:')) {
      finding.category = line.substring(9).trim();
    } else if (line.startsWith('Severity:')) {
      finding.severity = line.substring(9).trim();
    } else if (line.startsWith('Line:')) {
      finding.line = parseInt(line.substring(5).trim());
    } else if (line.startsWith('Quote:')) {
      finding.quote = line.substring(6).trim().replace(/^["']|["']$/g, '');
    } else if (line.startsWith('Issue:')) {
      finding.issue = line.substring(6).trim();
    }
  }
  
  return finding;
}

/**
 * Validate a finding has all required fields and valid values
 */
function validateFinding(finding) {
  // Check required fields
  if (!finding.category || !finding.severity || !finding.line || !finding.quote || !finding.issue) {
    console.warn('Finding missing required fields:', finding);
    return false;
  }
  
  // Validate category
  if (!VALID_CATEGORIES.includes(finding.category)) {
    console.warn(`Invalid category: ${finding.category}`);
    return false;
  }
  
  // Validate severity
  if (!VALID_SEVERITIES.includes(finding.severity)) {
    console.warn(`Invalid severity: ${finding.severity}`);
    return false;
  }
  
  // Validate line number
  if (finding.line < 1 || finding.line > 10000) {
    console.warn(`Invalid line number: ${finding.line}`);
    return false;
  }
  
  // Validate quote length
  if (finding.quote.length < 5 || finding.quote.length > 500) {
    console.warn(`Invalid quote length: ${finding.quote.length}`);
    return false;
  }
  
  // Validate issue description
  if (finding.issue.length < 10) {
    console.warn(`Issue description too short: ${finding.issue}`);
    return false;
  }
  
  return true;
}

/**
 * Parse all task outputs in a directory
 */
function parseTaskOutputs(outputDir) {
  const results = {
    findings: [],
    stats: {
      totalTasks: 0,
      successfulTasks: 0,
      totalFindings: 0,
      bySeverity: { critical: 0, major: 0, minor: 0 },
      byCategory: {}
    }
  };
  
  // Read all task files
  const files = fs.readdirSync(outputDir)
    .filter(f => f.startsWith('task-') && f.endsWith('.json'));
  
  results.stats.totalTasks = files.length;
  
  for (const file of files) {
    try {
      const taskData = JSON.parse(fs.readFileSync(path.join(outputDir, file), 'utf8'));
      
      if (taskData.status === 'success' && taskData.output) {
        results.stats.successfulTasks++;
        
        const findings = parseStructuredFindings(taskData.output, taskData.taskId);
        results.findings.push(...findings);
      }
    } catch (error) {
      console.error(`Error parsing ${file}:`, error.message);
    }
  }
  
  // Calculate statistics
  results.stats.totalFindings = results.findings.length;
  
  for (const finding of results.findings) {
    // Count by severity
    results.stats.bySeverity[finding.severity]++;
    
    // Count by category
    results.stats.byCategory[finding.category] = 
      (results.stats.byCategory[finding.category] || 0) + 1;
  }
  
  return results;
}

// Export functions
module.exports = {
  parseStructuredFindings,
  validateFinding,
  parseTaskOutputs,
  VALID_CATEGORIES,
  VALID_SEVERITIES
};

// CLI usage
if (require.main === module) {
  const outputDir = process.argv[2];
  if (!outputDir) {
    console.error('Usage: structured-parser.js <output-directory>');
    process.exit(1);
  }
  
  const results = parseTaskOutputs(outputDir);
  console.log(JSON.stringify(results, null, 2));
}