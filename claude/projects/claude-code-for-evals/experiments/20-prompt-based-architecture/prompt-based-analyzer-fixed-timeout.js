#!/usr/bin/env node

// Fixed version with proper timeout handling
// Copy the essential structure but fix the timeout issue

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Import the ANALYSIS_PROMPTS from the original
const ANALYSIS_PROMPTS = {
    logical_errors: {
        name: "Logical Error Detection",
        description: "Find logical inconsistencies and contradictions",
        prompt: `Find logical errors in this text section.

For each potential logical error:
1. Identify the specific claims or statements involved
2. Explain why they might be contradictory or inconsistent
3. Rate severity: critical (invalidates main argument), major (significant flaw), minor (small inconsistency)

Use this format for each finding:
FINDING: [line] | [severity] | [quote] | [explanation]

If you need to verify claims, note them as:
NEEDS_VERIFICATION: [claim] | [suggested search query]

Text section (lines {startLine}-{endLine}):
{content}`,
        tools: ["verify_claim", "check_definition"],
        estimatedTokens: 2000
    }
};

class FixedAnalyzer {
    constructor(options = {}) {
        this.timeout = options.timeout || 30; // 30 seconds default
        this.selectedPrompts = options.prompts || ['logical_errors'];
        this.chunkSize = options.chunkSize || 2000;
    }

    async analyze(documentPath) {
        console.log('\n📋 Fixed Prompt-Based Document Analysis');
        console.log('==================================================');
        console.log(`Document: ${documentPath}`);
        console.log(`Timeout: ${this.timeout} seconds`);
        
        try {
            // Read document
            const doc = await fs.readFile(documentPath, 'utf-8');
            
            // For now, just analyze the whole document as one chunk
            const prompt = ANALYSIS_PROMPTS.logical_errors.prompt
                .replace(/{startLine}/g, '1')
                .replace(/{endLine}/g, doc.split('\n').length)
                .replace(/{content}/g, doc);
            
            console.log('\nRunning analysis...');
            const startTime = Date.now();
            
            const result = await this.callClaude(prompt, this.timeout);
            
            const duration = (Date.now() - startTime) / 1000;
            console.log(`\nCompleted in ${duration.toFixed(1)}s`);
            
            // Parse findings
            const findings = this.parseFindings(result);
            console.log(`Found ${findings.length} issues`);
            
            // Show first few findings
            console.log('\nSample findings:');
            findings.slice(0, 3).forEach(f => {
                console.log(`- Line ${f.line} (${f.severity}): ${f.explanation}`);
            });
            
            return { success: true, findings };
            
        } catch (error) {
            console.error('\n❌ Analysis failed:', error.message);
            return { success: false, error: error.message };
        }
    }
    
    async callClaude(prompt, timeout = 30) {
        const tempFile = `/tmp/claude-prompt-${Date.now()}.txt`;
        await fs.writeFile(tempFile, prompt);
        
        try {
            const { stdout, stderr } = await execAsync(
                `cat ${tempFile} | claude --print`,
                { 
                    maxBuffer: 10 * 1024 * 1024,
                    shell: '/bin/bash',
                    timeout: (timeout + 5) * 1000  // CRITICAL FIX: Add Node.js timeout!
                }
            );
            
            await fs.unlink(tempFile).catch(() => {});
            
            if (stderr && stderr.includes('error')) {
                throw new Error(stderr);
            }
            
            return stdout;
        } catch (error) {
            await fs.unlink(tempFile).catch(() => {});
            
            // Better error handling
            if (error.killed && error.signal === 'SIGTERM') {
                throw new Error(`Command timed out after ${timeout} seconds`);
            }
            throw error;
        }
    }
    
    parseFindings(response) {
        const findings = [];
        const lines = response.split('\n');
        
        for (const line of lines) {
            if (line.startsWith('FINDING:')) {
                const parts = line.substring(8).split('|').map(s => s.trim());
                if (parts.length >= 4) {
                    findings.push({
                        line: parseInt(parts[0]) || 0,
                        severity: parts[1],
                        quote: parts[2],
                        explanation: parts[3]
                    });
                }
            }
        }
        
        return findings;
    }
}

// CLI
if (require.main === module) {
    const documentPath = process.argv[2];
    
    if (!documentPath) {
        console.error('Usage: ./prompt-based-analyzer-fixed-timeout.js <document>');
        process.exit(1);
    }
    
    const analyzer = new FixedAnalyzer({
        timeout: parseInt(process.env.TIMEOUT) || 30
    });
    
    analyzer.analyze(documentPath)
        .then(result => process.exit(result.success ? 0 : 1))
        .catch(error => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}