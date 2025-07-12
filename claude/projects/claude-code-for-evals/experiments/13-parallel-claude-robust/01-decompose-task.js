#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Phase 1: Task Decomposition (ROBUST)\n');

// Robustness: Multiple attempts with validation
const MAX_ATTEMPTS = 3;
let attempt = 0;
let tasks = [];

const prompt = `You are analyzing a document to find errors and issues. 

Please break down this analysis into exactly 6 independent subtasks that can be run in parallel. Each task should:
- Be completely independent (no dependencies on other tasks)
- Focus on a specific type of analysis
- Be roughly equal in complexity
- Cover different aspects of document quality

Output EXACTLY 6 numbered tasks in this format:
1. [First task description]
2. [Second task description]
3. [Third task description]
4. [Fourth task description]
5. [Fifth task description]
6. [Sixth task description]

Do not include any other text, explanations, or formatting. Just the 6 numbered items.`;

while (attempt < MAX_ATTEMPTS && tasks.length !== 6) {
  attempt++;
  console.log(`Attempt ${attempt}/${MAX_ATTEMPTS} to decompose tasks...`);
  
  try {
    const startTime = Date.now();
    
    const output = execSync(
      `claude -p "${prompt}" --max-turns 3`,
      { 
        encoding: 'utf8',
        timeout: 60000 // 1 minute timeout
      }
    );
    
    const duration = (Date.now() - startTime) / 1000;
    
    // Extract numbered tasks with better validation
    tasks = output
      .split('\n')
      .filter(line => /^[1-6]\.\s/.test(line))
      .map(line => line.replace(/^[1-6]\.\s/, '').trim())
      .filter(task => task.length > 10); // Minimum task description length
    
    console.log(`  Found ${tasks.length} tasks in ${duration.toFixed(1)}s`);
    
    // Validate we got exactly 6 tasks
    if (tasks.length === 6) {
      console.log(`✅ Successfully decomposed into 6 tasks\n`);
      break;
    } else {
      console.log(`⚠️  Expected 6 tasks but got ${tasks.length}, retrying...\n`);
    }
    
  } catch (error) {
    console.error(`❌ Attempt ${attempt} failed:`, error.message);
    if (attempt === MAX_ATTEMPTS) {
      console.error('\n❌ All attempts failed. Exiting.');
      process.exit(1);
    }
  }
}

// Fallback: If we still don't have exactly 6 tasks, use defaults
if (tasks.length !== 6) {
  console.log('⚠️  Using fallback task decomposition...\n');
  tasks = [
    'Analyze document structure, formatting, and overall organization for clarity and coherence',
    'Identify spelling errors, typos, and grammatical mistakes throughout the document',
    'Check all mathematical statements, formulas, and statistical claims for accuracy',
    'Find logical inconsistencies, contradictions, and flawed reasoning in arguments',
    'Verify factual claims, citations, references, and external links for validity',
    'Assess writing style, tone consistency, and identify areas needing clarification'
  ];
}

// Display tasks
console.log('📋 Tasks to be executed in parallel:\n');
tasks.forEach((task, i) => {
  console.log(`  ${i + 1}. ${task}`);
});

// Save tasks with metadata
const tasksData = {
  tasks: tasks,
  timestamp: new Date().toISOString(),
  decompositionTime: 0, // Will be updated
  attempts: attempt,
  method: tasks.length === 6 && attempt <= MAX_ATTEMPTS ? 'claude' : 'fallback'
};

fs.writeFileSync(
  path.join(__dirname, 'tasks.json'),
  JSON.stringify(tasksData, null, 2)
);

console.log('\n📄 Tasks saved to tasks.json');
console.log(`📊 Method used: ${tasksData.method}`);

// Validate the file was written correctly
if (!fs.existsSync('tasks.json')) {
  console.error('❌ Failed to write tasks.json');
  process.exit(1);
}

const savedData = JSON.parse(fs.readFileSync('tasks.json', 'utf8'));
if (savedData.tasks.length !== 6) {
  console.error('❌ Tasks.json validation failed');
  process.exit(1);
}

console.log('✅ Phase 1 completed successfully');