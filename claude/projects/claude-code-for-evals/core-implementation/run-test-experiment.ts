// run-test-experiment.ts
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const WORKING_DOC = path.join(__dirname, 'evaluation_working.md');
const BLOG_POST_PATH = path.join(__dirname, 'test_blog_post.md');
const MAX_ITERATIONS = 8;

async function runIterativeEvaluation() {
  console.log('🚀 Starting iterative evaluation of "Why the tails fall apart"');
  const startTime = Date.now();

  try {
    // Step 1: Initialize working document
    console.log('\n📝 Creating initial working document...');
    
    const initPrompt = `Create a working document for evaluating the blog post at ${BLOG_POST_PATH}.
    The post is titled "Why the tails fall apart" and discusses statistical correlations.
    
    Include these sections:
    - Metadata (title, status, iterations)
    - Planning & Tasks (fact checking, logic evaluation, clarity assessment, statistical accuracy)
    - Current Focus
    - Working Memory (key claims, research notes, issues found)
    - Draft Outputs (evaluation summary, highlights)
    - Final Output
    
    Mark tasks as checkboxes. Set max iterations to ${MAX_ITERATIONS}.`;

    execSync(`claude -p "${initPrompt}" --max-turns 5 --allowedTools Write`, { 
      stdio: 'inherit' 
    });

    // Step 2: Run iterations
    for (let i = 1; i <= MAX_ITERATIONS; i++) {
      console.log(`\n🔄 === Iteration ${i}/${MAX_ITERATIONS} ===`);
      
      const iterationPrompt = `You are iteration ${i} of ${MAX_ITERATIONS} evaluating a blog post.
      
      1. Read ${WORKING_DOC}
      2. Read the blog post at ${BLOG_POST_PATH}
      3. Check the "Current Focus" task
      4. Complete that task thoroughly (use up to 10 turns)
      5. Update the working document with your findings
      6. Mark completed tasks with [x]
      7. Set the next "Current Focus" task
      8. If all tasks complete, set Status: COMPLETE and write final evaluation
      
      Focus on being thorough but constructive. Check statistical claims, logical coherence, and clarity.`;

      execSync(`claude -p "${iterationPrompt}" --max-turns 10 --allowedTools Read,Write,WebSearch`, {
        stdio: 'inherit'
      });

      // Check if complete
      if (fs.existsSync(WORKING_DOC)) {
        const content = fs.readFileSync(WORKING_DOC, 'utf-8');
        if (content.includes('Status: COMPLETE')) {
          console.log('\n✅ Evaluation complete!');
          break;
        }
      }
    }

    // Step 3: Extract final results
    console.log('\n📊 Extracting final evaluation...');
    
    const extractPrompt = `Read ${WORKING_DOC} and extract ONLY the final evaluation JSON.
    Output should be valid JSON with structure:
    {
      "summary": "overall evaluation",
      "strengths": ["list of strengths"],
      "weaknesses": ["list of weaknesses"],
      "highlights": [{"text": "quote", "comment": "feedback", "type": "positive|negative|neutral"}],
      "score": 0-100
    }`;

    execSync(`claude -p "${extractPrompt}" --max-turns 3 --allowedTools Read > final_evaluation.json`, {
      stdio: ['inherit', 'pipe', 'inherit']
    });

    // Save experiment results
    const duration = Date.now() - startTime;
    const results = {
      experimentType: 'iterative-evaluation',
      blogPost: 'Why the tails fall apart',
      startTime,
      duration,
      durationMinutes: (duration / 1000 / 60).toFixed(2),
      iterations: i,
      workingDocPath: WORKING_DOC,
      finalEvaluationPath: 'final_evaluation.json'
    };

    fs.writeFileSync(
      `experiment_results_${Date.now()}.json`,
      JSON.stringify(results, null, 2)
    );

    console.log(`\n🎉 Experiment complete!`);
    console.log(`Duration: ${results.durationMinutes} minutes`);
    console.log(`Iterations used: ${results.iterations}`);

  } catch (error) {
    console.error('❌ Experiment failed:', error);
  }
}

// Run the experiment
runIterativeEvaluation();