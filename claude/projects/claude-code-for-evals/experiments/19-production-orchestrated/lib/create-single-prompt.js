#!/usr/bin/env node

/**
 * Create a single prompt for a task
 * Used by the Node.js orchestrator
 */

const fs = require('fs');
const { createPrompt } = require('./create-prompts');

// Main execution
if (require.main === module) {
    const [documentPath, taskJson] = process.argv.slice(2);
    
    if (!documentPath || !taskJson) {
        console.error('Usage: create-single-prompt.js <document-path> <task-json>');
        process.exit(1);
    }
    
    try {
        const task = JSON.parse(taskJson);
        const prompt = createPrompt(documentPath, task);
        console.log(prompt);
    } catch (error) {
        console.error('Error creating prompt:', error.message);
        process.exit(1);
    }
}

module.exports = { createPrompt };