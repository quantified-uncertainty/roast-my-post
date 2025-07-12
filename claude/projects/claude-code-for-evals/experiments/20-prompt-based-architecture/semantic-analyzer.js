#!/usr/bin/env node

/**
 * Semantic Document Analyzer with:
 * - Smart chunking based on document structure
 * - Investigation flagging system
 * - Background research phase
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Chunking strategies
const CHUNKING_STRATEGIES = {
    headers: {
        name: "Header-based chunking",
        description: "Split at h1/h2/h3 boundaries",
        
        chunk: function(content) {
            const lines = content.split('\n');
            const chunks = [];
            let currentChunk = [];
            let currentHeader = 'Introduction';
            let startLine = 1;
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                
                // Detect headers (markdown style)
                const h1Match = line.match(/^#\s+(.+)$/);
                const h2Match = line.match(/^##\s+(.+)$/);
                const h3Match = line.match(/^###\s+(.+)$/);
                
                if (h1Match || h2Match) {
                    // Save current chunk if it has content
                    if (currentChunk.length > 5) { // Min 5 lines
                        chunks.push({
                            id: `chunk-${chunks.length + 1}`,
                            type: 'section',
                            header: currentHeader,
                            level: h1Match ? 1 : 2,
                            content: currentChunk.join('\n'),
                            startLine,
                            endLine: i,
                            lines: currentChunk.length,
                            metadata: this.extractMetadata(currentChunk)
                        });
                    }
                    
                    // Start new chunk
                    currentHeader = (h1Match || h2Match)[1];
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
                    type: 'section',
                    header: currentHeader,
                    level: 2,
                    content: currentChunk.join('\n'),
                    startLine,
                    endLine: lines.length,
                    lines: currentChunk.length,
                    metadata: this.extractMetadata(currentChunk)
                });
            }
            
            return chunks;
        },
        
        extractMetadata: function(lines) {
            const text = lines.join(' ');
            return {
                hasNumbers: /\d+\.?\d*/.test(text),
                hasCitations: /\[\d+\]|\(\d{4}\)/.test(text),
                hasQuotes: /"[^"]+"|'[^']+'/.test(text),
                hasLists: lines.some(l => /^[\*\-\d]+\.?\s/.test(l.trim())),
                hasCode: lines.some(l => l.includes('```') || /^\s{4}/.test(l)),
                complexity: this.calculateComplexity(text)
            };
        },
        
        calculateComplexity: function(text) {
            // Simple heuristic for complexity
            const factors = {
                numbers: (text.match(/\d+\.?\d*/g) || []).length,
                longSentences: (text.match(/[^.!?]{100,}/g) || []).length,
                technicalTerms: (text.match(/\b[A-Z][a-z]+[A-Z]/g) || []).length,
                citations: (text.match(/\[\d+\]|\(\d{4}\)/g) || []).length
            };
            
            const score = factors.numbers * 2 + 
                         factors.longSentences * 3 + 
                         factors.technicalTerms * 2 + 
                         factors.citations * 2;
                         
            return score > 20 ? 'high' : score > 10 ? 'medium' : 'low';
        }
    },
    
    paragraphs: {
        name: "Paragraph-based chunking",
        description: "Group paragraphs intelligently",
        
        chunk: function(content) {
            const lines = content.split('\n');
            const chunks = [];
            let currentChunk = [];
            let currentTopic = '';
            let startLine = 1;
            let targetSize = 1000; // characters
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                
                // Detect paragraph break
                if (line.trim() === '' && currentChunk.length > 0) {
                    const chunkText = currentChunk.join('\n');
                    
                    // Check if we should start a new chunk
                    if (chunkText.length > targetSize) {
                        chunks.push({
                            id: `chunk-${chunks.length + 1}`,
                            type: 'paragraphs',
                            content: chunkText,
                            startLine,
                            endLine: i,
                            lines: currentChunk.length,
                            metadata: CHUNKING_STRATEGIES.headers.extractMetadata(currentChunk)
                        });
                        
                        currentChunk = [];
                        startLine = i + 1;
                    }
                }
                
                if (line.trim() !== '') {
                    currentChunk.push(line);
                }
            }
            
            // Last chunk
            if (currentChunk.length > 0) {
                chunks.push({
                    id: `chunk-${chunks.length + 1}`,
                    type: 'paragraphs',
                    content: currentChunk.join('\n'),
                    startLine,
                    endLine: lines.length,
                    lines: currentChunk.length,
                    metadata: CHUNKING_STRATEGIES.headers.extractMetadata(currentChunk)
                });
            }
            
            return chunks;
        }
    },
    
    hybrid: {
        name: "Hybrid smart chunking",
        description: "Combine header and content-based chunking",
        
        chunk: function(content) {
            // First chunk by headers
            const headerChunks = CHUNKING_STRATEGIES.headers.chunk(content);
            
            // Then split large sections into smaller chunks
            const finalChunks = [];
            const maxChunkSize = 3000; // characters
            
            for (const chunk of headerChunks) {
                if (chunk.content.length > maxChunkSize) {
                    // Split this chunk further
                    const subChunks = this.splitLargeChunk(chunk);
                    finalChunks.push(...subChunks);
                } else {
                    finalChunks.push(chunk);
                }
            }
            
            return finalChunks;
        },
        
        splitLargeChunk: function(chunk) {
            // Split at paragraph boundaries
            const paragraphs = chunk.content.split(/\n\s*\n/);
            const subChunks = [];
            let currentContent = [];
            let currentSize = 0;
            
            for (const para of paragraphs) {
                if (currentSize + para.length > 2000 && currentContent.length > 0) {
                    // Save current subchunk
                    subChunks.push({
                        ...chunk,
                        id: `${chunk.id}-${subChunks.length + 1}`,
                        content: currentContent.join('\n\n'),
                        subchunk: true
                    });
                    
                    currentContent = [para];
                    currentSize = para.length;
                } else {
                    currentContent.push(para);
                    currentSize += para.length;
                }
            }
            
            // Last subchunk
            if (currentContent.length > 0) {
                subChunks.push({
                    ...chunk,
                    id: `${chunk.id}-${subChunks.length + 1}`,
                    content: currentContent.join('\n\n'),
                    subchunk: true
                });
            }
            
            return subChunks;
        }
    }
};

