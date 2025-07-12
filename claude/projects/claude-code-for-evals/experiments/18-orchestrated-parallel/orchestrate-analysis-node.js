#!/usr/bin/env node

/**
 * Production-ready orchestrated analysis system
 * Uses Node.js worker pool instead of GNU Parallel
 */

const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Configuration
const CONFIG = {
    maxConcurrent: parseInt(process.env.MAX_CONCURRENT_TASKS || '4'),
    taskTimeout: parseInt(process.env.TASK_TIMEOUT_SECONDS || '300') * 1000,
    outputBase: path.join(__dirname, 'outputs'),
    scriptDir: __dirname
};

// Worker pool for managing concurrent tasks
class WorkerPool {
    constructor(maxWorkers) {
        this.maxWorkers = maxWorkers;
        this.activeWorkers = new Map();
        this.queue = [];
        this.results = [];
        this.errors = [];
    }

    async run(tasks) {
        // Add all tasks to queue
        tasks.forEach((task, index) => {
            this.queue.push({ ...task, index });
        });

        // Start processing
        const promises = [];
        for (let i = 0; i < Math.min(this.maxWorkers, this.queue.length); i++) {
            promises.push(this._processNext());
        }

        // Wait for all to complete
        await Promise.all(promises);

        return {
            completed: this.results.length,
            failed: this.errors.length,
            results: this.results,
            errors: this.errors
        };
    }

    async _processNext() {
        while (this.queue.length > 0) {
            const task = this.queue.shift();
            try {
                console.log(`   [${task.index + 1}/${task.totalTasks}] Starting: ${task.type}`);
                const result = await this._runTask(task);
                this.results.push(result);
                console.log(`   [${task.index + 1}/${task.totalTasks}] ✅ Complete: ${task.type}`);
            } catch (error) {
                console.log(`   [${task.index + 1}/${task.totalTasks}] ❌ Failed: ${task.type} - ${error.message}`);
                this.errors.push({ task, error: error.message });
            }
        }
    }

    async _runTask(task) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                child.kill('SIGTERM');
                reject(new Error('Task timeout'));
            }, CONFIG.taskTimeout);

            // Use claude command with full path
            const claudePath = '/opt/homebrew/bin/claude';
            const child = spawn(claudePath, ['-p'], {
                stdio: ['pipe', 'pipe', 'pipe'],
                env: { ...process.env, PATH: '/opt/homebrew/bin:' + process.env.PATH }
            });

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (data) => {
                stdout += data;
            });

            child.stderr.on('data', (data) => {
                stderr += data;
            });

            child.on('close', (code) => {
                clearTimeout(timeout);
                if (code !== 0) {
                    reject(new Error(`Process exited with code ${code}: ${stderr}`));
                } else {
                    resolve({ task, stdout, stderr });
                }
            });

            // Send prompt to stdin
            child.stdin.write(task.prompt);
            child.stdin.end();
        });
    }
}

