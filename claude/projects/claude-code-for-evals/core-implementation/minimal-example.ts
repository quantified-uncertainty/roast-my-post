// minimal-example.ts
import { execSync } from 'child_process';
import * as fs from 'fs';

function iterativeEval(url: string, iterations = 5) {
  const doc = 'working.md';
  
  // Initialize
  execSync(`claude -p "Create working doc for ${url}" --allowedTools Write`);
  
  // Iterate
  for (let i = 1; i <= iterations; i++) {
    console.log(`Iteration ${i}...`);
    
    execSync(`claude -p "Iteration ${i}: Read ${doc}, do next task, update" \
      --max-turns 10 --allowedTools Read,Write,WebSearch`);
    
    if (fs.readFileSync(doc, 'utf-8').includes('COMPLETE')) break;
  }
  
  // Extract result
  execSync(`claude -p "Extract final output from ${doc}" --allowedTools Read`);
}

// Run it
iterativeEval('https://example.com/article');