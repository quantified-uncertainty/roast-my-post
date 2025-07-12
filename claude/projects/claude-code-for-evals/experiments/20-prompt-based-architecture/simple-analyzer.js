#!/usr/bin/env node

/**
 * Simplified document analyzer - single file, minimal dependencies
 * 
 * Key improvements:
 * - All logic in one file
 * - Structured prompts for reliable parsing
 * - Simple parallel execution
 * - Better error handling
 */

const fs = require('fs').promises;
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const path = require('path');

class SimpleDocumentAnalyzer {
    constructor(options = {}) {
        this.maxConcurrent = options.maxConcurrent || 4;
        this.timeout = options.timeout || 600; // seconds
        this.outputDir = null;
    }

    async analyze(documentPath) {
        console.log('\n📄 Document Analysis Starting');
        console.log('=' .repeat(50));
        
        try {
            // Setup
            const doc = await fs.readFile(documentPath, 'utf8');
            const docName = path.basename(documentPath, '.md');
            this.outputDir = await this.createOutputDir(docName);
            
            console.log(`Document: ${documentPath}`);
            console.log(`Output: ${this.outputDir}\n`);
            
            // Step 1: Classify document (single Claude call)
            console.log('1️⃣  Classifying document...');
            const classification = await this.classifyDocument(doc);
            console.log(`   Type: ${classification.type}`);
            console.log(`   Focus areas: ${classification.focus.join(', ')}\n`);
            
            // Step 2: Run focused analyses in parallel
            console.log('2️⃣  Running analyses...');
            const findings = await this.runParallelAnalyses(doc, classification);
            const totalFindings = findings.flat().length;
            console.log(`   Total findings: ${totalFindings}\n`);
            
            // Step 3: Generate report (single Claude call)
            console.log('3️⃣  Generating report...');
            const report = await this.generateReport(doc, findings, classification);
            
            // Save everything
            await this.saveResults({
                classification,
                findings: findings.flat(),
                report,
                metadata: {
                    documentPath,
                    timestamp: new Date().toISOString(),
                    totalFindings
                }
            });
            
            console.log('\n✅ Analysis Complete!');
            console.log(`Report: ${this.outputDir}/report.md`);
            console.log(`Findings: ${this.outputDir}/findings.json`);
            
            return { success: true, outputDir: this.outputDir };
            
        } catch (error) {
            console.error('\n❌ Analysis failed:', error.message);
            return { success: false, error: error.message };
        }
    }
    