// Analysis phases
const ANALYSIS_PHASES = {
    background_research: {
        name: "Background Research",
        description: "Gather context before analysis",
        
        prompt: `Analyze this document and identify key background information needed for proper analysis.

Document excerpt:
{excerpt}

Identify:
1. Key concepts/theories referenced that need explanation
2. Historical context that would be helpful
3. Technical terms requiring definition
4. Related work that should be understood

Format each as:
RESEARCH_NEEDED: [topic] | [why needed] | [search query]

Example:
RESEARCH_NEEDED: Keynesian multiplier | Document discusses fiscal policy impacts | "Keynesian multiplier economic theory definition"`,

        processResults: function(results) {
            const needed = [];
            const lines = results.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('RESEARCH_NEEDED:')) {
                    const parts = line.substring(16).split('|').map(s => s.trim());
                    needed.push({
                        topic: parts[0],
                        reason: parts[1],
                        query: parts[2]
                    });
                }
            }
            
            return needed;
        }
    },
    
    initial_scan: {
        name: "Initial Analysis Scan",
        description: "Quick scan to flag areas needing deep investigation",
        
        prompt: `Perform a quick scan of this section and flag any areas that need deeper investigation.

Section: {header}
Content:
{content}

For each area needing investigation:
INVESTIGATE: [line range or quote] | [concern type] | [priority: high/medium/low] | [reason]

Concern types: complex_claim, suspicious_data, needs_verification, unclear_reasoning, potential_contradiction

Also note if this section is:
SECTION_PRIORITY: [high/medium/low] | [reason]`,

        processResults: function(results) {
            const investigations = [];
            let sectionPriority = 'medium';
            const lines = results.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('INVESTIGATE:')) {
                    const parts = line.substring(12).split('|').map(s => s.trim());
                    investigations.push({
                        location: parts[0],
                        concernType: parts[1],
                        priority: parts[2],
                        reason: parts[3]
                    });
                } else if (line.startsWith('SECTION_PRIORITY:')) {
                    const parts = line.substring(17).split('|').map(s => s.trim());
                    sectionPriority = {
                        level: parts[0],
                        reason: parts[1]
                    };
                }
            }
            
            return { investigations, sectionPriority };
        }
    },
    
    deep_investigation: {
        name: "Deep Investigation", 
        description: "Thorough analysis of flagged areas",
        
        prompt: `Perform deep investigation of this flagged area.

Context: {context}
Investigation needed: {investigation}
Background info available: {background}

Perform thorough analysis including:
1. Verify any claims using available tools
2. Check logical consistency
3. Evaluate evidence quality
4. Consider alternative explanations

Format findings as:
FINDING: [severity: critical/major/minor] | [issue] | [evidence/reasoning]
VERIFICATION_NEEDED: [claim] | [suggested verification method]
ALTERNATIVE: [alternative explanation or interpretation]`,

        processResults: function(results) {
            // Parse structured findings
            const findings = [];
            const verifications = [];
            const alternatives = [];
            
            const lines = results.split('\n');
            for (const line of lines) {
                if (line.startsWith('FINDING:')) {
                    const parts = line.substring(8).split('|').map(s => s.trim());
                    findings.push({
                        severity: parts[0],
                        issue: parts[1],
                        evidence: parts[2]
                    });
                } else if (line.startsWith('VERIFICATION_NEEDED:')) {
                    const parts = line.substring(20).split('|').map(s => s.trim());
                    verifications.push({
                        claim: parts[0],
                        method: parts[1]
                    });
                } else if (line.startsWith('ALTERNATIVE:')) {
                    alternatives.push(line.substring(12).trim());
                }
            }
            
            return { findings, verifications, alternatives };
        }
    }
};

