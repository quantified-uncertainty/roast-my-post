#!/usr/bin/env node

/**
 * Track Claude API usage and costs
 * Parses output from claude CLI to extract token usage
 */

const fs = require('fs');

// Pricing as of Jan 2025 - Claude 4 models
// Note: Claude Code likely uses Sonnet 4
const PRICING = {
    'claude-4-opus': {
        input: 15.00 / 1_000_000,    // $15 per 1M tokens (estimate)
        output: 75.00 / 1_000_000    // $75 per 1M tokens (estimate)
    },
    'claude-4-sonnet': {
        input: 3.00 / 1_000_000,     // $3 per 1M tokens (Claude 3.5 Sonnet pricing)
        output: 15.00 / 1_000_000    // $15 per 1M tokens (Claude 3.5 Sonnet pricing)
    },
    'claude-4-haiku': {
        input: 0.25 / 1_000_000,     // $0.25 per 1M tokens (estimate)
        output: 1.25 / 1_000_000     // $1.25 per 1M tokens (estimate)
    },
    // Legacy models for reference
    'claude-3.5-sonnet': {
        input: 3.00 / 1_000_000,
        output: 15.00 / 1_000_000
    }
};

// Default to Sonnet 4 pricing (what Claude Code uses)
const DEFAULT_MODEL = 'claude-4-sonnet';