    async createOutputDir(docName) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const dir = `outputs/${docName}-${timestamp}`;
        await fs.mkdir(dir, { recursive: true });
        return dir;
    }
    
    async classifyDocument(doc) {
        const prompt = `Analyze this document and return a JSON classification.

Document (first 1500 chars):
${doc.slice(0, 1500)}...

Return ONLY valid JSON in this format:
{
  "type": "technical|research|policy|opinion",
  "focus": ["factual_accuracy", "logical_consistency", "statistical_validity"],
  "complexity": "high|medium|low",
  "checkWebClaims": true|false
}

Choose 2-3 focus areas based on the document content.`;

        const response = await this.callClaude(prompt);
        return this.extractJSON(response);
    }
    
    async runParallelAnalyses(doc, classification) {
        // Create analysis tasks based on classification
        const tasks = classification.focus.map(focus => ({
            type: focus,
            prompt: this.getAnalysisPrompt(focus, doc, classification.checkWebClaims)
        }));
        
        // Run with concurrency limit
        const results = [];
        const running = [];
        
        for (const task of tasks) {
            const promise = this.runSingleAnalysis(task)
                .then(findings => {
                    console.log(`   ✓ ${task.type}: ${findings.length} findings`);
                    return findings;
                });
            
            running.push(promise);
            
            if (running.length >= this.maxConcurrent) {
                const result = await Promise.race(running);
                results.push(result);
                running.splice(running.indexOf(promise), 1);
            }
        }
        
        // Wait for remaining
        const remaining = await Promise.all(running);
        results.push(...remaining);
        
        return results;
    }
    
    getAnalysisPrompt(analysisType, doc, includeWebSearch) {
        const prompts = {
            factual_accuracy: `Find factual errors in this document.
${includeWebSearch ? 'USE web search to verify any factual claims.' : ''}

For each error found, return in this EXACT format:
FINDING: [line number] | [severity: critical/major/minor] | [exact quote] | [what's wrong] ${includeWebSearch ? '| [source URL]' : ''}

Example:
FINDING: 23 | major | "US population is 500 million" | Should be ~330 million ${includeWebSearch ? '| census.gov/data/2024' : ''}

Document:
${doc}`,

            logical_consistency: `Find logical inconsistencies and contradictions.

For each issue found, return in this EXACT format:
FINDING: [line number] | [severity] | [exact quote] | [explanation]

Document:
${doc}`,

            statistical_validity: `Find statistical and data errors.

For each issue found, return in this EXACT format:
FINDING: [line number] | [severity] | [exact quote] | [what's wrong]

Document:
${doc}`
        };
        
        return prompts[analysisType] || prompts.logical_consistency;
    }
    
    async runSingleAnalysis(task) {
        try {
            const response = await this.callClaude(task.prompt);
            return this.parseFindings(response, task.type);
        } catch (error) {
            console.error(`   ✗ ${task.type}: failed (${error.message})`);
            return [];
        }
    }
    
    parseFindings(response, analysisType) {
        const findings = [];
        const lines = response.split('\n');
        
        for (const line of lines) {
            if (line.startsWith('FINDING:')) {
                const parts = line.substring(8).split('|').map(s => s.trim());
                if (parts.length >= 4) {
                    findings.push({
                        type: analysisType,
                        line: parseInt(parts[0]) || 0,
                        severity: parts[1],
                        quote: parts[2],
                        issue: parts[3],
                        source: parts[4] || null,
                        timestamp: new Date().toISOString()
                    });
                }
            }
        }
        
        return findings;
    }
    
    async generateReport(doc, findings, classification) {
        const findingsList = findings.flat();
        const currentDate = new Date().toISOString().split('T')[0];
        
        const prompt = `Generate a professional analysis report.

Context: Today is ${currentDate} (year 2025).

Document type: ${classification.type}
Total findings: ${findingsList.length}

Findings by severity:
- Critical: ${findingsList.filter(f => f.severity === 'critical').length}
- Major: ${findingsList.filter(f => f.severity === 'major').length}
- Minor: ${findingsList.filter(f => f.severity === 'minor').length}

Top findings to discuss:
${findingsList.slice(0, 10).map(f => 
    `- Line ${f.line} (${f.severity}): ${f.issue}${f.source ? ' [Source: ' + f.source + ']' : ''}`
).join('\n')}

Create a report with:
1. Executive Summary (2-3 paragraphs)
2. Critical Issues (if any)
3. Major Issues (grouped by theme)
4. Recommendations (prioritized)
5. Positive Aspects (what works well)

Be specific and actionable. Include source URLs where provided.`;

        return await this.callClaude(prompt);
    }
    
    async callClaude(prompt) {
        // Save prompt to temp file to avoid shell escaping issues
        const tempFile = `/tmp/claude-prompt-${Date.now()}.txt`;
        await fs.writeFile(tempFile, prompt);
        
        try {
            const { stdout, stderr } = await execAsync(
                `cat ${tempFile} | timeout ${this.timeout} claude --print`,
                { 
                    maxBuffer: 10 * 1024 * 1024, // 10MB
                    shell: '/bin/bash'
                }
            );
            
            await fs.unlink(tempFile).catch(() => {}); // Clean up
            
            if (stderr && stderr.includes('error')) {
                throw new Error(stderr);
            }
            
            return stdout;
        } catch (error) {
            await fs.unlink(tempFile).catch(() => {});
            throw error;
        }
    }
    
    extractJSON(text) {
        // Try to find JSON in the response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[0]);
            } catch (e) {
                // Fallback to defaults
            }
        }
        
        return {
            type: 'general',
            focus: ['logical_consistency', 'factual_accuracy'],
            complexity: 'medium',
            checkWebClaims: true
        };
    }
    
    async saveResults(results) {
        // Save findings as JSON
        await fs.writeFile(
            `${this.outputDir}/findings.json`,
            JSON.stringify(results.findings, null, 2)
        );
        
        // Save report as markdown
        await fs.writeFile(
            `${this.outputDir}/report.md`,
            results.report
        );
        
        // Save metadata
        await fs.writeFile(
            `${this.outputDir}/metadata.json`,
            JSON.stringify({
                ...results.metadata,
                classification: results.classification
            }, null, 2)
        );
        
        // Create summary
        const summary = `# Analysis Summary

**Document**: ${results.metadata.documentPath}
**Date**: ${results.metadata.timestamp}
**Type**: ${results.classification.type}
**Total Findings**: ${results.metadata.totalFindings}

## Breakdown by Severity
- Critical: ${results.findings.filter(f => f.severity === 'critical').length}
- Major: ${results.findings.filter(f => f.severity === 'major').length}
- Minor: ${results.findings.filter(f => f.severity === 'minor').length}

## Focus Areas
${results.classification.focus.map(f => `- ${f}`).join('\n')}

See report.md for full analysis.`;

        await fs.writeFile(`${this.outputDir}/summary.md`, summary);
    }
}

// CLI
if (require.main === module) {
    const documentPath = process.argv[2];
    
    if (!documentPath) {
        console.error('Usage: simple-analyzer.js <document-path>');
        process.exit(1);
    }
    
    const analyzer = new SimpleDocumentAnalyzer({
        maxConcurrent: parseInt(process.env.MAX_CONCURRENT) || 4,
        timeout: parseInt(process.env.TIMEOUT) || 600
    });
    
    analyzer.analyze(documentPath)
        .then(result => process.exit(result.success ? 0 : 1))
        .catch(error => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

module.exports = SimpleDocumentAnalyzer;