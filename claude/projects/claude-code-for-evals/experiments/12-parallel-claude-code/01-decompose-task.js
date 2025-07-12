#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Phase 1: Task Decomposition\n');

const prompt = `You are analyzing a document to find errors and issues. 

Please break down this analysis into 5-7 independent subtasks that can be run in parallel. Each task should:
- Be completely independent (no dependencies on other tasks)
- Focus on a specific type of analysis
- Be roughly equal in complexity
- Cover different aspects of document quality

Output ONLY a numbered list in this exact format:
1. [First task description]
2. [Second task description]
...

Do not include any other text, explanations, or formatting.`;

console.log('Asking Claude to decompose the analysis task...\n');

try {
  const startTime = Date.now();
  
  const output = execSync(
    `claude -p "${prompt}" --max-turns 3`,
    { encoding: 'utf8' }
  );
  
  const duration = (Date.now() - startTime) / 1000;
  
  // Extract numbered tasks
  const tasks = output
    .split('\n')
    .filter(line => /^\d+\.\s/.test(line))
    .map(line => line.replace(/^\d+\.\s/, '').trim())
    .filter(task => task.length > 0);
  
  console.log(`✅ Decomposed into ${tasks.length} tasks in ${duration.toFixed(1)}s:\n`);
  tasks.forEach((task, i) => {
    console.log(`  ${i + 1}. ${task}`);
  });
  
  // Save tasks for next phase
  const tasksData = {
    tasks: tasks,
    timestamp: new Date().toISOString(),
    decompositionTime: duration
  };
  
  fs.writeFileSync(
    path.join(__dirname, 'tasks.json'),
    JSON.stringify(tasksData, null, 2)
  );
  
  console.log('\n📄 Tasks saved to tasks.json');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}