function extractUsageFromOutput(output) {
    // Look for usage patterns in claude CLI output
    // Patterns may vary - adjust based on actual output
    
    const patterns = {
        // Pattern 1: "Input tokens: X, Output tokens: Y"
        simple: /Input tokens:\s*(\d+),?\s*Output tokens:\s*(\d+)/i,
        
        // Pattern 2: JSON format
        json: /"usage":\s*{\s*"input_tokens":\s*(\d+),\s*"output_tokens":\s*(\d+)/,
        
        // Pattern 3: Verbose format
        verbose: /Tokens used:\s*(\d+)\s*input,\s*(\d+)\s*output/i,
        
        // Pattern 4: Alternative format
        alt: /(\d+)\s*input tokens.*?(\d+)\s*output tokens/is
    };
    
    for (const [name, pattern] of Object.entries(patterns)) {
        const match = output.match(pattern);
        if (match) {
            return {
                input_tokens: parseInt(match[1]),
                output_tokens: parseInt(match[2]),
                pattern_used: name
            };
        }
    }
    
    // If no pattern matches, estimate from content length
    // Rough estimate: 1 token ≈ 4 characters
    const inputEstimate = Math.ceil(output.length / 4);
    const outputEstimate = Math.ceil(output.length / 8); // Output usually shorter
    
    return {
        input_tokens: inputEstimate,
        output_tokens: outputEstimate,
        estimated: true,
        warning: 'Could not extract exact usage, using estimates'
    };
}

function calculateCost(usage, model = DEFAULT_MODEL) {
    const pricing = PRICING[model] || PRICING[DEFAULT_MODEL];
    
    const inputCost = usage.input_tokens * pricing.input;
    const outputCost = usage.output_tokens * pricing.output;
    const totalCost = inputCost + outputCost;
    
    return {
        input_cost_usd: inputCost,
        output_cost_usd: outputCost,
        total_cost_usd: totalCost,
        model_used: model
    };
}

function trackTaskUsage(taskPath, rawOutputPath) {
    try {
        const rawOutput = fs.readFileSync(rawOutputPath, 'utf8');
        const usage = extractUsageFromOutput(rawOutput);
        const cost = calculateCost(usage);
        
        // Read existing task data
        let taskData = {};
        if (fs.existsSync(taskPath)) {
            taskData = JSON.parse(fs.readFileSync(taskPath, 'utf8'));
        }
        
        // Add usage data
        taskData.usage = {
            ...usage,
            ...cost,
            tracked_at: new Date().toISOString()
        };
        
        // Save updated task data
        fs.writeFileSync(taskPath, JSON.stringify(taskData, null, 2));
        
        return taskData.usage;
    } catch (error) {
        console.error('Error tracking usage:', error.message);
        return null;
    }
}

function generateUsageReport(outputDir) {
    const tasksDir = `${outputDir}/tasks`;
    const reportPath = `${outputDir}/usage-report.json`;
    
    let totalUsage = {
        total_input_tokens: 0,
        total_output_tokens: 0,
        total_cost_usd: 0,
        tasks: [],
        web_searches_count: 0
    };
    
    // Read all task files
    const taskFiles = fs.readdirSync(tasksDir)
        .filter(f => f.endsWith('.json') && !f.endsWith('.raw'));
    
    taskFiles.forEach(file => {
        const taskData = JSON.parse(fs.readFileSync(`${tasksDir}/${file}`, 'utf8'));
        
        if (taskData.usage) {
            totalUsage.total_input_tokens += taskData.usage.input_tokens || 0;
            totalUsage.total_output_tokens += taskData.usage.output_tokens || 0;
            totalUsage.total_cost_usd += taskData.usage.total_cost_usd || 0;
            
            totalUsage.tasks.push({
                task: file.replace('.json', ''),
                type: taskData.taskType,
                input_tokens: taskData.usage.input_tokens,
                output_tokens: taskData.usage.output_tokens,
                cost_usd: taskData.usage.total_cost_usd,
                has_web_searches: taskData.taskType === 'factual_verification'
            });
            
            // Count web searches (rough estimate based on findings)
            if (taskData.findings && taskData.taskType === 'factual_verification') {
                totalUsage.web_searches_count += taskData.findings.length;
            }
        }
    });
    
    // Add synthesis cost estimate (if synthesis was run)
    if (fs.existsSync(`${outputDir}/final-report.md`)) {
        const synthesisEstimate = {
            input_tokens: 3000,  // Typical synthesis input
            output_tokens: 2000, // Typical synthesis output
            cost_usd: calculateCost({ input_tokens: 3000, output_tokens: 2000 }).total_cost_usd
        };
        
        totalUsage.total_input_tokens += synthesisEstimate.input_tokens;
        totalUsage.total_output_tokens += synthesisEstimate.output_tokens;
        totalUsage.total_cost_usd += synthesisEstimate.cost_usd;
        
        totalUsage.synthesis = synthesisEstimate;
    }
    
    // Generate summary
    totalUsage.summary = {
        total_tokens: totalUsage.total_input_tokens + totalUsage.total_output_tokens,
        average_cost_per_task: totalUsage.total_cost_usd / taskFiles.length,
        estimated_web_search_cost: totalUsage.web_searches_count * 0.05, // Rough estimate
        breakdown: {
            analysis_tasks: totalUsage.tasks.reduce((sum, t) => sum + (t.cost_usd || 0), 0),
            synthesis: totalUsage.synthesis?.cost_usd || 0,
            overhead: totalUsage.total_cost_usd * 0.1 // 10% overhead estimate
        }
    };
    
    // Save report
    fs.writeFileSync(reportPath, JSON.stringify(totalUsage, null, 2));
    
    // Also create human-readable summary
    const summaryPath = `${outputDir}/cost-summary.txt`;
    const summary = `
DOCUMENT ANALYSIS COST SUMMARY
==============================
Date: ${new Date().toISOString()}
Model: Claude 4 Sonnet (via Claude Code)

TOTAL COST: $${totalUsage.total_cost_usd.toFixed(4)} USD

Token Usage:
- Input tokens:  ${totalUsage.total_input_tokens.toLocaleString()}
- Output tokens: ${totalUsage.total_output_tokens.toLocaleString()}
- Total tokens:  ${totalUsage.summary.total_tokens.toLocaleString()}

Task Breakdown:
${totalUsage.tasks.map(t => `- ${t.task}: $${(t.cost_usd || 0).toFixed(4)}`).join('\n')}
${totalUsage.synthesis ? `- Synthesis: $${totalUsage.synthesis.cost_usd.toFixed(4)}` : ''}

Web Searches: ${totalUsage.web_searches_count} (estimated)
Estimated web search cost: $${totalUsage.summary.estimated_web_search_cost.toFixed(4)}

Average cost per task: $${totalUsage.summary.average_cost_per_task.toFixed(4)}

Note: This is an estimate. Actual costs may vary based on:
- Exact model used (Opus/Sonnet/Haiku)
- Web search implementation
- Caching and optimization
`;
    
    fs.writeFileSync(summaryPath, summary);
    
    console.log('Usage report generated:');
    console.log(`  JSON: ${reportPath}`);
    console.log(`  Summary: ${summaryPath}`);
    console.log(`  TOTAL COST: $${totalUsage.total_cost_usd.toFixed(4)} USD`);
    
    return totalUsage;
}

// CLI usage
if (require.main === module) {
    const command = process.argv[2];
    
    if (command === 'track') {
        const [taskPath, rawOutputPath] = process.argv.slice(3);
        if (!taskPath || !rawOutputPath) {
            console.error('Usage: track-usage.js track <task-path> <raw-output-path>');
            process.exit(1);
        }
        trackTaskUsage(taskPath, rawOutputPath);
    } else if (command === 'report') {
        const outputDir = process.argv[3];
        if (!outputDir) {
            console.error('Usage: track-usage.js report <output-dir>');
            process.exit(1);
        }
        generateUsageReport(outputDir);
    } else {
        console.error('Usage:');
        console.error('  track-usage.js track <task-path> <raw-output-path>');
        console.error('  track-usage.js report <output-dir>');
        process.exit(1);
    }
}

module.exports = { extractUsageFromOutput, calculateCost, trackTaskUsage, generateUsageReport };