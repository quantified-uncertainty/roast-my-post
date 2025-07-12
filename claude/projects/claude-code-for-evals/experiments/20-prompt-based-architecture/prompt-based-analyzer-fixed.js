#!/usr/bin/env node

/**
 * Fixed version of Prompt-Based Document Analyzer for Claude Code
 * 
 * Key fix: Claude Code expects the prompt as a direct argument, not via -p flag
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Copy all the ANALYSIS_PROMPTS from the original
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
    },

    factual_claims: {
        name: "Factual Claim Verification",
        description: "Identify and verify factual claims",
        prompt: `Identify all factual claims in this text section.

For each factual claim:
1. Extract the specific claim
2. Determine if it needs verification (statistics, dates, quotes, etc.)
3. Suggest how to verify it

Format:
CLAIM: [line] | [claim text] | [verification needed: yes/no] | [verification method]

For claims needing verification, also add:
VERIFY: [claim] | [search query] | [expected source type]

Text section (lines {startLine}-{endLine}):
{content}`,
        tools: ["web_search", "verify_statistic", "check_source"],
        estimatedTokens: 2500
    },

    statistical_analysis: {
        name: "Statistical Claim Analysis",
        description: "Analyze statistical claims and data",
        prompt: `Analyze all statistical claims in this text.

For each statistical claim:
1. Extract the specific numbers/statistics
2. Check for common statistical errors
3. Verify if the interpretation is correct

Look for:
- Correlation vs causation errors
- Sample size issues
- Cherry-picking
- Misrepresented percentages
- Outdated data

Format:
STAT_CLAIM: [line] | [statistic] | [issue type] | [explanation]

If verification needed:
VERIFY_STAT: [statistic] | [source to check] | [concern]

Text section (lines {startLine}-{endLine}):
{content}`,
        tools: ["calculate", "verify_statistic", "check_methodology"],
        estimatedTokens: 2000
    }
};

class PromptBasedAnalyzer {
    constructor(config = {}) {
        this.maxConcurrent = config.maxConcurrent || parseInt(process.env.MAX_CONCURRENT) || 4;
        this.chunkSize = config.chunkSize || parseInt(process.env.CHUNK_SIZE) || 2000;
        this.chunkOverlap = config.chunkOverlap || parseInt(process.env.CHUNK_OVERLAP) || 200;
        this.timeout = config.timeout || parseInt(process.env.TIMEOUT) || 300;
        this.selectedPrompts = config.prompts || Object.keys(ANALYSIS_PROMPTS);
    }

    async analyze(documentPath, resumeDir = null) {
        console.log('\n📋 Prompt-Based Document Analysis');
        console.log('==================================================');
        console.log(`Document: ${documentPath}`);
        
        // Load or create state
        const state = resumeDir 
            ? await this.loadState(resumeDir)
            : await this.createNewState(documentPath);
            
        console.log(`Job ID: ${state.jobId}`);
        console.log(`Selected prompts: ${this.selectedPrompts.length}`);
        console.log(`Output: ${state.outputDir}`);
        
        // Step 1: Chunk document if needed
        if (!state.chunks || state.chunks.length === 0) {
            console.log('\n1️⃣  Chunking document...');
            await this.chunkDocument(state);
            await this.saveState(state);
        }
        
        // Step 2: Create jobs if needed
        if (!state.jobs || state.jobs.length === 0) {
            console.log('2️⃣  Creating jobs from prompt templates...');
            await this.createJobs(state);
            await this.saveState(state);
        }
        
        this.showJobSummary(state);
        this.showStatus(state);
        
        // Step 3: Run pending jobs
        console.log('\n3️⃣  Running analysis jobs...');
        await this.runPendingJobs(state);
        
        // Step 4: Process results
        console.log('\n4️⃣  Processing results...');
        await this.processResults(state);
        
        // Final status
        console.log('\n==================================================\n');
        this.showStatus(state);
        
        const failedJobs = state.jobs.filter(j => j.status === 'failed');
        if (failedJobs.length > 0) {
            console.log(`\n⚠️   Some jobs failed. Run again to retry.`);
            console.log(`Resume: ./prompt-based-analyzer-fixed.js "${documentPath}" "${state.outputDir}"`);
        }
        
        return state;
    }

    async callClaude(prompt, timeout = 300) {
        // Fixed: Claude Code expects prompt as direct argument
        // Need to escape the prompt properly for shell
        const escapedPrompt = prompt
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\$/g, '\\$')
            .replace(/`/g, '\\`')
            .replace(/!/g, '\\!')
            .replace(/\n/g, '\\n');
        
        try {
            const { stdout } = await execAsync(
                `claude --print "${escapedPrompt}"`,
                { 
                    maxBuffer: 10 * 1024 * 1024,
                    timeout: timeout * 1000,
                    shell: '/bin/bash'
                }
            );
            return stdout;
        } catch (error) {
            // If timeout, error.killed will be true
            if (error.killed) {
                throw new Error(`Claude command timed out after ${timeout} seconds`);
            }
            throw error;
        }
    }

    // Include all the other methods from the original file...
    // (I'll include the key ones for brevity)

    async createNewState(documentPath) {
        const jobId = `${path.basename(documentPath, path.extname(documentPath))}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
        const outputDir = `outputs/${jobId}`;
        
        await fs.mkdir(outputDir, { recursive: true });
        await fs.mkdir(path.join(outputDir, 'chunks'), { recursive: true });
        
        return {
            jobId,
            documentPath,
            outputDir,
            createdAt: new Date().toISOString(),
            chunks: [],
            jobs: []
        };
    }

    async loadState(resumeDir) {
        const statePath = path.join(resumeDir, 'state.json');
        const state = JSON.parse(await fs.readFile(statePath, 'utf-8'));
        console.log('   Resuming from previous run...');
        return state;
    }

    async saveState(state) {
        await fs.writeFile(
            path.join(state.outputDir, 'state.json'),
            JSON.stringify(state, null, 2)
        );
    }

    async chunkDocument(state) {
        const content = await fs.readFile(state.documentPath, 'utf-8');
        const lines = content.split('\n');
        
        const chunks = [];
        let currentChunk = [];
        let startLine = 1;
        let tokenCount = 0;
        
        // Simple line-based chunking
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineTokens = Math.ceil(line.length / 4); // Rough estimate
            
            if (tokenCount + lineTokens > this.chunkSize && currentChunk.length > 0) {
                chunks.push({
                    id: `chunk-${chunks.length + 1}`,
                    content: currentChunk.join('\n'),
                    startLine,
                    endLine: i,
                    lines: currentChunk.length
                });
                
                // Start new chunk with overlap
                const overlapLines = Math.floor(this.chunkOverlap / 20);
                currentChunk = lines.slice(Math.max(0, i - overlapLines), i + 1);
                startLine = i - overlapLines + 1;
                tokenCount = currentChunk.join('\n').length / 4;
            } else {
                currentChunk.push(line);
                tokenCount += lineTokens;
            }
        }
        
        if (currentChunk.length > 0) {
            chunks.push({
                id: `chunk-${chunks.length + 1}`,
                content: currentChunk.join('\n'),
                startLine,
                endLine: lines.length,
                lines: currentChunk.length
            });
        }
        
        state.chunks = chunks;
        console.log(`   Created ${chunks.length} chunks`);
    }

    async createJobs(state) {
        const jobs = [];
        
        for (const chunk of state.chunks) {
            for (const promptKey of this.selectedPrompts) {
                if (!ANALYSIS_PROMPTS[promptKey]) {
                    console.warn(`   Warning: Unknown prompt key: ${promptKey}`);
                    continue;
                }
                
                const promptTemplate = ANALYSIS_PROMPTS[promptKey];
                
                jobs.push({
                    id: `job-${jobs.length + 1}`,
                    chunkId: chunk.id,
                    chunkLines: `${chunk.startLine}-${chunk.endLine}`,
                    promptKey,
                    promptName: promptTemplate.name,
                    tools: promptTemplate.tools,
                    estimatedTokens: promptTemplate.estimatedTokens,
                    status: 'pending',
                    attempts: 0,
                    createdAt: new Date().toISOString()
                });
            }
        }
        
        state.jobs = jobs;
        console.log(`   Creating ${jobs.length} jobs (${state.chunks.length} chunks × ${this.selectedPrompts.length} prompts)`);
    }

    async runSingleJob(state, job) {
        job.status = 'running';
        job.startedAt = new Date().toISOString();
        job.attempts++;
        
        try {
            // Get chunk and prompt template
            const chunk = state.chunks.find(c => c.id === job.chunkId);
            const promptTemplate = ANALYSIS_PROMPTS[job.promptKey];
            
            // Build prompt with substitutions
            const prompt = promptTemplate.prompt
                .replace(/{content}/g, chunk.content)
                .replace(/{startLine}/g, chunk.startLine)
                .replace(/{endLine}/g, chunk.endLine);
            
            // Run analysis
            const response = await this.callClaude(prompt, this.timeout);
            
            // Parse results
            const results = this.parseResults(response, job, promptTemplate);
            
            // Save job result
            job.status = 'completed';
            job.completedAt = new Date().toISOString();
            job.resultsCount = results.findings.length + results.verifications.length;
            job.results = results;
            
            // Save to file
            await fs.mkdir(path.join(state.outputDir, 'job-results'), { recursive: true });
            await fs.writeFile(
                path.join(state.outputDir, 'job-results', `${job.id}.json`),
                JSON.stringify({ job, results }, null, 2)
            );
            
            return results;
            
        } catch (error) {
            job.status = 'failed';
            job.error = error.message;
            job.failedAt = new Date().toISOString();
            throw error;
        }
    }

    async runPendingJobs(state) {
        const pendingJobs = state.jobs.filter(j => j.status === 'pending' || j.status === 'failed');
        
        if (pendingJobs.length === 0) {
            console.log('   No pending jobs');
            return;
        }
        
        const running = new Set();
        
        for (const job of pendingJobs) {
            while (running.size >= this.maxConcurrent) {
                await Promise.race(Array.from(running));
            }
            
            const promise = this.runSingleJob(state, job)
                .then(() => {
                    running.delete(promise);
                    const completed = state.jobs.filter(j => j.status === 'completed').length;
                    console.log(`   Progress: ${completed}/${state.jobs.length}`);
                    // Save state periodically
                    if (completed % 10 === 0) {
                        this.saveState(state);
                    }
                })
                .catch(error => {
                    running.delete(promise);
                    console.error(`   Job ${job.id} failed: ${error.message}`);
                });
            
            running.add(promise);
        }
        
        await Promise.all(Array.from(running));
        await this.saveState(state);
    }

    parseResults(response, job, promptTemplate) {
        const results = {
            findings: [],
            verifications: [],
            calculations: [],
            strong_points: []
        };
        
        const lines = response.split('\n');
        
        for (const line of lines) {
            // Parse FINDING format
            if (line.startsWith('FINDING:')) {
                const parts = line.substring(8).split('|').map(p => p.trim());
                if (parts.length >= 4) {
                    results.findings.push({
                        line: parseInt(parts[0]),
                        severity: parts[1],
                        quote: parts[2],
                        explanation: parts[3],
                        promptKey: job.promptKey
                    });
                }
            }
            
            // Parse VERIFY format
            if (line.startsWith('VERIFY:') || line.startsWith('NEEDS_VERIFICATION:')) {
                const prefix = line.startsWith('VERIFY:') ? 7 : 19;
                const parts = line.substring(prefix).split('|').map(p => p.trim());
                if (parts.length >= 2) {
                    results.verifications.push({
                        claim: parts[0],
                        searchQuery: parts[1],
                        sourceType: parts[2] || 'general',
                        promptKey: job.promptKey
                    });
                }
            }
            
            // Parse other formats...
            if (line.startsWith('STAT_CLAIM:')) {
                const parts = line.substring(11).split('|').map(p => p.trim());
                if (parts.length >= 4) {
                    results.findings.push({
                        line: parseInt(parts[0]),
                        severity: 'statistical',
                        statistic: parts[1],
                        issueType: parts[2],
                        explanation: parts[3],
                        promptKey: job.promptKey
                    });
                }
            }
        }
        
        return results;
    }

    async processResults(state) {
        // Aggregate all findings
        const allFindings = [];
        const allVerifications = [];
        
        for (const job of state.jobs) {
            if (job.status === 'completed' && job.results) {
                allFindings.push(...job.results.findings);
                allVerifications.push(...job.results.verifications);
            }
        }
        
        console.log(`   Total findings: ${allFindings.length}`);
        console.log(`   Verification requests: ${allVerifications.length}`);
        
        // Save aggregated results
        await fs.writeFile(
            path.join(state.outputDir, 'all-findings.json'),
            JSON.stringify(allFindings, null, 2)
        );
        
        await fs.writeFile(
            path.join(state.outputDir, 'verification-requests.json'),
            JSON.stringify(allVerifications, null, 2)
        );
        
        // Generate report
        await this.generateReport(state, allFindings, allVerifications);
    }

    async generateReport(state, findings, verifications) {
        let report = `# Document Analysis Report\n\n`;
        report += `**Document**: ${state.documentPath}\n`;
        report += `**Analysis Date**: ${new Date().toISOString()}\n`;
        report += `**Job ID**: ${state.jobId}\n\n`;
        
        report += `## Summary\n\n`;
        report += `- Total findings: ${findings.length}\n`;
        report += `- Verification requests: ${verifications.length}\n`;
        report += `- Analysis types: ${this.selectedPrompts.join(', ')}\n\n`;
        
        // Group findings by type
        const findingsByType = {};
        for (const finding of findings) {
            const type = ANALYSIS_PROMPTS[finding.promptKey]?.name || finding.promptKey;
            if (!findingsByType[type]) {
                findingsByType[type] = [];
            }
            findingsByType[type].push(finding);
        }
        
        // Add findings to report
        for (const [type, typeFindings] of Object.entries(findingsByType)) {
            report += `## ${type}\n\n`;
            
            for (const finding of typeFindings) {
                report += `### Line ${finding.line}`;
                if (finding.severity) {
                    report += ` (${finding.severity})`;
                }
                report += `\n\n`;
                
                if (finding.quote) {
                    report += `> ${finding.quote}\n\n`;
                }
                
                report += `${finding.explanation || finding.details || 'See details in JSON'}\n\n`;
            }
        }
        
        // Add verification requests
        if (verifications.length > 0) {
            report += `## Verification Needed\n\n`;
            for (const verify of verifications) {
                report += `- **${verify.claim}**\n`;
                report += `  - Search: ${verify.searchQuery}\n`;
                report += `  - Source type: ${verify.sourceType}\n\n`;
            }
        }
        
        await fs.writeFile(path.join(state.outputDir, 'report.md'), report);
    }

    showJobSummary(state) {
        console.log('\n📊 Job Summary by Prompt Type:');
        
        const promptCounts = {};
        for (const job of state.jobs) {
            promptCounts[job.promptName] = (promptCounts[job.promptName] || 0) + 1;
        }
        
        for (const [prompt, count] of Object.entries(promptCounts)) {
            console.log(`   ${prompt}: ${count} jobs`);
        }
        
        // Estimate time and cost
        const totalTokens = state.jobs.reduce((sum, job) => sum + job.estimatedTokens, 0);
        const estimatedMinutes = Math.ceil(state.jobs.length * 0.5); // 30 seconds per job
        const estimatedCost = (totalTokens / 1000000) * 3; // $3 per 1M tokens
        
        console.log(`\n   Estimated time: ${estimatedMinutes} minutes`);
        console.log(`   Estimated cost: $${estimatedCost.toFixed(2)}`);
    }

    showStatus(state) {
        if (!state.jobs || state.jobs.length === 0) {
            console.log('\nStatus: Initializing...');
            return;
        }
        
        const stats = {
            total: state.jobs.length,
            pending: state.jobs.filter(j => j.status === 'pending').length,
            running: state.jobs.filter(j => j.status === 'running').length,
            completed: state.jobs.filter(j => j.status === 'completed').length,
            failed: state.jobs.filter(j => j.status === 'failed').length
        };
        
        const completionRate = Math.round((stats.completed / stats.total) * 100);
        
        console.log('\n📊 Job Status:');
        console.log(`Total Jobs: ${stats.total}`);
        console.log(`✅ Completed: ${stats.completed} (${completionRate}%)`);
        console.log(`⏳ Pending: ${stats.pending}`);
        console.log(`🔄 Running: ${stats.running}`);
        console.log(`❌ Failed: ${stats.failed}`);
        
        if (stats.failed > 0) {
            const failedJobs = state.jobs.filter(j => j.status === 'failed');
            console.log('\nFailed Jobs:');
            for (const job of failedJobs.slice(0, 5)) {
                console.log(`- ${job.id}: ${job.error}`);
            }
            if (failedJobs.length > 5) {
                console.log(`... and ${failedJobs.length - 5} more`);
            }
        }
    }
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args[0] === '--help') {
        console.log('Usage: ./prompt-based-analyzer-fixed.js <document> [resume-dir] [options]');
        console.log('\nOptions:');
        console.log('  --prompts <types>  Comma-separated list of analysis types');
        console.log('  --list            List available analysis types');
        console.log('\nExamples:');
        console.log('  ./prompt-based-analyzer-fixed.js document.md');
        console.log('  ./prompt-based-analyzer-fixed.js document.md --prompts logical_errors,factual_claims');
        console.log('  ./prompt-based-analyzer-fixed.js document.md outputs/previous-run/');
        process.exit(0);
    }
    
    if (args[0] === '--list') {
        console.log('\nAvailable Analysis Types:');
        for (const [key, prompt] of Object.entries(ANALYSIS_PROMPTS)) {
            console.log(`\n${key}:`);
            console.log(`  Name: ${prompt.name}`);
            console.log(`  Description: ${prompt.description}`);
            console.log(`  Tools: ${prompt.tools.join(', ')}`);
        }
        process.exit(0);
    }
    
    const documentPath = args[0];
    let resumeDir = null;
    let selectedPrompts = null;
    
    // Parse arguments
    for (let i = 1; i < args.length; i++) {
        if (args[i] === '--prompts' && i + 1 < args.length) {
            selectedPrompts = args[i + 1].split(',');
            i++;
        } else if (args[i].startsWith('outputs/')) {
            resumeDir = args[i];
        }
    }
    
    const config = {};
    if (selectedPrompts) {
        config.prompts = selectedPrompts;
    }
    
    const analyzer = new PromptBasedAnalyzer(config);
    analyzer.analyze(documentPath, resumeDir).catch(error => {
        console.error('Error:', error.message);
        process.exit(1);
    });
}