// Main orchestration function
async function orchestrateAnalysis(documentPath) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const documentName = path.basename(documentPath, '.md');
    const outputDir = path.join(CONFIG.outputBase, `${documentName}-${timestamp}`);

    // Create output directories
    await fs.promises.mkdir(path.join(outputDir, 'tasks'), { recursive: true });
    await fs.promises.mkdir(path.join(outputDir, 'prompts'), { recursive: true });
    await fs.promises.mkdir(path.join(outputDir, 'synthesis'), { recursive: true });

    console.log('🎭 ORCHESTRATED PARALLEL ANALYSIS');
    console.log('================================');
    console.log(`Document: ${documentPath}`);
    console.log(`Output: ${outputDir}`);
    console.log();

    try {
        // Phase 1: Document Classification
        console.log('📊 Phase 1: Analyzing document characteristics...');
        const { stdout: classificationJson } = await execAsync(
            `node "${path.join(CONFIG.scriptDir, 'lib/analyze-document.js')}" "${documentPath}" "${outputDir}"`
        );
        const classification = JSON.parse(classificationJson);
        
        // Save classification
        await fs.promises.writeFile(
            path.join(outputDir, 'document-metadata.json'),
            JSON.stringify(classification, null, 2)
        );
        
        console.log(`   Document type: ${classification.type}`);
        console.log(`   Flaw density: ${classification.flawDensity}`);
        console.log(`   Analysis depth: ${classification.analysisDepth}`);
        console.log();

        // Phase 2: Task Generation
        console.log('📋 Phase 2: Generating task list...');
        const tasks = classification.recommendations.map((taskType, index) => ({
            type: taskType,
            effort: classification.analysisDepth,
            index: index + 1
        }));
        
        await fs.promises.writeFile(
            path.join(outputDir, 'task-list.json'),
            JSON.stringify({ tasks }, null, 2)
        );
        
        console.log(`   Generated ${tasks.length} analysis tasks`);
        console.log();

        // Phase 3: Create Prompts
        console.log('✍️  Phase 3: Creating task prompts...');
        const taskPrompts = [];
        
        for (const [index, task] of tasks.entries()) {
            const promptPath = path.join(outputDir, 'prompts', `task-${index + 1}-${task.type}.txt`);
            
            const { stdout: prompt } = await execAsync(
                `node "${path.join(CONFIG.scriptDir, 'lib/create-single-prompt.js')}" "${documentPath}" '${JSON.stringify(task)}'`
            );
            
            await fs.promises.writeFile(promptPath, prompt);
            taskPrompts.push({
                ...task,
                promptPath,
                prompt,
                index,
                totalTasks: tasks.length
            });
        }
        
        console.log(`   Created ${taskPrompts.length} prompts`);
        console.log();

        // Phase 4: Run Tasks in Parallel
        console.log('🚀 Phase 4: Running parallel analysis...');
        console.log(`   Max concurrent tasks: ${CONFIG.maxConcurrent}`);
        console.log(`   Task timeout: ${CONFIG.taskTimeout / 1000}s`);
        console.log();

        const pool = new WorkerPool(CONFIG.maxConcurrent);
        const { completed, failed, results } = await pool.run(taskPrompts);

        console.log();
        console.log(`   Tasks completed: ${completed}`);
        console.log(`   Tasks failed: ${failed}`);
        console.log();

        // Save task results
        for (const result of results) {
            const outputPath = path.join(outputDir, 'tasks', `task-${result.task.index + 1}-${result.task.type}.json`);
            const rawPath = `${outputPath}.raw`;
            
            // Save raw output
            await fs.promises.writeFile(rawPath, result.stdout);
            
            // Extract findings
            try {
                const { stdout: findings } = await execAsync(
                    `node "${path.join(CONFIG.scriptDir, 'lib/extract-findings.js')}" "${rawPath}" "${outputPath}" "${result.task.type}"`
                );
            } catch (e) {
                console.log(`   Warning: Could not extract findings for ${result.task.type}`);
            }
        }

        // Update completed count
        await fs.promises.writeFile(
            path.join(outputDir, 'completed-count.txt'),
            completed.toString()
        );

        // Phase 5: Combine Findings
        console.log('📊 Phase 5: Combining findings...');
        try {
            await execAsync(`node "${path.join(CONFIG.scriptDir, 'lib/combine-findings.js')}" "${outputDir}"`);
            console.log('   ✅ Combined all findings');
        } catch (e) {
            console.log('   ⚠️  Could not combine findings:', e.message);
        }
        console.log();

        // Phase 6: Pattern Detection
        console.log('🔍 Phase 6: Detecting patterns...');
        const findingsPath = path.join(outputDir, 'all-findings.json');
        const patternsPath = path.join(outputDir, 'patterns.json');
        
        if (fs.existsSync(findingsPath)) {
            try {
                await execAsync(
                    `node "${path.join(CONFIG.scriptDir, 'lib/detect-patterns.js')}" "${findingsPath}" "${patternsPath}"`
                );
                console.log('   ✅ Pattern detection complete');
            } catch (e) {
                console.log('   ⚠️  Could not detect patterns:', e.message);
                // Create empty patterns file
                await fs.promises.writeFile(patternsPath, '{"patterns": []}');
            }
        } else {
            await fs.promises.writeFile(patternsPath, '{"patterns": []}');
        }
        console.log();

        // Phase 7: Generate Summary
        console.log('📈 Phase 7: Generating executive summary...');
        try {
            await execAsync(`node "${path.join(CONFIG.scriptDir, 'lib/generate-summary.js')}" "${outputDir}"`);
            console.log('   ✅ Executive summary created');
        } catch (e) {
            console.log('   ⚠️  Could not generate summary:', e.message);
        }
        console.log();

        // Phase 8: Final Synthesis
        console.log('📝 Phase 8: Creating final report...');
        
        // Setup state for synthesis
        const stateDir = path.join(CONFIG.scriptDir, 'state');
        await fs.promises.mkdir(stateDir, { recursive: true });
        
        if (fs.existsSync(findingsPath)) {
            await fs.promises.copyFile(findingsPath, path.join(stateDir, 'current-findings.json'));
            await fs.promises.copyFile(patternsPath, path.join(stateDir, 'patterns.json'));
            await fs.promises.writeFile(path.join(stateDir, 'iteration-count.txt'), '1');
            
            try {
                // Run synthesis with timeout
                await execAsync(
                    `cd "${CONFIG.scriptDir}" && ./strategies/synthesis.sh`,
                    { timeout: 120000 } // 2 minute timeout
                );
                
                const finalReportPath = path.join(stateDir, 'final-report.md');
                if (fs.existsSync(finalReportPath)) {
                    await fs.promises.copyFile(
                        finalReportPath,
                        path.join(outputDir, 'final-report.md')
                    );
                    console.log('   ✅ Final report generated');
                } else {
                    console.log('   ❌ Synthesis completed but no report generated');
                }
            } catch (e) {
                console.log('   ❌ Synthesis failed:', e.message);
            }
            
            // Cleanup state
            try {
                const stateFiles = await fs.promises.readdir(stateDir);
                for (const file of stateFiles) {
                    await fs.promises.unlink(path.join(stateDir, file));
                }
            } catch (e) {
                // Ignore cleanup errors
            }
        } else {
            console.log('   ⚠️  No findings to synthesize');
        }

        // Final summary
        console.log();
        console.log('✅ ANALYSIS COMPLETE');
        console.log('===================');
        console.log(`Output directory: ${outputDir}`);
        
        const reportPath = path.join(outputDir, 'final-report.md');
        if (fs.existsSync(reportPath)) {
            console.log(`Final report: ${reportPath}`);
        }
        
        console.log();
        console.log('Key files:');
        console.log(`  - Task results: ${path.join(outputDir, 'tasks/')}`);
        console.log(`  - All findings: ${path.join(outputDir, 'all-findings.json')}`);
        console.log(`  - Executive summary: ${path.join(outputDir, 'executive-summary.json')}`);
        if (fs.existsSync(reportPath)) {
            console.log(`  - Final report: ${reportPath}`);
        }

        return { success: true, outputDir };

    } catch (error) {
        console.error('❌ Analysis failed:', error);
        return { success: false, error: error.message };
    }
}

// CLI entry point
if (require.main === module) {
    const documentPath = process.argv[2];
    
    if (!documentPath) {
        console.error('Usage: orchestrate-analysis-node.js <document-path>');
        process.exit(1);
    }
    
    if (!fs.existsSync(documentPath)) {
        console.error(`Error: Document not found: ${documentPath}`);
        process.exit(1);
    }
    
    orchestrateAnalysis(documentPath)
        .then(result => {
            process.exit(result.success ? 0 : 1);
        })
        .catch(error => {
            console.error('Unexpected error:', error);
            process.exit(1);
        });
}

module.exports = { orchestrateAnalysis };