class SemanticAnalyzer {
    constructor(options = {}) {
        this.chunkingStrategy = options.chunkingStrategy || 'hybrid';
        this.maxConcurrent = options.maxConcurrent || 4;
        this.timeout = options.timeout || 300;
        this.deepInvestigationThreshold = options.deepInvestigationThreshold || 0.7; // Priority score
    }
    
    async analyze(documentPath) {
        console.log('\n🧠 Semantic Document Analysis');
        console.log('=' .repeat(50));
        
        const state = await this.initializeState(documentPath);
        
        try {
            // Phase 1: Smart chunking
            console.log('\n1️⃣  Semantic Chunking...');
            await this.chunkDocument(state);
            
            // Phase 2: Background research
            console.log('\n2️⃣  Background Research...');
            await this.gatherBackground(state);
            
            // Phase 3: Initial scan with investigation flagging
            console.log('\n3️⃣  Initial Analysis Scan...');
            await this.initialScan(state);
            
            // Phase 4: Deep investigation of flagged areas
            console.log('\n4️⃣  Deep Investigation...');
            await this.deepInvestigation(state);
            
            // Phase 5: Synthesis
            console.log('\n5️⃣  Synthesis...');
            await this.synthesize(state);
            
            // Save final state
            await this.saveState(state);
            
            console.log('\n✅ Analysis Complete!');
            console.log(`Results: ${state.outputDir}/`);
            
            return state;
            
        } catch (error) {
            console.error('\n❌ Analysis failed:', error.message);
            state.error = error.message;
            await this.saveState(state);
            throw error;
        }
    }
    
