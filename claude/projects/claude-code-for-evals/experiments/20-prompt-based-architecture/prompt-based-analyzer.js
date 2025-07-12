#!/usr/bin/env node

/**
 * Prompt-Based Document Analyzer
 * 
 * Key concept: Jobs are created from a library of reusable prompt templates
 * Each prompt template defines what to look for and what tools to use
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Library of reusable analysis prompts
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
    },

    argument_structure: {
        name: "Argument Structure Analysis",
        description: "Analyze the structure and strength of arguments",
        prompt: `Analyze the argument structure in this text.

Identify:
1. Main claims/thesis
2. Supporting evidence
3. Logical flow
4. Missing evidence
5. Unsupported leaps

For each issue:
ARGUMENT_ISSUE: [line] | [type: unsupported/leap/missing/weak] | [description]

For strong points:
STRONG_POINT: [line] | [what works well]

Text section (lines {startLine}-{endLine}):
{content}`,
        tools: ["check_premise", "verify_conclusion"],
        estimatedTokens: 1800
    },

    citation_verification: {
        name: "Citation and Reference Check",
        description: "Verify citations and references",
        prompt: `Check all citations and references in this text.

For each citation:
1. Extract the citation
2. Verify it exists
3. Check if it supports the claim

Format:
CITATION: [line] | [citation text] | [claim it supports]

To verify:
VERIFY_CITATION: [citation] | [search query] | [what to check]

Text section (lines {startLine}-{endLine}):
{content}`,
        tools: ["search_academic", "verify_citation", "check_doi"],
        estimatedTokens: 2200
    },

    definition_consistency: {
        name: "Definition and Terminology Consistency",
        description: "Check if terms are used consistently",
        prompt: `Check terminology and definition consistency.

Track:
1. Key terms and their definitions
2. Changes in usage
3. Undefined jargon
4. Ambiguous terms

Format:
TERM_ISSUE: [line] | [term] | [issue type] | [explanation]
UNDEFINED: [line] | [term] | [context where definition needed]

Text section (lines {startLine}-{endLine}):
{content}`,
        tools: ["track_definition", "check_consistency"],
        estimatedTokens: 1500
    },

    causal_claims: {
        name: "Causal Claim Analysis",
        description: "Analyze cause-and-effect claims",
        prompt: `Analyze all causal claims in this text.

For each causal claim:
1. Identify what is claimed to cause what
2. Evaluate the evidence
3. Check for alternative explanations
4. Rate the strength of the causal link

Format:
CAUSAL_CLAIM: [line] | [cause] → [effect] | [evidence strength: strong/moderate/weak/none] | [issues]

If verification needed:
VERIFY_CAUSAL: [claim] | [what evidence to look for]

Text section (lines {startLine}-{endLine}):
{content}`,
        tools: ["check_correlation", "find_studies", "verify_mechanism"],
        estimatedTokens: 2300
    },

    comparative_claims: {
        name: "Comparative Claim Analysis",
        description: "Analyze comparisons and relative claims",
        prompt: `Analyze all comparative claims in this text.

Look for:
- Comparisons without baselines
- Cherry-picked comparisons
- Unfair comparisons (different contexts)
- Missing context

Format:
COMPARISON: [line] | [what's compared] | [issue] | [missing context]

To verify:
VERIFY_COMPARISON: [claim] | [what data needed]

Text section (lines {startLine}-{endLine}):
{content}`,
        tools: ["find_baseline", "check_context", "verify_comparison"],
        estimatedTokens: 1800
    },

    temporal_claims: {
        name: "Temporal Claim Verification",
        description: "Verify claims about time, dates, and sequences",
        prompt: `Check all temporal claims in this text.

Verify:
- Dates and timelines
- Sequence of events
- Claims about "recent" or "historical" events
- Anachronisms

Today's date: {currentDate}

Format:
TEMPORAL_CLAIM: [line] | [claim] | [issue] | [correct information]

To verify:
VERIFY_TIME: [claim] | [search query]

Text section (lines {startLine}-{endLine}):
{content}`,
        tools: ["check_date", "verify_timeline", "historical_search"],
        estimatedTokens: 1700
    },

    quantitative_analysis: {
        name: "Quantitative Claim Analysis",
        description: "Analyze numbers, measurements, and calculations",
        prompt: `Analyze all quantitative claims in this text.

Check:
- Calculations and math
- Unit conversions
- Order of magnitude
- Reasonable ranges

Format:
QUANT_CLAIM: [line] | [numbers/calculation] | [issue] | [correct value]

If calculation needed:
CALCULATE: [expression] | [expected result]

Text section (lines {startLine}-{endLine}):
{content}`,
        tools: ["calculate", "convert_units", "check_magnitude"],
        estimatedTokens: 1900
    }
};

// Tool definitions (can be extended)
const AVAILABLE_TOOLS = {
    web_search: {
        description: "Search the web for information",
        implementation: "WebSearch"
    },
    verify_claim: {
        description: "Verify a factual claim",
        implementation: "WebSearch + analysis"
    },
    check_definition: {
        description: "Look up official definitions",
        implementation: "WebSearch + authoritative sources"
    },
    calculate: {
        description: "Perform calculations",
        implementation: "Built-in calculator"
    },
    verify_statistic: {
        description: "Verify statistical claims",
        implementation: "WebSearch + statistical databases"
    },
    search_academic: {
        description: "Search academic papers",
        implementation: "Google Scholar / PubMed search"
    },
    check_date: {
        description: "Verify dates and timelines",
        implementation: "WebSearch + historical verification"
    }
};

class PromptBasedAnalyzer {
    constructor(options = {}) {
        this.chunkSize = options.chunkSize || 2000;
        this.chunkOverlap = options.chunkOverlap || 200;
        this.maxConcurrent = options.maxConcurrent || 4;
        this.timeout = options.timeout || 300;
        this.selectedPrompts = options.prompts || Object.keys(ANALYSIS_PROMPTS);
    }

    async analyze(documentPath, resumeDir = null) {
        console.log('\n📋 Prompt-Based Document Analysis');
        console.log('=' .repeat(50));
        
        const state = await this.loadOrCreateState(documentPath, resumeDir);
        
        console.log(`Document: ${documentPath}`);
        console.log(`Job ID: ${state.jobId}`);
        console.log(`Selected prompts: ${this.selectedPrompts.length}`);
        console.log(`Output: ${state.outputDir}\n`);
        
        try {
            // Step 1: Chunk document
            if (!state.chunks) {
                console.log('1️⃣  Chunking document...');
                await this.chunkDocument(state);
                await this.saveState(state);
            }
            
            // Step 2: Create jobs from prompts
            if (!state.jobs || state.jobs.length === 0) {
                console.log('2️⃣  Creating jobs from prompt templates...');
                await this.createJobsFromPrompts(state);
                await this.saveState(state);
                
                // Show job summary
                this.showJobSummary(state);
            }
            
            // Step 3: Show current status
            this.showStatus(state);
            
            // Step 4: Run pending jobs
            console.log('\n3️⃣  Running analysis jobs...');
            await this.runPendingJobs(state);
            
            // Step 5: Process results
            if (this.allJobsComplete(state)) {
                console.log('\n4️⃣  Processing results...');
                await this.processResults(state);
            }
            
            // Final status
            console.log('\n' + '=' .repeat(50));
            this.showStatus(state);
            
            if (this.hasFailedJobs(state)) {
                console.log('\n⚠️  Some jobs failed. Run again to retry.');
                console.log(`Resume: ./prompt-based-analyzer.js "${documentPath}" "${state.outputDir}"`);
            } else {
                console.log('\n✅ Analysis complete!');
                console.log(`View results: ${state.outputDir}/dashboard.md`);
            }
            
            return state;
            
        } catch (error) {
            console.error('\n❌ Fatal error:', error.message);
            state.error = error.message;
            await this.saveState(state);
            throw error;
        }
    }
    
    async createJobsFromPrompts(state) {
        const jobs = [];
        let jobId = 0;
        
        // Calculate total jobs
        const totalJobs = state.chunks.length * this.selectedPrompts.length;
        console.log(`   Creating ${totalJobs} jobs (${state.chunks.length} chunks × ${this.selectedPrompts.length} prompts)`);
        
        // Create a job for each chunk + prompt combination
        for (const chunk of state.chunks) {
            for (const promptKey of this.selectedPrompts) {
                const promptTemplate = ANALYSIS_PROMPTS[promptKey];
                if (!promptTemplate) continue;
                
                jobs.push({
                    id: `job-${++jobId}`,
                    chunkId: chunk.id,
                    chunkLines: `${chunk.startLine}-${chunk.endLine}`,
                    promptKey: promptKey,
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
        
        // Create job templates file for reference
        await this.savePromptTemplates(state);
    }
    
    async savePromptTemplates(state) {
        const templates = {};
        for (const promptKey of this.selectedPrompts) {
            templates[promptKey] = ANALYSIS_PROMPTS[promptKey];
        }
        
        await fs.writeFile(
            path.join(state.outputDir, 'prompt-templates.json'),
            JSON.stringify(templates, null, 2)
        );
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
    
    async runSingleJob(state, job) {
        job.status = 'running';
        job.startedAt = new Date().toISOString();
        job.attempts++;
        
        try {
            // Get chunk and prompt template
            const chunk = state.chunks.find(c => c.id === job.chunkId);
            const promptTemplate = ANALYSIS_PROMPTS[job.promptKey];
            
            // Build prompt with substitutions
            const prompt = this.buildPromptFromTemplate(
                promptTemplate.prompt,
                chunk,
                state
            );
            
            // Add tool availability note if tools are specified
            const toolsNote = promptTemplate.tools.length > 0 
                ? `\n\nNote: You have access to these tools: ${promptTemplate.tools.join(', ')}. Use them as needed.`
                : '';
            
            const fullPrompt = prompt + toolsNote;
            
            // Run analysis
            const response = await this.callClaude(fullPrompt, this.timeout);
            
            // Parse results based on prompt type
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
    
    buildPromptFromTemplate(template, chunk, state) {
        const currentDate = new Date().toISOString().split('T')[0];
        
        return template
            .replace(/{content}/g, chunk.content)
            .replace(/{startLine}/g, chunk.startLine)
            .replace(/{endLine}/g, chunk.endLine)
            .replace(/{currentDate}/g, currentDate)
            .replace(/{documentType}/g, state.documentType || 'document');
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
            // Parse different types of results
            if (line.startsWith('FINDING:') || 
                line.startsWith('CLAIM:') || 
                line.startsWith('STAT_CLAIM:') ||
                line.startsWith('ARGUMENT_ISSUE:') ||
                line.startsWith('CITATION:') ||
                line.startsWith('TERM_ISSUE:') ||
                line.startsWith('CAUSAL_CLAIM:') ||
                line.startsWith('COMPARISON:') ||
                line.startsWith('TEMPORAL_CLAIM:') ||
                line.startsWith('QUANT_CLAIM:')) {
                
                const parts = line.split('|').map(s => s.trim());
                const type = line.split(':')[0];
                
                results.findings.push({
                    type: type.toLowerCase(),
                    jobId: job.id,
                    promptKey: job.promptKey,
                    chunkId: job.chunkId,
                    line: parseInt(parts[0].split(':')[1]) || 0,
                    ...this.parseFieldsForType(type, parts)
                });
            }
            
            // Parse verification requests
            if (line.startsWith('VERIFY:') || 
                line.startsWith('NEEDS_VERIFICATION:') ||
                line.startsWith('VERIFY_STAT:') ||
                line.startsWith('VERIFY_CITATION:') ||
                line.startsWith('VERIFY_CAUSAL:') ||
                line.startsWith('VERIFY_COMPARISON:') ||
                line.startsWith('VERIFY_TIME:')) {
                
                const parts = line.split('|').map(s => s.trim());
                results.verifications.push({
                    type: line.split(':')[0].toLowerCase(),
                    jobId: job.id,
                    claim: parts[0].split(':').slice(1).join(':').trim(),
                    query: parts[1] || '',
                    context: parts[2] || ''
                });
            }
            
            // Parse calculations
            if (line.startsWith('CALCULATE:')) {
                const parts = line.split('|').map(s => s.trim());
                results.calculations.push({
                    expression: parts[0].split(':')[1].trim(),
                    expected: parts[1] || ''
                });
            }
            
            // Parse strong points
            if (line.startsWith('STRONG_POINT:')) {
                const parts = line.split('|').map(s => s.trim());
                results.strong_points.push({
                    line: parseInt(parts[0].split(':')[1]) || 0,
                    description: parts[1] || ''
                });
            }
        }
        
        return results;
    }
    
    parseFieldsForType(type, parts) {
        // Custom parsing for different finding types
        switch(type) {
            case 'FINDING':
                return {
                    severity: parts[1],
                    quote: parts[2],
                    explanation: parts[3]
                };
            case 'CLAIM':
                return {
                    claim: parts[1],
                    needsVerification: parts[2] === 'yes',
                    method: parts[3]
                };
            case 'STAT_CLAIM':
                return {
                    statistic: parts[1],
                    issueType: parts[2],
                    explanation: parts[3]
                };
            case 'CAUSAL_CLAIM':
                return {
                    cause: parts[1].split('→')[0].trim(),
                    effect: parts[1].split('→')[1].trim(),
                    strength: parts[2],
                    issues: parts[3]
                };
            default:
                return {
                    details: parts.slice(1).join(' | ')
                };
        }
    }
    
    async processResults(state) {
        // Collect all results
        const allFindings = [];
        const allVerifications = [];
        
        for (const job of state.jobs.filter(j => j.status === 'completed')) {
            if (job.results) {
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
        
        // Generate reports
        await this.generateReports(state, allFindings, allVerifications);
        
        state.processedAt = new Date().toISOString();
        await this.saveState(state);
    }
    
    async generateReports(state, findings, verifications) {
        // Create dashboard
        const dashboard = `# Analysis Dashboard

**Job ID**: ${state.jobId}
**Document**: ${state.documentPath}
**Completed**: ${new Date().toISOString()}

## Overview

- **Total Chunks**: ${state.chunks.length}
- **Total Jobs**: ${state.jobs.length}
- **Prompt Types**: ${this.selectedPrompts.length}
- **Total Findings**: ${findings.length}
- **Verification Requests**: ${verifications.length}

## Findings by Prompt Type

| Prompt | Findings | Jobs |
|--------|----------|------|
${this.selectedPrompts.map(promptKey => {
    const prompt = ANALYSIS_PROMPTS[promptKey];
    const promptFindings = findings.filter(f => f.promptKey === promptKey);
    const promptJobs = state.jobs.filter(j => j.promptKey === promptKey);
    return `| ${prompt.name} | ${promptFindings.length} | ${promptJobs.length} |`;
}).join('\n')}

## Verification Requests

${verifications.length > 0 ? `
### Top verification needs:
${verifications.slice(0, 10).map(v => `- ${v.claim} (${v.type})`).join('\n')}

See \`verification-requests.json\` for full list.
` : 'No verification requests generated.'}

## Job Performance

- **Success Rate**: ${Math.round(state.jobs.filter(j => j.status === 'completed').length / state.jobs.length * 100)}%
- **Failed Jobs**: ${state.jobs.filter(j => j.status === 'failed').length}
- **Average Attempts**: ${(state.jobs.reduce((sum, j) => sum + j.attempts, 0) / state.jobs.length).toFixed(1)}

## Next Steps

1. Review findings in \`all-findings.json\`
2. Process verification requests
3. Generate final report with verified claims

## Files

- \`prompt-templates.json\` - Analysis prompts used
- \`all-findings.json\` - All findings aggregated
- \`verification-requests.json\` - Claims needing verification
- \`job-results/\` - Individual job results
- \`state.json\` - Complete state for resuming`;

        await fs.writeFile(
            path.join(state.outputDir, 'dashboard.md'),
            dashboard
        );
        
        // Create findings summary by type
        const findingsSummary = this.summarizeFindings(findings);
        await fs.writeFile(
            path.join(state.outputDir, 'findings-summary.md'),
            findingsSummary
        );
    }
    
    summarizeFindings(findings) {
        const byType = {};
        
        // Group findings by prompt type
        for (const finding of findings) {
            const promptName = ANALYSIS_PROMPTS[finding.promptKey]?.name || finding.promptKey;
            if (!byType[promptName]) {
                byType[promptName] = [];
            }
            byType[promptName].push(finding);
        }
        
        let summary = '# Findings Summary\n\n';
        
        for (const [promptName, promptFindings] of Object.entries(byType)) {
            summary += `## ${promptName}\n\n`;
            summary += `Total: ${promptFindings.length} findings\n\n`;
            
            // Show first 5 findings
            const samples = promptFindings.slice(0, 5);
            for (const finding of samples) {
                summary += `- Line ${finding.line}: ${finding.explanation || finding.details || 'See details'}\n`;
            }
            
            if (promptFindings.length > 5) {
                summary += `\n... and ${promptFindings.length - 5} more\n`;
            }
            
            summary += '\n---\n\n';
        }
        
        return summary;
    }
    
    // ... (include the base methods from resumable-analyzer.js like loadOrCreateState, saveState, etc.)
    
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
        
        // Show job breakdown by prompt
        if (stats.completed > 0) {
            console.log('\nCompleted by prompt type:');
            const completedByPrompt = {};
            for (const job of state.jobs.filter(j => j.status === 'completed')) {
                completedByPrompt[job.promptName] = (completedByPrompt[job.promptName] || 0) + 1;
            }
            for (const [prompt, count] of Object.entries(completedByPrompt)) {
                console.log(`  ${prompt}: ${count}`);
            }
        }
    }
    
    // Include utility methods from resumable-analyzer
    async loadOrCreateState(documentPath, resumeDir) {
        // ... (same as resumable-analyzer)
        if (resumeDir) {
            const statePath = path.join(resumeDir, 'state.json');
            try {
                const state = JSON.parse(await fs.readFile(statePath, 'utf8'));
                console.log(`\n♻️  Resuming job from ${resumeDir}`);
                return state;
            } catch (e) {
                // Continue to create new
            }
        }
        
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
            createdAt: new Date().toISOString()
        };
    }
    
    async saveState(state) {
        const { documentContent, ...stateToSave } = state;
        await fs.writeFile(
            path.join(state.outputDir, 'state.json'),
            JSON.stringify(stateToSave, null, 2)
        );
    }
    
    async chunkDocument(state) {
        // ... (same as resumable-analyzer)
        const doc = state.documentContent;
        const lines = doc.split('\n');
        const chunks = [];
        
        const charsPerChunk = this.chunkSize * 4;
        const overlapChars = this.chunkOverlap * 4;
        
        let currentChunk = [];
        let currentSize = 0;
        let startLine = 1;
        
        for (let i = 0; i < lines.length; i++) {
            currentChunk.push(lines[i]);
            currentSize += lines[i].length + 1;
            
            if (currentSize >= charsPerChunk && i < lines.length - 1) {
                chunks.push({
                    id: `chunk-${chunks.length + 1}`,
                    content: currentChunk.join('\n'),
                    startLine,
                    endLine: i + 1,
                    lines: currentChunk.length
                });
                
                // Overlap
                const overlapLines = [];
                let overlapSize = 0;
                for (let j = currentChunk.length - 1; j >= 0 && overlapSize < overlapChars; j--) {
                    overlapLines.unshift(currentChunk[j]);
                    overlapSize += currentChunk[j].length + 1;
                }
                
                currentChunk = overlapLines;
                currentSize = overlapSize;
                startLine = i + 2 - overlapLines.length;
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
    
    async callClaude(prompt, timeout = 300) {
        const tempFile = `/tmp/claude-prompt-${Date.now()}.txt`;
        await fs.writeFile(tempFile, prompt);
        
        try {
            const { stdout } = await execAsync(
                `cat ${tempFile} | timeout ${timeout} claude --print`,
                { maxBuffer: 10 * 1024 * 1024, shell: '/bin/bash' , timeout: (timeout + 10) * 1000 }
            );
            await fs.unlink(tempFile).catch(() => {});
            return stdout;
        } catch (error) {
            await fs.unlink(tempFile).catch(() => {});
            throw error;
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
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args[0] === '--help') {
        console.log(`
Prompt-Based Document Analyzer

Usage:
  prompt-based-analyzer.js <document> [resume-dir] [options]

Options:
  --prompts logical_errors,factual_claims,statistical_analysis
            Comma-separated list of prompt types to use
            
  --list    List all available prompt types

Available prompts:
${Object.entries(ANALYSIS_PROMPTS).map(([key, prompt]) => 
    `  ${key.padEnd(25)} ${prompt.description}`
).join('\n')}

Examples:
  # Analyze with all prompts
  ./prompt-based-analyzer.js document.md
  
  # Analyze with specific prompts
  ./prompt-based-analyzer.js document.md --prompts logical_errors,factual_claims
  
  # Resume previous analysis
  ./prompt-based-analyzer.js document.md outputs/document-123/
`);
        process.exit(0);
    }
    
    if (args[0] === '--list') {
        console.log('Available analysis prompts:\n');
        for (const [key, prompt] of Object.entries(ANALYSIS_PROMPTS)) {
            console.log(`${key}:`);
            console.log(`  Name: ${prompt.name}`);
            console.log(`  Description: ${prompt.description}`);
            console.log(`  Tools: ${prompt.tools.join(', ')}`);
            console.log(`  Estimated tokens: ${prompt.estimatedTokens}`);
            console.log('');
        }
        process.exit(0);
    }
    
    // Parse arguments
    const documentPath = args[0];
    let resumeDir = null;
    let selectedPrompts = Object.keys(ANALYSIS_PROMPTS);
    
    for (let i = 1; i < args.length; i++) {
        if (args[i] === '--prompts' && args[i + 1]) {
            selectedPrompts = args[i + 1].split(',').map(s => s.trim());
            i++;
        } else if (!args[i].startsWith('--')) {
            resumeDir = args[i];
        }
    }
    
    const analyzer = new PromptBasedAnalyzer({
        prompts: selectedPrompts,
        maxConcurrent: parseInt(process.env.MAX_CONCURRENT) || 4,
        chunkSize: parseInt(process.env.CHUNK_SIZE) || 2000,
        timeout: parseInt(process.env.TIMEOUT) || 300
    });
    
    analyzer.analyze(documentPath, resumeDir)
        .then(state => {
            process.exit(analyzer.hasFailedJobs(state) ? 1 : 0);
        })
        .catch(error => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

module.exports = { PromptBasedAnalyzer, ANALYSIS_PROMPTS, AVAILABLE_TOOLS };