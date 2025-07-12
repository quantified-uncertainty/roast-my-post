#!/usr/bin/env node

/**
 * Estimate costs based on document analysis patterns
 * More accurate estimates based on real-world usage
 */

const fs = require('fs');

// Updated pricing for Claude models (Jan 2025)
const PRICING = {
    'claude-3-opus': {
        input: 15.00 / 1_000_000,    // $15 per 1M input tokens
        output: 75.00 / 1_000_000    // $75 per 1M output tokens
    },
    'claude-3.5-sonnet': {
        input: 3.00 / 1_000_000,     // $3 per 1M input tokens  
        output: 15.00 / 1_000_000    // $15 per 1M output tokens
    },
    'claude-3-haiku': {
        input: 0.25 / 1_000_000,     // $0.25 per 1M input tokens
        output: 1.25 / 1_000_000     // $1.25 per 1M output tokens
    }
};

// Realistic token estimates per task type
const TASK_ESTIMATES = {
    mathematical_accuracy: {
        base_input: 3000,    // Document + prompt
        output_per_finding: 200,
        avg_findings: 5
    },
    statistical_validity: {
        base_input: 3000,
        output_per_finding: 250,
        avg_findings: 6
    },
    factual_verification: {
        base_input: 3000,
        web_search_overhead: 2000, // Extra tokens per search
        output_per_finding: 300,
        avg_findings: 8,
        avg_searches: 5
    },
    citation_accuracy: {
        base_input: 3000,
        web_search_overhead: 1500,
        output_per_finding: 250,
        avg_findings: 6,
        avg_searches: 4
    },
    logical_consistency: {
        base_input: 3000,
        output_per_finding: 200,
        avg_findings: 5
    },
    argument_strength: {
        base_input: 3000,
        output_per_finding: 300,
        avg_findings: 4
    }
};

function estimateTaskCost(taskType, model = 'claude-3.5-sonnet') {
    const estimate = TASK_ESTIMATES[taskType] || TASK_ESTIMATES.logical_consistency;
    const pricing = PRICING[model];
    
    // Calculate tokens
    let inputTokens = estimate.base_input;
    let outputTokens = estimate.output_per_finding * estimate.avg_findings;
    
    // Add web search overhead if applicable
    if (estimate.web_search_overhead && estimate.avg_searches) {
        inputTokens += estimate.web_search_overhead * estimate.avg_searches;
        outputTokens += 500 * estimate.avg_searches; // Search results
    }
    
    // Calculate costs
    const inputCost = inputTokens * pricing.input;
    const outputCost = outputTokens * pricing.output;
    
    return {
        task_type: taskType,
        estimated_input_tokens: inputTokens,
        estimated_output_tokens: outputTokens,
        estimated_cost_usd: inputCost + outputCost,
        breakdown: {
            input_cost: inputCost,
            output_cost: outputCost
        }
    };
}

function estimateDocumentCost(documentPath, outputDir) {
    // Read document to estimate size
    const document = fs.readFileSync(documentPath, 'utf8');
    const documentTokens = Math.ceil(document.length / 4); // Rough estimate
    
    // Read task list if available
    let tasks = [];
    const taskListPath = `${outputDir}/task-list.json`;
    if (fs.existsSync(taskListPath)) {
        const taskList = JSON.parse(fs.readFileSync(taskListPath, 'utf8'));
        tasks = taskList.map(t => t.type);
    } else {
        // Default task set for comprehensive analysis
        tasks = ['mathematical_accuracy', 'statistical_validity', 'factual_verification', 'logical_consistency'];
    }
    
    // Estimate costs per task
    let totalCost = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    const taskCosts = [];
    
    tasks.forEach(taskType => {
        const cost = estimateTaskCost(taskType);
        taskCosts.push(cost);
        totalCost += cost.estimated_cost_usd;
        totalInputTokens += cost.estimated_input_tokens;
        totalOutputTokens += cost.estimated_output_tokens;
    });
    
    // Add synthesis cost
    const synthesisCost = {
        task_type: 'synthesis',
        estimated_input_tokens: totalOutputTokens + 2000, // All findings + prompt
        estimated_output_tokens: 3000, // Final report
        estimated_cost_usd: 0
    };
    
    const pricing = PRICING['claude-3.5-sonnet'];
    synthesisCost.estimated_cost_usd = 
        (synthesisCost.estimated_input_tokens * pricing.input) +
        (synthesisCost.estimated_output_tokens * pricing.output);
    
    taskCosts.push(synthesisCost);
    totalCost += synthesisCost.estimated_cost_usd;
    totalInputTokens += synthesisCost.estimated_input_tokens;
    totalOutputTokens += synthesisCost.estimated_output_tokens;
    
    // Generate report
    const report = {
        document: documentPath,
        document_size: {
            characters: document.length,
            estimated_tokens: documentTokens
        },
        estimated_total_cost_usd: totalCost,
        estimated_total_tokens: totalInputTokens + totalOutputTokens,
        token_breakdown: {
            input: totalInputTokens,
            output: totalOutputTokens
        },
        cost_breakdown_by_task: taskCosts,
        assumptions: {
            model: 'claude-3.5-sonnet',
            includes_web_searches: true,
            web_searches_per_verification: 5,
            findings_per_task: 'average estimates'
        },
        cost_range: {
            low: totalCost * 0.7,  // 30% lower if efficient
            expected: totalCost,
            high: totalCost * 1.5  // 50% higher if complex
        }
    };
    
    // Save report
    const reportPath = `${outputDir}/cost-estimate.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Create human-readable summary
    const summary = `
COST ESTIMATE FOR DOCUMENT ANALYSIS
===================================
Document: ${documentPath}
Size: ${document.length.toLocaleString()} characters (~${documentTokens.toLocaleString()} tokens)

ESTIMATED TOTAL COST: $${totalCost.toFixed(2)} USD

Cost Range:
- Low (efficient run): $${(totalCost * 0.7).toFixed(2)}
- Expected: $${totalCost.toFixed(2)}
- High (complex doc): $${(totalCost * 1.5).toFixed(2)}

Token Usage Estimate:
- Input tokens: ${totalInputTokens.toLocaleString()}
- Output tokens: ${totalOutputTokens.toLocaleString()}
- Total tokens: ${(totalInputTokens + totalOutputTokens).toLocaleString()}

Task Breakdown:
${taskCosts.map(t => `- ${t.task_type}: $${t.estimated_cost_usd.toFixed(3)}`).join('\n')}

Assumptions:
- Model: Claude 3.5 Sonnet
- Includes web searches for fact-checking
- Average document complexity
- Standard finding counts per task

Note: Actual costs may vary based on:
- Document complexity
- Number of factual claims requiring verification
- Web search requirements
- Model efficiency and caching
`;
    
    const summaryPath = `${outputDir}/cost-estimate.txt`;
    fs.writeFileSync(summaryPath, summary);
    
    console.log(summary);
    return report;
}

// CLI usage
if (require.main === module) {
    const [documentPath, outputDir] = process.argv.slice(2);
    
    if (!documentPath) {
        console.error('Usage: estimate-costs.js <document-path> [output-dir]');
        console.error('');
        console.error('Or to estimate a single task:');
        console.error('  node estimate-costs.js --task <task-type>');
        process.exit(1);
    }
    
    if (documentPath === '--task') {
        const taskType = outputDir;
        const cost = estimateTaskCost(taskType);
        console.log(JSON.stringify(cost, null, 2));
    } else {
        const dir = outputDir || '.';
        estimateDocumentCost(documentPath, dir);
    }
}

module.exports = { estimateTaskCost, estimateDocumentCost, PRICING };