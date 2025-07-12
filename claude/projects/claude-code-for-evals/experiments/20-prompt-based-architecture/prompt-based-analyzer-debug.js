#!/usr/bin/env node

// Debug version of prompt-based analyzer
// Copy the original but add console.log statements

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Just test the essential parts
class DebugAnalyzer {
    async testAnalysis() {
        console.log("Starting debug analysis...");
        
        // Test 1: Simple prompt
        console.log("\n1. Testing simple prompt:");
        const simplePrompt = "What is 2+2? Just the number.";
        const result1 = await this.callClaude(simplePrompt, 30);
        console.log("Result:", result1.trim());
        
        // Test 2: Complex prompt with FINDING format
        console.log("\n2. Testing complex prompt:");
        const complexPrompt = `Find logical errors in this text.

Use this format:
FINDING: [line] | [severity] | [quote] | [explanation]

Text:
The sky is green. All birds can fly. Penguins are birds that cannot fly.`;
        
        const result2 = await this.callClaude(complexPrompt, 30);
        console.log("Result:", result2.trim().substring(0, 200) + "...");
        
        // Test 3: Full document chunk (abbreviated)
        console.log("\n3. Testing with document chunk:");
        const docPrompt = `Find logical errors in this text section.

For each potential logical error:
1. Identify the specific claims or statements involved
2. Explain why they might be contradictory or inconsistent

Use this format for each finding:
FINDING: [line] | [severity] | [quote] | [explanation]

Text section (lines 1-10):
# squiggle model
Author: Unknown
URL: N/A
Date: Sun Jul 06 2025 14:47:07 GMT-0700 (Pacific Daylight Time)`;

        console.log("Calling claude with timeout 60...");
        const startTime = Date.now();
        const result3 = await this.callClaude(docPrompt, 60);
        const duration = (Date.now() - startTime) / 1000;
        console.log(`Completed in ${duration}s`);
        console.log("Result:", result3.trim().substring(0, 200) + "...");
    }
    
    async callClaude(prompt, timeout = 300) {
        const tempFile = `/tmp/claude-prompt-debug-${Date.now()}.txt`;
        console.log(`  Writing to temp file: ${tempFile}`);
        await fs.writeFile(tempFile, prompt);
        
        try {
            const command = `cat ${tempFile} | timeout ${timeout} claude --print`;
            console.log(`  Executing: ${command.substring(0, 50)}...`);
            
            const { stdout, stderr } = await execAsync(command, { 
                maxBuffer: 10 * 1024 * 1024, 
                shell: '/bin/bash',
                timeout: (timeout + 5) * 1000 // Add 5 seconds to Node timeout
            });
            
            if (stderr) {
                console.log("  Stderr:", stderr);
            }
            
            await fs.unlink(tempFile).catch(() => {});
            return stdout;
        } catch (error) {
            console.error("  Error:", error.message);
            await fs.unlink(tempFile).catch(() => {});
            throw error;
        }
    }
}

const analyzer = new DebugAnalyzer();
analyzer.testAnalysis().catch(console.error);