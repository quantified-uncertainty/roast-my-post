#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const readline = require('readline');

const WORKING_DOC = 'detailed_evaluation_working.md';
const BLOG_POST = 'test_blog_post.md';
const MAX_ITERATIONS = 6;

// Utility function to run Claude Code
function runClaude(prompt, maxTurns = 10, tools = 'Read,Write') {
  const escapedPrompt = prompt.replace(/"/g, '\\"').replace(/\$/g, '\\$');
  const cmd = `claude -p "${escapedPrompt}" --max-turns ${maxTurns} --allowedTools ${tools}`;
  
  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch (error) {
    console.error(`Claude command failed: ${error.message}`);
  }
}

// Get detail level for each iteration
function getDetailLevel(iteration) {
  const levels = {
    1: "thorough initial analysis",
    2: "deep dive with specific examples",
    3: "exhaustive analysis with citations",
    4: "critical examination with counterarguments",
    5: "comprehensive synthesis of all findings",
    6: "final polish and expansion to 1000+ words"
  };
  return levels[iteration] || levels[6];
}

// Check if evaluation is complete
function isComplete() {
  if (!fs.existsSync(WORKING_DOC)) return false;
  const content = fs.readFileSync(WORKING_DOC, 'utf-8');
  return content.includes('Status: COMPLETE');
}

// Main evaluation function
async function runDetailedEvaluation() {
  console.log('🚀 Starting detailed Claude Code evaluation');
  console.log('⚠️  This will use real API calls (estimated cost: ~$0.50-1.00)');
  console.log('');

  // Get user confirmation
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const answer = await new Promise(resolve => {
    rl.question('Continue? (y/n) ', resolve);
  });
  rl.close();

  if (!answer.match(/^[yY]/)) {
    console.log('Evaluation cancelled.');
    process.exit(0);
  }

  // Step 1: Initialize working document
  console.log('\n📝 Creating detailed working document...');
  
  const initPrompt = `Create a comprehensive working document for evaluating the blog post 'Why the tails fall apart' at ${BLOG_POST}.

Structure the document with:
- Metadata section
- Detailed task list (at least 8-10 evaluation tasks)
- Current focus tracking
- Comprehensive working memory sections for findings
- Space for detailed draft outputs

Tasks should include:
1. Extract and analyze ALL key claims (not just list them)
2. Deep fact-checking with sources
3. Mathematical accuracy verification
4. Logical flow analysis with specific examples
5. Writing style critique with line-by-line examples
6. Identify unstated assumptions
7. Evaluate evidence quality
8. Suggest improvements
9. Create detailed highlights with context
10. Write comprehensive final evaluation

Set max iterations to ${MAX_ITERATIONS}. Make the output goal at least 1000 words.`;

  runClaude(initPrompt, 8, 'Write');

  // Step 2: Run iterations
  for (let i = 1; i <= MAX_ITERATIONS; i++) {
    console.log(`\n🔄 === Iteration ${i}/${MAX_ITERATIONS} ===`);
    
    const detailLevel = getDetailLevel(i);
    const iterationPrompt = `Iteration ${i} of ${MAX_ITERATIONS} evaluating the statistics blog post.

IMPORTANT: Produce DETAILED, COMPREHENSIVE output. Each section should be thorough.

1. Read ${WORKING_DOC}
2. Read the blog post at ${BLOG_POST} 
3. Check current task focus
4. Complete that task with ${detailLevel}
5. Write AT LEAST 200-300 words of findings for this task
6. Include specific quotes, examples, and analysis
7. Update working document comprehensively
8. If doing fact-checking, search for real sources
9. If analyzing logic, trace through specific argument chains
10. Mark task complete and set next focus

${i === MAX_ITERATIONS ? `
For the final iteration, ensure the complete evaluation is AT LEAST 1000 words with:
- Executive summary (200+ words)
- Detailed strengths analysis (300+ words)
- Comprehensive weaknesses (300+ words)
- Specific improvement suggestions (200+ words)
- At least 10 annotated highlights
` : ''}

Use all available turns (up to 15) to be thorough.`;

    runClaude(iterationPrompt, 15, 'Read,Write,WebSearch');

    // Check if complete
    if (isComplete()) {
      console.log('✅ Evaluation complete!');
      break;
    }
  }

  // Step 3: Extract final evaluation
  console.log('\n📊 Extracting final detailed evaluation...');
  
  const extractPrompt = `Read ${WORKING_DOC} and create a final evaluation document.

Requirements:
1. Must be AT LEAST 1000 words total
2. Professional formatting with clear sections
3. Include all findings from working document
4. Add executive summary if missing
5. Expand on any brief sections
6. Ensure all highlights have detailed commentary

Output as a well-formatted markdown document saved as 'final_detailed_evaluation.md'`;

  runClaude(extractPrompt, 10, 'Read,Write');

  // Show results
  console.log('\n✅ Detailed evaluation complete!');
  console.log(`📄 Working document: ${WORKING_DOC}`);
  console.log('📄 Final evaluation: final_detailed_evaluation.md');

  // Show word count
  if (fs.existsSync('final_detailed_evaluation.md')) {
    const content = fs.readFileSync('final_detailed_evaluation.md', 'utf-8');
    const wordCount = content.split(/\s+/).length;
    console.log(`📏 Final evaluation word count: ${wordCount}`);
  }
}

// Run the evaluation
runDetailedEvaluation().catch(console.error);