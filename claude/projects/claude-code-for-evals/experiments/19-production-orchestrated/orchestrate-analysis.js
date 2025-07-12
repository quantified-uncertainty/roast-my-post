#!/usr/bin/env node

/**
 * Main orchestration script for parallel Claude Code analysis
 * Replaces orchestrate-analysis.sh with better error handling
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Configuration
const CONFIG = {
    maxParallel: parseInt(process.env.MAX_PARALLEL || '6'),
    timeoutPerTask: parseInt(process.env.TIMEOUT_PER_TASK || '600'), // seconds
    timeoutSynthesis: parseInt(process.env.TIMEOUT_SYNTHESIS || '900'), // seconds
};

// Helper to run shell commands
async function runCommand(cmd, options = {}) {
    try {
        const { stdout, stderr } = await execAsync(cmd, {
            maxBuffer: 10 * 1024 * 1024, // 10MB buffer
            ...options
        });
        return { stdout, stderr, success: true };
    } catch (error) {
        return { 
            stdout: error.stdout || '', 
            stderr: error.stderr || error.message, 
            success: false,
            error 
        };
    }
}

// Create output directory
function setupOutputDir(documentName) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const outputDir = `outputs/${documentName}-${timestamp}`;
    
    // Create all necessary directories
    const dirs = [
        outputDir,
        `${outputDir}/tasks`,
        `${outputDir}/synthesis`,
        `${outputDir}/prompts`
    ];
    
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
    
    return outputDir;
}

// Run a single analysis task
async function runTask(task, outputDir) {
    const promptFile = `${outputDir}/prompts/${task.id}.txt`;
    const outputFile = `${outputDir}/tasks/${task.id}.json`;
    const rawOutputFile = `${outputFile}.raw`;
    
    console.log(`   Starting task ${task.id} (${task.type})...`);
    
    // Run Claude with timeout
    const startTime = Date.now();
    const result = await runCommand(
        `timeout ${CONFIG.timeoutPerTask} claude -p "$(cat "${promptFile}")"`,
        { shell: '/bin/bash' }
    );
    
    // Save raw output
    fs.writeFileSync(rawOutputFile, result.stdout + '\n\nSTDERR:\n' + result.stderr);
    
    if (result.success) {
        // Parse structured output
        const parseResult = await runCommand(
            `node lib/parse-task-output.js "${rawOutputFile}" "${task.type}"`
        );
        
        if (parseResult.success) {
            fs.writeFileSync(outputFile, parseResult.stdout);
            
            // Track usage
            await runCommand(
                `node lib/track-usage.js track "${outputFile}" "${rawOutputFile}"`
            );
            
            const duration = Math.round((Date.now() - startTime) / 1000);
            console.log(`   ✅ Task ${task.id} complete (${duration}s)`);
            return { task, success: true, duration };
        }
    }
    
    // Handle failure
    const errorData = {
        error: "Task failed or timed out",
        task: task,
        stderr: result.stderr
    };
    fs.writeFileSync(outputFile, JSON.stringify(errorData, null, 2));
    
    console.log(`   ❌ Task ${task.id} failed`);
    return { task, success: false };
}

// Run tasks in parallel with concurrency limit
async function runTasksParallel(tasks, outputDir) {
    const results = [];
    const queue = [...tasks];
    const running = [];
    
    while (queue.length > 0 || running.length > 0) {
        // Start new tasks up to max parallel
        while (running.length < CONFIG.maxParallel && queue.length > 0) {
            const task = queue.shift();
            const promise = runTask(task, outputDir).then(result => {
                // Remove from running
                const index = running.indexOf(promise);
                if (index > -1) running.splice(index, 1);
                return result;
            });
            running.push(promise);
        }
        
        // Wait for at least one to complete
        if (running.length > 0) {
            const result = await Promise.race(running);
            results.push(result);
        }
    }
    
    return results;
}

// Main orchestration
async function orchestrate(documentPath) {
    console.log('🎭 ORCHESTRATED PARALLEL ANALYSIS');
    console.log('================================');
    console.log(`Document: ${documentPath}`);
    console.log('');
    
    // Check document exists
    if (!fs.existsSync(documentPath)) {
        console.error(`❌ Error: Document not found: ${documentPath}`);
        process.exit(1);
    }
    
    const docName = path.basename(documentPath, '.md');
    const outputDir = setupOutputDir(docName);
    
    try {
        // Phase 1: Analyze document
        console.log('📊 Phase 1: Analyzing document characteristics with LLM...');
        const analyzeResult = await runCommand(
            `node lib/analyze-document.js "${documentPath}"`
        );
        
        if (!analyzeResult.success) {
            throw new Error('Document analysis failed: ' + analyzeResult.stderr);
        }
        
        const metadata = JSON.parse(analyzeResult.stdout);
        fs.writeFileSync(`${outputDir}/document-metadata.json`, JSON.stringify(metadata, null, 2));
        
        console.log(`   Document type: ${metadata.type}`);
        console.log(`   Flaw density: ${metadata.flawDensity}`);
        console.log(`   Analysis depth: ${metadata.analysisDepth}`);
        console.log('');
        
        // Phase 2: Generate tasks
        console.log('📋 Phase 2: Generating task list...');
        const tasksResult = await runCommand(
            `node lib/generate-tasks.js "${outputDir}/document-metadata.json"`
        );
        
        if (!tasksResult.success) {
            throw new Error('Task generation failed: ' + tasksResult.stderr);
        }
        
        const tasks = JSON.parse(tasksResult.stdout);
        fs.writeFileSync(`${outputDir}/task-list.json`, JSON.stringify(tasks, null, 2));
        console.log(`   Generated ${tasks.length} analysis tasks`);
        console.log('');
        
        // Phase 3: Create prompts
        console.log('✍️  Phase 3: Creating task prompts...');
        const promptsResult = await runCommand(
            `node lib/create-prompts.js "${documentPath}" "${outputDir}/task-list.json" "${outputDir}/prompts"`
        );
        
        if (!promptsResult.success) {
            throw new Error('Prompt creation failed: ' + promptsResult.stderr);
        }
        console.log(`   Created ${tasks.length} prompts`);
        console.log('');
        
        // Phase 4: Run parallel analysis
        console.log(`🚀 Phase 4: Running parallel analysis (max ${CONFIG.maxParallel} concurrent)...`);
        const startTime = Date.now();
        const results = await runTasksParallel(tasks, outputDir);
        const duration = Math.round((Date.now() - startTime) / 1000);
        
        const successful = results.filter(r => r.success).length;
        console.log('');
        console.log(`✅ Phase 4 complete: ${successful}/${tasks.length} tasks succeeded (${duration}s)`);
        console.log('');
        
        // Phase 5: Collect findings
        console.log('📦 Phase 5: Collecting and validating findings...');
        const collectResult = await runCommand(
            `node lib/collect-findings.js "${outputDir}/tasks"`
        );
        
        if (collectResult.success) {
            fs.writeFileSync(`${outputDir}/all-findings-raw.json`, collectResult.stdout);
            
            // Validate findings
            const validateResult = await runCommand(
                `node lib/validate-findings.js "${outputDir}/all-findings-raw.json"`
            );
            
            if (validateResult.success) {
                fs.writeFileSync(`${outputDir}/all-findings.json`, validateResult.stdout);
                const findings = JSON.parse(validateResult.stdout);
                console.log(`   Collected ${findings.length} valid findings`);
                
                // Show severity breakdown
                const bySeverity = {
                    critical: findings.filter(f => f.severity === 'critical').length,
                    major: findings.filter(f => f.severity === 'major').length,
                    minor: findings.filter(f => f.severity === 'minor').length
                };
                console.log(`   By severity: ${bySeverity.critical} critical, ${bySeverity.major} major, ${bySeverity.minor} minor`);
            }
        }
        console.log('');
        
        // Phase 6: Pattern analysis
        console.log('🔍 Phase 6: Analyzing patterns...');
        const patternsResult = await runCommand(
            `node lib/analyze-patterns.js "${outputDir}/all-findings.json"`
        );
        
        if (patternsResult.success) {
            fs.writeFileSync(`${outputDir}/synthesis/patterns.json`, patternsResult.stdout);
            const patterns = JSON.parse(patternsResult.stdout);
            console.log(`   Identified ${patterns.patterns?.length || 0} recurring patterns`);
        }
        console.log('');
        
        // Phase 7: Synthesis
        console.log('📝 Phase 7: Preparing synthesis...');
        const synthPromptResult = await runCommand(
            `node lib/create-synthesis-prompt.js "${documentPath}" "${outputDir}/all-findings.json" "${outputDir}/synthesis/patterns.json"`
        );
        
        if (synthPromptResult.success) {
            fs.writeFileSync(`${outputDir}/synthesis/synthesis-prompt.txt`, synthPromptResult.stdout);
            console.log('   Synthesis prompt created');
        }
        console.log('');
        
        // Phase 8: Final synthesis
        console.log('🎯 Phase 8: Running final synthesis...');
        let synthesisSuccess = false;
        let timeout = CONFIG.timeoutSynthesis;
        
        for (let attempt = 1; attempt <= 3; attempt++) {
            console.log(`   Synthesis attempt ${attempt}/3...`);
            
            const promptFile = attempt === 1 
                ? `${outputDir}/synthesis/synthesis-prompt.txt`
                : `${outputDir}/synthesis/short-synthesis-prompt.txt`;
            
            // Create short prompt for retries
            if (attempt > 1 && !fs.existsSync(promptFile)) {
                const shortResult = await runCommand(
                    `node lib/create-short-synthesis-prompt.js "${documentPath}" "${outputDir}/all-findings.json" "${outputDir}/synthesis/patterns.json"`
                );
                if (shortResult.success) {
                    fs.writeFileSync(promptFile, shortResult.stdout);
                }
            }
            
            const synthResult = await runCommand(
                `timeout ${timeout} claude -p "$(cat "${promptFile}")"`,
                { shell: '/bin/bash' }
            );
            
            if (synthResult.success && synthResult.stdout.trim()) {
                fs.writeFileSync(`${outputDir}/final-report.md`, synthResult.stdout);
                synthesisSuccess = true;
                console.log('   ✅ Final report generated successfully');
                break;
            }
            
            console.log('   ⚠️  Synthesis failed, retrying...');
            timeout += 300; // Add 5 minutes each retry
        }
        
        if (!synthesisSuccess) {
            console.log('   ❌ Synthesis failed after 3 attempts');
            // Create fallback report
            const findings = JSON.parse(fs.readFileSync(`${outputDir}/all-findings.json`, 'utf8'));
            const fallbackReport = `# Analysis Report: ${docName}

## Status
**Note**: Full synthesis timed out. This is a summary based on validated findings.

## Summary
Total Issues Found: ${findings.length}

## Top Issues
${findings.slice(0, 5).map(f => `- Line ${f.line}: ${f.issue} (${f.severity})`).join('\n')}

For complete analysis, see all-findings.json`;
            
            fs.writeFileSync(`${outputDir}/final-report.md`, fallbackReport);
        }
        console.log('');
        
        // Phase 9: Summary
        console.log('📊 Phase 9: Creating summary...');
        const summaryResult = await runCommand(
            `node lib/generate-summary.js "${outputDir}/all-findings.json" "${outputDir}/synthesis/patterns.json"`
        );
        
        if (summaryResult.success) {
            fs.writeFileSync(`${outputDir}/executive-summary.json`, summaryResult.stdout);
        }
        
        // Generate cost report
        console.log('');
        console.log('💰 Generating cost report...');
        const costResult = await runCommand(
            `node lib/track-usage.js report "${outputDir}"`
        );
        
        console.log('');
        console.log('✨ ANALYSIS COMPLETE!');
        console.log('====================');
        console.log('Outputs:');
        console.log(`  - Full report: ${outputDir}/final-report.md`);
        console.log(`  - All findings: ${outputDir}/all-findings.json`);
        console.log(`  - Executive summary: ${outputDir}/executive-summary.json`);
        console.log(`  - Cost summary: ${outputDir}/cost-summary.txt`);
        
    } catch (error) {
        console.error('');
        console.error('❌ Orchestration failed:', error.message);
        process.exit(1);
    }
}

// CLI entry point
if (require.main === module) {
    const documentPath = process.argv[2];
    
    if (!documentPath) {
        console.error('Usage: orchestrate-analysis.js <document-path>');
        process.exit(1);
    }
    
    orchestrate(documentPath).catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { orchestrate };