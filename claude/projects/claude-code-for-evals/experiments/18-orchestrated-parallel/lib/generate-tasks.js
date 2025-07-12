#!/usr/bin/env node

/**
 * Generate task list based on document metadata
 */

const fs = require('fs');

const TASK_DEFINITIONS = {
    // Technical tasks
    mathematical_accuracy: {
        name: 'Mathematical Accuracy Check',
        description: 'Verify all mathematical statements, equations, and calculations',
        estimatedTime: 5,
        priority: 'high'
    },
    statistical_validity: {
        name: 'Statistical Validity Review',
        description: 'Check statistical claims, methods, and interpretations',
        estimatedTime: 5,
        priority: 'high'
    },
    logical_consistency: {
        name: 'Logical Consistency Analysis',
        description: 'Examine logical flow, arguments, and reasoning',
        estimatedTime: 4,
        priority: 'high'
    },
    
    // Quality tasks
    spelling_grammar: {
        name: 'Spelling and Grammar Check',
        description: 'Identify spelling errors, grammatical mistakes, and typos',
        estimatedTime: 3,
        priority: 'medium'
    },
    clarity_readability: {
        name: 'Clarity and Readability Review',
        description: 'Assess sentence structure, clarity, and overall readability',
        estimatedTime: 4,
        priority: 'medium'
    },
    structural_analysis: {
        name: 'Document Structure Analysis',
        description: 'Evaluate organization, flow, and completeness',
        estimatedTime: 4,
        priority: 'medium'
    },
    
    // Content tasks
    factual_verification: {
        name: 'Fact Checking',
        description: 'Verify factual claims and statements',
        estimatedTime: 5,
        priority: 'high'
    },
    missing_content: {
        name: 'Missing Content Detection',
        description: 'Identify gaps, missing explanations, or incomplete sections',
        estimatedTime: 4,
        priority: 'medium'
    },
    argument_strength: {
        name: 'Argument Strength Assessment',
        description: 'Evaluate the strength and validity of arguments',
        estimatedTime: 5,
        priority: 'high'
    },
    
    // Specialized tasks
    code_quality: {
        name: 'Code Quality Review',
        description: 'Check code snippets for errors, best practices, and clarity',
        estimatedTime: 5,
        priority: 'high'
    },
    citation_accuracy: {
        name: 'Citation Verification',
        description: 'Verify citations, references, and attributions',
        estimatedTime: 4,
        priority: 'medium'
    }
};

function generateTasks(metadataPath) {
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    const tasks = [];
    
    // Generate tasks based on recommendations
    metadata.recommendations.forEach((taskType, index) => {
        if (TASK_DEFINITIONS[taskType]) {
            const taskDef = TASK_DEFINITIONS[taskType];
            tasks.push({
                id: `task-${index + 1}-${taskType}`,
                type: taskType,
                name: taskDef.name,
                description: taskDef.description,
                priority: taskDef.priority,
                estimatedTime: taskDef.estimatedTime,
                metadata: {
                    documentType: metadata.type,
                    documentFeatures: metadata.features
                }
            });
        }
    });
    
    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    tasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    
    return tasks;
}

// Main execution
if (require.main === module) {
    const metadataPath = process.argv[2];
    if (!metadataPath) {
        console.error('Usage: generate-tasks.js <metadata-path>');
        process.exit(1);
    }
    
    try {
        const tasks = generateTasks(metadataPath);
        console.log(JSON.stringify(tasks, null, 2));
    } catch (error) {
        console.error('Error generating tasks:', error.message);
        process.exit(1);
    }
}

module.exports = { generateTasks };