#!/usr/bin/env node

/**
 * Simple Semantic Analyzer - MVP Version
 * 
 * Minimal features:
 * 1. Basic header-based chunking
 * 2. Two simple analysis types (factual claims + logical consistency)
 * 3. Sequential processing (no parallelism yet)
 * 4. Simple result aggregation
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Simple chunking - just split by headers
function chunkByHeaders(content) {
    const lines = content.split('\n');
    const chunks = [];
    let currentChunk = [];
    let currentHeader = 'Document Start';
    let startLine = 1;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const headerMatch = line.match(/^#{1,3}\s+(.+)$/);
        
        if (headerMatch && currentChunk.length > 0) {
            // Save current chunk
            chunks.push({
                id: `chunk-${chunks.length + 1}`,
                header: currentHeader,
                content: currentChunk.join('\n'),
                startLine,
                endLine: i,
                lineCount: currentChunk.length
            });
            
            // Start new chunk
            currentHeader = headerMatch[1];
            currentChunk = [line];
            startLine = i + 1;
        } else {
            currentChunk.push(line);
        }
    }
    
    // Don't forget the last chunk
    if (currentChunk.length > 0) {
        chunks.push({
            id: `chunk-${chunks.length + 1}`,
            header: currentHeader,
            content: currentChunk.join('\n'),
            startLine,
            endLine: lines.length,
            lineCount: currentChunk.length
        });
    }
    
    return chunks;
}

// Two simple analysis types
const ANALYSIS_TYPES = {
    factual_claims: {
        name: "Factual Claim Check",
        prompt: `Analyze this text section for factual claims that might need verification.

Section: {header}
Lines {startLine}-{endLine}:
{content}

For each factual claim found, output EXACTLY in this format:
CLAIM: [line number] | "[exact quote]" | [brief description of claim]

Example:
CLAIM: 15 | "The unemployment rate is 3.5%" | Specific economic statistic

Only output CLAIM lines, nothing else.`
    },
    
    logical_consistency: {
        name: "Logical Consistency Check", 
        prompt: `Check this text section for logical inconsistencies or reasoning errors.

Section: {header}
Lines {startLine}-{endLine}:
{content}

For each logical issue found, output EXACTLY in this format:
LOGIC_ISSUE: [line number] | "[exact quote]" | [type: contradiction/fallacy/unsupported] | [explanation]

Example:
LOGIC_ISSUE: 23 | "All X are Y, but this X is not Y" | contradiction | Statement contradicts earlier premise

Only output LOGIC_ISSUE lines, nothing else.`
    }
};

class SimpleSemanticAnalyzer {
    constructor(documentPath) {
        this.documentPath = documentPath;
        this.jobId = `analysis-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
        this.outputDir = `outputs/${this.jobId}`;
    }
    
    async analyze() {
        console.log('\n🔍 Simple Semantic Analysis');
        console.log('=' .repeat(50));
        console.log(`Document: ${this.documentPath}`);
        
        try {
            // Setup
            await this.setup();
            
            // Step 1: Chunk document
            console.log('\n1️⃣  Chunking document...');
            const chunks = await this.chunkDocument();
            console.log(`   Created ${chunks.length} chunks`);
            
            // Step 2: Analyze each chunk
            console.log('\n2️⃣  Analyzing chunks...');
            const results = await this.analyzeChunks(chunks);
            
            // Step 3: Aggregate results
            console.log('\n3️⃣  Aggregating results...');
            const summary = await this.aggregateResults(results);
            
            // Step 4: Generate report
            console.log('\n4️⃣  Generating report...');
            await this.generateReport(chunks, results, summary);
            
            console.log('\n✅ Analysis complete!');
            console.log(`📁 Results saved to: ${this.outputDir}/`);
            
            return { chunks, results, summary };
            
        } catch (error) {
            console.error('\n❌ Analysis failed:', error.message);
            throw error;
        }
    }
    
    async setup() {
        this.content = await fs.readFile(this.documentPath, 'utf8');
        await fs.mkdir(this.outputDir, { recursive: true });
    }
    
    async chunkDocument() {
        const chunks = chunkByHeaders(this.content);
        
        // Save chunks for inspection
        await fs.writeFile(
            path.join(this.outputDir, 'chunks.json'),
            JSON.stringify(chunks, null, 2)
        );
        
        return chunks;
    }
    
    async analyzeChunks(chunks) {
        const results = [];
        
        for (const chunk of chunks) {
            console.log(`   Analyzing chunk ${chunk.id}: ${chunk.header}`);
            
            const chunkResults = {
                chunkId: chunk.id,
                header: chunk.header,
                analyses: {}
            };
            
            // Run each analysis type
            for (const [typeKey, analysisType] of Object.entries(ANALYSIS_TYPES)) {
                console.log(`     - ${analysisType.name}`);
                
                const prompt = analysisType.prompt
                    .replace('{header}', chunk.header)
                    .replace('{startLine}', chunk.startLine)
                    .replace('{endLine}', chunk.endLine)
                    .replace('{content}', chunk.content);
                
                try {
                    const response = await this.callClaude(prompt);
                    const findings = this.parseFindings(response, typeKey);
                    chunkResults.analyses[typeKey] = findings;
                } catch (error) {
                    console.error(`       Failed: ${error.message}`);
                    chunkResults.analyses[typeKey] = { error: error.message };
                }
            }
            
            results.push(chunkResults);
        }
        
        // Save raw results
        await fs.writeFile(
            path.join(this.outputDir, 'analysis-results.json'),
            JSON.stringify(results, null, 2)
        );
        
        return results;
    }
    
    parseFindings(response, analysisType) {
        const findings = [];
        const lines = response.split('\n');
        
        for (const line of lines) {
            if (analysisType === 'factual_claims' && line.startsWith('CLAIM:')) {
                const parts = line.substring(6).split('|').map(s => s.trim());
                if (parts.length >= 3) {
                    findings.push({
                        type: 'factual_claim',
                        line: parseInt(parts[0]),
                        quote: parts[1].replace(/"/g, ''),
                        description: parts[2]
                    });
                }
            } else if (analysisType === 'logical_consistency' && line.startsWith('LOGIC_ISSUE:')) {
                const parts = line.substring(12).split('|').map(s => s.trim());
                if (parts.length >= 4) {
                    findings.push({
                        type: 'logical_issue',
                        line: parseInt(parts[0]),
                        quote: parts[1].replace(/"/g, ''),
                        issueType: parts[2],
                        explanation: parts[3]
                    });
                }
            }
        }
        
        return findings;
    }
    
    async aggregateResults(results) {
        const summary = {
            totalChunks: results.length,
            totalFindings: 0,
            findingsByType: {},
            findingsByChunk: {}
        };
        
        // Collect all findings
        const allFindings = [];
        
        for (const result of results) {
            let chunkFindingCount = 0;
            
            for (const [analysisType, findings] of Object.entries(result.analyses)) {
                if (Array.isArray(findings)) {
                    for (const finding of findings) {
                        allFindings.push({
                            ...finding,
                            chunkId: result.chunkId,
                            chunkHeader: result.header
                        });
                        
                        // Update counts
                        summary.totalFindings++;
                        chunkFindingCount++;
                        summary.findingsByType[finding.type] = 
                            (summary.findingsByType[finding.type] || 0) + 1;
                    }
                }
            }
            
            summary.findingsByChunk[result.chunkId] = chunkFindingCount;
        }
        
        // Sort findings by line number
        allFindings.sort((a, b) => a.line - b.line);
        
        // Save aggregated findings
        await fs.writeFile(
            path.join(this.outputDir, 'all-findings.json'),
            JSON.stringify(allFindings, null, 2)
        );
        
        return { summary, allFindings };
    }
    
    async generateReport(chunks, results, { summary, allFindings }) {
        const report = `# Semantic Analysis Report

**Document**: ${path.basename(this.documentPath)}
**Date**: ${new Date().toISOString()}
**Analysis ID**: ${this.jobId}

## Summary

- **Total chunks analyzed**: ${summary.totalChunks}
- **Total findings**: ${summary.totalFindings}
- **Factual claims identified**: ${summary.findingsByType.factual_claim || 0}
- **Logical issues found**: ${summary.findingsByType.logical_issue || 0}

## Findings by Section

${chunks.map(chunk => {
    const chunkFindings = allFindings.filter(f => f.chunkId === chunk.id);
    const findingCount = summary.findingsByChunk[chunk.id] || 0;
    
    if (findingCount === 0) {
        return `### ${chunk.header}
*No issues found in this section.*`;
    }
    
    return `### ${chunk.header}
**${findingCount} finding(s)**

${chunkFindings.map(f => {
    if (f.type === 'factual_claim') {
        return `- **Line ${f.line}**: Factual claim - "${f.quote}"
  - *${f.description}*`;
    } else if (f.type === 'logical_issue') {
        return `- **Line ${f.line}**: ${f.issueType} - "${f.quote}"
  - *${f.explanation}*`;
    }
}).join('\n\n')}`;
}).join('\n\n')}

## All Findings (Sorted by Line)

${allFindings.map(f => {
    const prefix = f.type === 'factual_claim' ? '📊' : '⚠️';
    return `${prefix} **Line ${f.line}** (${f.chunkHeader}): ${
        f.type === 'factual_claim' ? f.description : f.explanation
    }`;
}).join('\n')}

---
*Generated by Simple Semantic Analyzer*`;
        
        await fs.writeFile(
            path.join(this.outputDir, 'report.md'),
            report
        );
        
        // Also create a simple issue list
        const issueList = allFindings.map(f => ({
            line: f.line,
            type: f.type,
            severity: f.type === 'logical_issue' && f.issueType === 'contradiction' ? 'high' : 'medium',
            description: f.type === 'factual_claim' ? f.description : f.explanation,
            quote: f.quote
        }));
        
        await fs.writeFile(
            path.join(this.outputDir, 'issue-list.json'),
            JSON.stringify(issueList, null, 2)
        );
    }
    
    async callClaude(prompt) {
        const tempFile = `/tmp/claude-prompt-${Date.now()}.txt`;
        await fs.writeFile(tempFile, prompt);
        
        try {
            const { stdout } = await execAsync(
                `timeout 60 cat ${tempFile} | claude --print`,
                { 
                    maxBuffer: 10 * 1024 * 1024,
                    shell: '/bin/bash',
                    timeout: 70000 // 70 second timeout (10s buffer for Node.js)
                }
            );
            await fs.unlink(tempFile).catch(() => {});
            return stdout;
        } catch (error) {
            await fs.unlink(tempFile).catch(() => {});
            throw error;
        }
    }
}

// CLI
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args[0] === '--help') {
        console.log(`
Simple Semantic Analyzer - Agile MVP

Usage:
  ./simple-semantic-analyzer.js <document>

Example:
  ./simple-semantic-analyzer.js test-document.md

This minimal version:
- Chunks by headers only
- Runs 2 analysis types sequentially
- Generates a simple report

Next steps could add:
- Parallel processing
- More analysis types
- Tool integration
- Smarter chunking
`);
        process.exit(0);
    }
    
    const analyzer = new SimpleSemanticAnalyzer(args[0]);
    
    analyzer.analyze()
        .then(() => process.exit(0))
        .catch(error => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

module.exports = { SimpleSemanticAnalyzer };