    async initializeState(documentPath) {
        const doc = await fs.readFile(documentPath, 'utf8');
        const docName = path.basename(documentPath, '.md');
        const jobId = `${docName}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
        const outputDir = `outputs/semantic-${jobId}`;
        
        await fs.mkdir(outputDir, { recursive: true });
        await fs.mkdir(`${outputDir}/chunks`, { recursive: true });
        await fs.mkdir(`${outputDir}/investigations`, { recursive: true });
        
        return {
            jobId,
            documentPath,
            documentContent: doc,
            outputDir,
            chunkingStrategy: this.chunkingStrategy,
            chunks: [],
            background: {},
            investigations: [],
            findings: [],
            createdAt: new Date().toISOString()
        };
    }
    
    async chunkDocument(state) {
        const strategy = CHUNKING_STRATEGIES[this.chunkingStrategy];
        console.log(`   Using strategy: ${strategy.name}`);
        
        state.chunks = strategy.chunk(state.documentContent);
        console.log(`   Created ${state.chunks.length} semantic chunks`);
        
        // Show chunk distribution
        const byType = {};
        const byComplexity = {};
        
        for (const chunk of state.chunks) {
            byType[chunk.type] = (byType[chunk.type] || 0) + 1;
            const complexity = chunk.metadata?.complexity || 'unknown';
            byComplexity[complexity] = (byComplexity[complexity] || 0) + 1;
            
            // Save chunk for inspection
            await fs.writeFile(
                path.join(state.outputDir, 'chunks', `${chunk.id}.json`),
                JSON.stringify(chunk, null, 2)
            );
        }
        
        console.log(`   Chunk types:`, byType);
        console.log(`   Complexity distribution:`, byComplexity);
    }
    
    async gatherBackground(state) {
        // Get document excerpt for background research
        const excerpt = state.documentContent.slice(0, 3000);
        
        const prompt = ANALYSIS_PHASES.background_research.prompt
            .replace('{excerpt}', excerpt);
        
        const response = await this.callClaude(prompt);
        const researchNeeded = ANALYSIS_PHASES.background_research.processResults(response);
        
        console.log(`   Identified ${researchNeeded.length} background topics`);
        
        // Show top research needs
        const topNeeds = researchNeeded.slice(0, 5);
        for (const need of topNeeds) {
            console.log(`   - ${need.topic}: ${need.reason}`);
        }
        
        // In a real implementation, we would:
        // 1. Actually perform these searches
        // 2. Synthesize the background info
        // 3. Use it to inform the analysis
        
        state.background = {
            researchNeeded,
            gathered: {} // Would be populated with actual research
        };
        
        // Save background research needs
        await fs.writeFile(
            path.join(state.outputDir, 'background-research.json'),
            JSON.stringify(state.background, null, 2)
        );
    }
    
    async initialScan(state) {
        const investigations = [];
        const chunkPriorities = [];
        
        console.log(`   Scanning ${state.chunks.length} chunks...`);
        
        // Process chunks with concurrency limit
        const results = await this.processInBatches(
            state.chunks,
            async (chunk) => {
                const prompt = ANALYSIS_PHASES.initial_scan.prompt
                    .replace('{header}', chunk.header || 'Section')
                    .replace('{content}', chunk.content);
                
                const response = await this.callClaude(prompt);
                return {
                    chunk,
                    ...ANALYSIS_PHASES.initial_scan.processResults(response)
                };
            },
            this.maxConcurrent
        );
        
        // Collect all investigations
        for (const result of results) {
            if (result.investigations.length > 0) {
                investigations.push({
                    chunkId: result.chunk.id,
                    chunkHeader: result.chunk.header,
                    investigations: result.investigations,
                    priority: result.sectionPriority
                });
            }
            
            chunkPriorities.push({
                chunkId: result.chunk.id,
                priority: result.sectionPriority
            });
        }
        
        state.investigations = investigations;
        state.chunkPriorities = chunkPriorities;
        
        // Show investigation summary
        const totalInvestigations = investigations.reduce(
            (sum, i) => sum + i.investigations.length, 0
        );
        console.log(`   Found ${totalInvestigations} areas needing investigation`);
        
        const byPriority = { high: 0, medium: 0, low: 0 };
        for (const inv of investigations) {
            for (const i of inv.investigations) {
                byPriority[i.priority]++;
            }
        }
        console.log(`   Priority breakdown:`, byPriority);
        
        // Save investigations
        await fs.writeFile(
            path.join(state.outputDir, 'investigations-needed.json'),
            JSON.stringify(state.investigations, null, 2)
        );
    }
    
    async deepInvestigation(state) {
        // Select high-priority investigations
        const toInvestigate = [];
        
        for (const chunkInv of state.investigations) {
            for (const inv of chunkInv.investigations) {
                if (inv.priority === 'high' || 
                    (inv.priority === 'medium' && Math.random() > 0.5)) {
                    toInvestigate.push({
                        ...inv,
                        chunkId: chunkInv.chunkId,
                        chunkHeader: chunkInv.chunkHeader
                    });
                }
            }
        }
        
        console.log(`   Performing ${toInvestigate.length} deep investigations...`);
        
        // Process deep investigations
        const deepResults = await this.processInBatches(
            toInvestigate,
            async (inv) => {
                const chunk = state.chunks.find(c => c.id === inv.chunkId);
                const context = `Section: ${inv.chunkHeader}\n${chunk.content.slice(0, 500)}...`;
                
                const prompt = ANALYSIS_PHASES.deep_investigation.prompt
                    .replace('{context}', context)
                    .replace('{investigation}', `${inv.concernType}: ${inv.reason}`)
                    .replace('{background}', JSON.stringify(state.background.gathered));
                
                const response = await this.callClaude(prompt);
                const results = ANALYSIS_PHASES.deep_investigation.processResults(response);
                
                return {
                    investigation: inv,
                    results
                };
            },
            this.maxConcurrent
        );
        
        // Collect findings
        const allFindings = [];
        for (const result of deepResults) {
            for (const finding of result.results.findings) {
                allFindings.push({
                    ...finding,
                    source: 'deep_investigation',
                    chunkId: result.investigation.chunkId,
                    investigation: result.investigation
                });
            }
            
            // Save individual investigation results
            await fs.writeFile(
                path.join(state.outputDir, 'investigations', 
                    `${result.investigation.chunkId}-${Date.now()}.json`),
                JSON.stringify(result, null, 2)
            );
        }
        
        state.findings = allFindings;
        console.log(`   Found ${allFindings.length} issues in deep investigation`);
        
        // Show severity breakdown
        const bySeverity = { critical: 0, major: 0, minor: 0 };
        for (const finding of allFindings) {
            bySeverity[finding.severity]++;
        }
        console.log(`   Severity breakdown:`, bySeverity);
    }
    
    async synthesize(state) {
        console.log('   Generating final report...');
        
        // Create comprehensive report
        const report = `# Semantic Analysis Report

**Document**: ${state.documentPath}
**Date**: ${new Date().toISOString()}
**Analysis Strategy**: ${state.chunkingStrategy}

## Overview

- **Chunks analyzed**: ${state.chunks.length}
- **Background topics identified**: ${state.background.researchNeeded.length}
- **Areas flagged for investigation**: ${state.investigations.reduce((s, i) => s + i.investigations.length, 0)}
- **Deep investigations performed**: ${state.findings.length}

## Background Research Needed

${state.background.researchNeeded.slice(0, 5).map(r => 
    `- **${r.topic}**: ${r.reason}`
).join('\n')}

## High-Priority Findings

${state.findings.filter(f => f.severity === 'critical').map(f =>
    `### ${f.issue}
- **Severity**: ${f.severity}
- **Location**: ${f.investigation.chunkHeader}
- **Evidence**: ${f.evidence}
`).join('\n')}

## Investigation Summary

${state.investigations.map(inv => `
### ${inv.chunkHeader}
${inv.investigations.map(i => 
    `- ${i.concernType} (${i.priority}): ${i.reason}`
).join('\n')}
`).join('\n')}

## Chunk Analysis

| Chunk | Type | Complexity | Investigations | Priority |
|-------|------|------------|----------------|----------|
${state.chunks.map(chunk => {
    const inv = state.investigations.find(i => i.chunkId === chunk.id);
    const priority = state.chunkPriorities.find(p => p.chunkId === chunk.id);
    return `| ${chunk.header || chunk.id} | ${chunk.type} | ${chunk.metadata?.complexity || 'N/A'} | ${inv?.investigations.length || 0} | ${priority?.priority.level || 'N/A'} |`;
}).join('\n')}

## Next Steps

1. Conduct background research on identified topics
2. Verify high-priority findings
3. Review alternative explanations for flagged issues
`;

        await fs.writeFile(
            path.join(state.outputDir, 'report.md'),
            report
        );
        
        // Create analysis dashboard
        const dashboard = {
            summary: {
                chunks: state.chunks.length,
                backgroundTopics: state.background.researchNeeded.length,
                investigationsNeeded: state.investigations.reduce((s, i) => s + i.investigations.length, 0),
                deepInvestigations: state.findings.length,
                criticalFindings: state.findings.filter(f => f.severity === 'critical').length
            },
            chunkComplexity: state.chunks.map(c => ({
                id: c.id,
                header: c.header,
                complexity: c.metadata?.complexity,
                hasNumbers: c.metadata?.hasNumbers,
                hasCitations: c.metadata?.hasCitations
            })),
            priorityAreas: state.investigations.filter(i => 
                i.priority.level === 'high'
            ).map(i => ({
                chunk: i.chunkHeader,
                reason: i.priority.reason,
                investigations: i.investigations.length
            }))
        };
        
        await fs.writeFile(
            path.join(state.outputDir, 'dashboard.json'),
            JSON.stringify(dashboard, null, 2)
        );
    }
    
    async processInBatches(items, processor, batchSize) {
        const results = [];
        const queue = [...items];
        const running = new Set();
        
        while (queue.length > 0 || running.size > 0) {
            while (running.size < batchSize && queue.length > 0) {
                const item = queue.shift();
                const promise = processor(item)
                    .then(result => {
                        running.delete(promise);
                        return result;
                    })
                    .catch(error => {
                        running.delete(promise);
                        console.error(`   Error processing:`, error.message);
                        return null;
                    });
                
                running.add(promise);
            }
            
            if (running.size > 0) {
                const result = await Promise.race(Array.from(running));
                if (result) results.push(result);
            }
        }
        
        return results;
    }
    
    async saveState(state) {
        const { documentContent, ...stateToSave } = state;
        await fs.writeFile(
            path.join(state.outputDir, 'state.json'),
            JSON.stringify(stateToSave, null, 2)
        );
    }
    
    async callClaude(prompt, timeout = 300) {
        const tempFile = `/tmp/claude-prompt-${Date.now()}.txt`;
        await fs.writeFile(tempFile, prompt);
        
        try {
            const { stdout } = await execAsync(
                `timeout ${timeout} claude -p "$(cat ${tempFile})"`,
                { maxBuffer: 10 * 1024 * 1024, shell: '/bin/bash' }
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
Semantic Document Analyzer

Usage:
  semantic-analyzer.js <document> [options]

Options:
  --strategy headers|paragraphs|hybrid  Chunking strategy (default: hybrid)
  --concurrent N                        Max concurrent analyses (default: 4)

Examples:
  ./semantic-analyzer.js document.md
  ./semantic-analyzer.js paper.md --strategy headers --concurrent 8

Features:
  - Smart semantic chunking based on document structure
  - Background research identification
  - Two-phase analysis with investigation flagging
  - Deep investigation of high-priority areas
`);
        process.exit(0);
    }
    
    const documentPath = args[0];
    const options = {
        chunkingStrategy: 'hybrid',
        maxConcurrent: 4
    };
    
    // Parse options
    for (let i = 1; i < args.length; i++) {
        if (args[i] === '--strategy' && args[i + 1]) {
            options.chunkingStrategy = args[i + 1];
            i++;
        } else if (args[i] === '--concurrent' && args[i + 1]) {
            options.maxConcurrent = parseInt(args[i + 1]);
            i++;
        }
    }
    
    const analyzer = new SemanticAnalyzer(options);
    
    analyzer.analyze(documentPath)
        .then(() => process.exit(0))
        .catch(error => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

module.exports = { SemanticAnalyzer, CHUNKING_STRATEGIES, ANALYSIS_PHASES };