#!/usr/bin/env node

/**
 * Resumable Document Analyzer
 * 
 * Key features:
 * - Breaks documents into manageable chunks
 * - Tracks job status (pending/running/completed/failed)
 * - Can resume from where it left off
 * - Handles documents of any length
 * - Clear visibility into what needs retry
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class ResumableAnalyzer {
    constructor(options = {}) {
        this.chunkSize = options.chunkSize || 2000; // tokens (~8000 chars)
        this.chunkOverlap = options.chunkOverlap || 200; // tokens overlap
        this.maxConcurrent = options.maxConcurrent || 4;
        this.timeout = options.timeout || 300; // seconds per chunk
    }

    async analyze(documentPath, resumeDir = null) {
        console.log('\n📄 Resumable Document Analysis');
        console.log('=' .repeat(50));
        
        // Load or create job state
        const state = await this.loadOrCreateState(documentPath, resumeDir);
        
        console.log(`Document: ${documentPath}`);
        console.log(`Job ID: ${state.jobId}`);
        console.log(`Output: ${state.outputDir}`);
        
        // Show current status
        this.showStatus(state);
        
        try {
            // Step 1: Chunk document if needed
            if (!state.chunks) {
                console.log('\n1️⃣  Chunking document...');
                await this.chunkDocument(state);
                await this.saveState(state);
            }
            
            // Step 2: Classify document (if not done)
            if (!state.classification) {
                console.log('\n2️⃣  Classifying document...');
                await this.classifyDocument(state);
                await this.saveState(state);
            }
            
            // Step 3: Create analysis jobs (if not done)
            if (!state.jobs || state.jobs.length === 0) {
                console.log('\n3️⃣  Creating analysis jobs...');
                await this.createJobs(state);
                await this.saveState(state);
            }
            
            // Step 4: Run pending jobs
            console.log('\n4️⃣  Running analysis jobs...');
            await this.runPendingJobs(state);
            
            // Step 5: Synthesize results (if all jobs complete)
            if (this.allJobsComplete(state)) {
                console.log('\n5️⃣  Synthesizing results...');
                await this.synthesizeResults(state);
            }
            
            // Final status
            console.log('\n' + '=' .repeat(50));
            this.showStatus(state);
            
            if (this.hasFailedJobs(state)) {
                console.log('\n⚠️  Some jobs failed. Run again to retry failed jobs.');
                console.log(`Resume command: ./resumable-analyzer.js "${documentPath}" "${state.outputDir}"`);
            }
            
            return state;
            
        } catch (error) {
            console.error('\n❌ Fatal error:', error.message);
            state.error = error.message;
            await this.saveState(state);
            throw error;
        }
    }
    
    async loadOrCreateState(documentPath, resumeDir) {
        if (resumeDir) {
            // Resume existing job
            const statePath = path.join(resumeDir, 'state.json');
            if (await this.fileExists(statePath)) {
                console.log(`\n♻️  Resuming job from ${resumeDir}`);
                const state = JSON.parse(await fs.readFile(statePath, 'utf8'));
                state.resumed = true;
                state.resumeCount = (state.resumeCount || 0) + 1;
                return state;
            }
        }
        
        // Create new job
        const doc = await fs.readFile(documentPath, 'utf8');
        const docName = path.basename(documentPath, '.md');
        const jobId = `${docName}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
        const outputDir = `outputs/${jobId}`;
        
        await fs.mkdir(outputDir, { recursive: true });
        
        return {
            jobId,
            documentPath,
            outputDir,
            documentContent: doc,
            createdAt: new Date().toISOString(),
            chunks: null,
            classification: null,
            jobs: [],
            results: []
        };
    }
    
    async saveState(state) {
        const statePath = path.join(state.outputDir, 'state.json');
        
        // Don't save document content in state file (too large)
        const { documentContent, ...stateToSave } = state;
        
        await fs.writeFile(
            statePath,
            JSON.stringify(stateToSave, null, 2)
        );
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
        
        console.log('\n📊 Job Status:');
        console.log(`Total Jobs: ${stats.total}`);
        console.log(`✅ Completed: ${stats.completed} (${Math.round(stats.completed/stats.total*100)}%)`);
        console.log(`⏳ Pending: ${stats.pending}`);
        console.log(`🔄 Running: ${stats.running}`);
        console.log(`❌ Failed: ${stats.failed}`);
        
        // Show failed jobs
        if (stats.failed > 0) {
            console.log('\nFailed Jobs:');
            state.jobs
                .filter(j => j.status === 'failed')
                .forEach(job => {
                    console.log(`- ${job.id}: ${job.error || 'Unknown error'}`);
                });
        }
    }
    
    async chunkDocument(state) {
        const doc = state.documentContent;
        const lines = doc.split('\n');
        const chunks = [];
        
        // Estimate ~4 chars per token
        const charsPerChunk = this.chunkSize * 4;
        const overlapChars = this.chunkOverlap * 4;
        
        let currentChunk = [];
        let currentSize = 0;
        let startLine = 1;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            currentChunk.push(line);
            currentSize += line.length + 1; // +1 for newline
            
            if (currentSize >= charsPerChunk && i < lines.length - 1) {
                // Save chunk
                chunks.push({
                    id: `chunk-${chunks.length + 1}`,
                    content: currentChunk.join('\n'),
                    startLine,
                    endLine: i + 1,
                    lines: currentChunk.length
                });
                
                // Start new chunk with overlap
                const overlapLines = [];
                let overlapSize = 0;
                
                // Go back to include overlap
                for (let j = currentChunk.length - 1; j >= 0 && overlapSize < overlapChars; j--) {
                    overlapLines.unshift(currentChunk[j]);
                    overlapSize += currentChunk[j].length + 1;
                }
                
                currentChunk = overlapLines;
                currentSize = overlapSize;
                startLine = i + 2 - overlapLines.length;
            }
        }
        
        // Save final chunk
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
        console.log(`   Created ${chunks.length} chunks (${this.chunkSize} tokens each with ${this.chunkOverlap} token overlap)`);
        
        // Save chunks for inspection
        await fs.mkdir(path.join(state.outputDir, 'chunks'), { recursive: true });
        for (const chunk of chunks) {
            await fs.writeFile(
                path.join(state.outputDir, 'chunks', `${chunk.id}.txt`),
                `Lines ${chunk.startLine}-${chunk.endLine}:\n\n${chunk.content}`
            );
        }
    }
    
    async classifyDocument(state) {
        // Use first chunk for classification
        const firstChunk = state.chunks[0].content.slice(0, 2000);
        
        const prompt = `Classify this document and recommend analysis types.

Document excerpt:
${firstChunk}...

Return JSON:
{
  "type": "technical|research|policy|opinion",
  "analysisTypes": ["factual_accuracy", "logical_consistency", "statistical_validity"],
  "complexity": "high|medium|low",
  "requiresWebSearch": true|false
}`;

        const response = await this.callClaude(prompt);
        state.classification = this.extractJSON(response);
        console.log(`   Type: ${state.classification.type}`);
        console.log(`   Analysis types: ${state.classification.analysisTypes.join(', ')}`);
    }
    
    async createJobs(state) {
        const jobs = [];
        let jobId = 0;
        
        // Create a job for each chunk + analysis type combination
        for (const chunk of state.chunks) {
            for (const analysisType of state.classification.analysisTypes) {
                jobs.push({
                    id: `job-${++jobId}`,
                    chunkId: chunk.id,
                    chunkLines: `${chunk.startLine}-${chunk.endLine}`,
                    analysisType,
                    status: 'pending',
                    attempts: 0,
                    createdAt: new Date().toISOString()
                });
            }
        }
        
        state.jobs = jobs;
        console.log(`   Created ${jobs.length} jobs (${state.chunks.length} chunks × ${state.classification.analysisTypes.length} analysis types)`);
    }
    
    async runPendingJobs(state) {
        const pendingJobs = state.jobs.filter(j => j.status === 'pending' || j.status === 'failed');
        
        if (pendingJobs.length === 0) {
            console.log('   No pending jobs to run');
            return;
        }
        
        console.log(`   Running ${pendingJobs.length} pending jobs...`);
        
        // Process jobs with concurrency limit
        const running = new Set();
        const results = [];
        
        for (const job of pendingJobs) {
            // Wait if at max concurrency
            while (running.size >= this.maxConcurrent) {
                await Promise.race(Array.from(running));
            }
            
            // Start job
            const promise = this.runSingleJob(state, job)
                .then(result => {
                    running.delete(promise);
                    results.push(result);
                    
                    // Show progress
                    const completed = state.jobs.filter(j => j.status === 'completed').length;
                    const total = state.jobs.length;
                    console.log(`   Progress: ${completed}/${total} (${Math.round(completed/total*100)}%)`);
                })
                .catch(error => {
                    running.delete(promise);
                    console.error(`   Job ${job.id} failed: ${error.message}`);
                });
            
            running.add(promise);
        }
        
        // Wait for remaining jobs
        await Promise.all(Array.from(running));
        
        // Save state after each batch
        await this.saveState(state);
    }
    
    async runSingleJob(state, job) {
        job.status = 'running';
        job.startedAt = new Date().toISOString();
        job.attempts++;
        
        try {
            // Get chunk content
            const chunk = state.chunks.find(c => c.id === job.chunkId);
            
            // Build analysis prompt
            const prompt = this.buildAnalysisPrompt(
                job.analysisType,
                chunk.content,
                chunk.startLine,
                state.classification.requiresWebSearch
            );
            
            // Run analysis
            const response = await this.callClaude(prompt, this.timeout);
            
            // Parse findings
            const findings = this.parseFindings(response, job);
            
            // Save job result
            job.status = 'completed';
            job.completedAt = new Date().toISOString();
            job.findingsCount = findings.length;
            job.findings = findings;
            
            // Save findings to file
            await fs.mkdir(path.join(state.outputDir, 'findings'), { recursive: true });
            await fs.writeFile(
                path.join(state.outputDir, 'findings', `${job.id}.json`),
                JSON.stringify({ job, findings }, null, 2)
            );
            
            return findings;
            
        } catch (error) {
            job.status = 'failed';
            job.error = error.message;
            job.failedAt = new Date().toISOString();
            throw error;
        }
    }
    
    buildAnalysisPrompt(analysisType, chunkContent, startLine, useWebSearch) {
        const currentDate = new Date().toISOString().split('T')[0];
        
        const basePrompt = `Analyze this document chunk for ${analysisType} issues.
Context: Today is ${currentDate} (year 2025). Line numbers start at ${startLine}.

Return findings in this EXACT format (one per line):
FINDING: [absolute line number] | [severity: critical/major/minor] | [exact quote from document] | [clear explanation of the issue]${useWebSearch ? ' | [source URL if applicable]' : ''}

${analysisType === 'factual_accuracy' && useWebSearch ? 'USE WebSearch to verify factual claims. Include source URLs.' : ''}

Document chunk:
${chunkContent}`;

        return basePrompt;
    }
    
    parseFindings(response, job) {
        const findings = [];
        const lines = response.split('\n');
        
        for (const line of lines) {
            if (line.startsWith('FINDING:')) {
                const parts = line.substring(8).split('|').map(s => s.trim());
                if (parts.length >= 4) {
                    findings.push({
                        jobId: job.id,
                        chunkId: job.chunkId,
                        analysisType: job.analysisType,
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
    
    async synthesizeResults(state) {
        // Collect all findings
        const allFindings = [];
        for (const job of state.jobs.filter(j => j.status === 'completed')) {
            allFindings.push(...(job.findings || []));
        }
        
        // Remove duplicates (from overlapping chunks)
        const uniqueFindings = this.deduplicateFindings(allFindings);
        
        console.log(`   Total findings: ${uniqueFindings.length} (${allFindings.length} before deduplication)`);
        
        // Save all findings
        await fs.writeFile(
            path.join(state.outputDir, 'all-findings.json'),
            JSON.stringify(uniqueFindings, null, 2)
        );
        
        // Generate report
        const report = await this.generateReport(state, uniqueFindings);
        await fs.writeFile(
            path.join(state.outputDir, 'report.md'),
            report
        );
        
        // Create summary dashboard
        await this.createDashboard(state, uniqueFindings);
        
        state.synthesizedAt = new Date().toISOString();
        state.totalFindings = uniqueFindings.length;
        await this.saveState(state);
    }
    
    deduplicateFindings(findings) {
        const seen = new Set();
        const unique = [];
        
        for (const finding of findings) {
            // Create a key based on line number and issue
            const key = `${finding.line}-${finding.issue.substring(0, 50)}`;
            
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(finding);
            }
        }
        
        return unique.sort((a, b) => a.line - b.line);
    }
    
    async generateReport(state, findings) {
        const findingsSummary = findings.slice(0, 20).map(f => 
            `- Line ${f.line} (${f.severity}): ${f.issue}${f.source ? ' [' + f.source + ']' : ''}`
        ).join('\n');
        
        const prompt = `Generate a comprehensive analysis report.

Document type: ${state.classification.type}
Total findings: ${findings.length}
Analysis types: ${state.classification.analysisTypes.join(', ')}

Findings by severity:
- Critical: ${findings.filter(f => f.severity === 'critical').length}
- Major: ${findings.filter(f => f.severity === 'major').length}
- Minor: ${findings.filter(f => f.severity === 'minor').length}

Sample findings:
${findingsSummary}
${findings.length > 20 ? `\n... and ${findings.length - 20} more findings` : ''}

Create a report with:
1. Executive Summary
2. Critical Issues (with sources)
3. Major Issues by Category
4. Recommendations
5. Technical Summary

Include source URLs where provided. Be specific and actionable.`;

        return await this.callClaude(prompt, 600); // 10 min timeout for synthesis
    }
    
    async createDashboard(state, findings) {
        const dashboard = `# Analysis Dashboard

**Job ID**: ${state.jobId}
**Document**: ${state.documentPath}
**Completed**: ${state.synthesizedAt}

## Overview

- **Total Chunks**: ${state.chunks.length}
- **Total Jobs**: ${state.jobs.length}
- **Successful Jobs**: ${state.jobs.filter(j => j.status === 'completed').length}
- **Failed Jobs**: ${state.jobs.filter(j => j.status === 'failed').length}
- **Total Findings**: ${findings.length}

## Findings by Severity

| Severity | Count | Percentage |
|----------|-------|------------|
| Critical | ${findings.filter(f => f.severity === 'critical').length} | ${Math.round(findings.filter(f => f.severity === 'critical').length / findings.length * 100)}% |
| Major | ${findings.filter(f => f.severity === 'major').length} | ${Math.round(findings.filter(f => f.severity === 'major').length / findings.length * 100)}% |
| Minor | ${findings.filter(f => f.severity === 'minor').length} | ${Math.round(findings.filter(f => f.severity === 'minor').length / findings.length * 100)}% |

## Findings by Analysis Type

| Type | Count |
|------|-------|
${state.classification.analysisTypes.map(type => 
    `| ${type} | ${findings.filter(f => f.analysisType === type).length} |`
).join('\n')}

## Job Performance

- **Average attempts per job**: ${(state.jobs.reduce((sum, j) => sum + j.attempts, 0) / state.jobs.length).toFixed(1)}
- **Success rate**: ${Math.round(state.jobs.filter(j => j.status === 'completed').length / state.jobs.length * 100)}%
- **Resume count**: ${state.resumeCount || 0}

## Files

- \`report.md\` - Final analysis report
- \`all-findings.json\` - All unique findings
- \`state.json\` - Job state (for resuming)
- \`chunks/\` - Document chunks
- \`findings/\` - Individual job results`;

        await fs.writeFile(
            path.join(state.outputDir, 'dashboard.md'),
            dashboard
        );
    }
    
    // Utility methods
    
    async callClaude(prompt, timeout = 300) {
        const tempFile = `/tmp/claude-prompt-${Date.now()}.txt`;
        await fs.writeFile(tempFile, prompt);
        
        try {
            const { stdout, stderr } = await execAsync(
                `cat ${tempFile} | timeout ${timeout} claude --print`,
                { 
                    maxBuffer: 10 * 1024 * 1024,
                    shell: '/bin/bash'
                }
            );
            
            await fs.unlink(tempFile).catch(() => {});
            
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
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[0]);
            } catch (e) {
                // Continue to fallback
            }
        }
        
        // Fallback
        return {
            type: 'general',
            analysisTypes: ['logical_consistency', 'factual_accuracy'],
            complexity: 'medium',
            requiresWebSearch: true
        };
    }
    
    async fileExists(path) {
        try {
            await fs.access(path);
            return true;
        } catch {
            return false;
        }
    }
    
    allJobsComplete(state) {
        return state.jobs.every(j => j.status === 'completed' || j.status === 'failed');
    }
    
    hasFailedJobs(state) {
        return state.jobs.some(j => j.status === 'failed');
    }
}

// CLI
if (require.main === module) {
    const [documentPath, resumeDir] = process.argv.slice(2);
    
    if (!documentPath) {
        console.error('Usage: resumable-analyzer.js <document-path> [resume-dir]');
        console.error('\nExamples:');
        console.error('  New analysis:     ./resumable-analyzer.js document.md');
        console.error('  Resume analysis:  ./resumable-analyzer.js document.md outputs/document-12345-abc/');
        process.exit(1);
    }
    
    const analyzer = new ResumableAnalyzer({
        chunkSize: parseInt(process.env.CHUNK_SIZE) || 2000,
        chunkOverlap: parseInt(process.env.CHUNK_OVERLAP) || 200,
        maxConcurrent: parseInt(process.env.MAX_CONCURRENT) || 4,
        timeout: parseInt(process.env.TIMEOUT) || 300
    });
    
    analyzer.analyze(documentPath, resumeDir)
        .then(state => {
            if (analyzer.hasFailedJobs(state)) {
                process.exit(1); // Exit with error if jobs failed
            }
            process.exit(0);
        })
        .catch(error => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

module.exports = ResumableAnalyzer;