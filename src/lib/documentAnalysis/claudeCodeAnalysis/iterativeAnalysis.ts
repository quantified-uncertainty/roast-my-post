import { query, type SDKMessage } from "@anthropic-ai/claude-code";
import { BudgetTracker } from "./budgetTracker";
import type { Document } from "@/types/documents";
import type { Agent } from "@/types/agentSchema";
import type { ClaudeCodeAnalysisResult, ClaudeCodeOptions } from "./types";
import { logger } from "@/lib/logger";
import * as fs from "fs/promises";
import * as path from "path";
import { parseIterativeOutput } from "./outputParser";

export async function analyzeWithClaudeCodeIterative(
  document: Document,
  agent: Agent,
  options: ClaudeCodeOptions = {}
): Promise<ClaudeCodeAnalysisResult> {
  const { 
    budget = 0.06, 
    maxTurns = 5, // Number of Claude Code iterations
    verbose = false,
  } = options;

  const tracker = new BudgetTracker(budget);
  const allMessages: SDKMessage[] = [];
  let abortReason: "budget" | "max_turns" | "completion" = "completion";

  // Create a temporary file for the analysis
  const tempDir = "/tmp/claude-code-analysis";
  await fs.mkdir(tempDir, { recursive: true });
  const analysisFile = path.join(tempDir, `analysis-${Date.now()}.md`);
  
  logger.info(`Claude Code analysis file: ${analysisFile}`);
  console.log(`\n📄 ANALYSIS FILE: ${analysisFile}`);
  console.log(`You can monitor progress with: tail -f ${analysisFile}\n`);
  
  // Initialize the analysis file with a template
  const template = `# Document Analysis: ${document.title}

## Summary
[To be completed]

## Grade
[To be assigned: 0-100]

## Main Analysis
[To be completed]

## Comments
[List specific comments with quotes and line numbers]

---
## Document Content for Reference:
${document.content}
`;

  await fs.writeFile(analysisFile, template, 'utf-8');

  try {
    // Run multiple iterations
    for (let iteration = 0; iteration < maxTurns; iteration++) {
      if (verbose) {
        logger.info(`Starting Claude Code iteration ${iteration + 1} of ${maxTurns}`);
      }

      const iterationPrompt = buildIterationPrompt(
        agent, 
        document, 
        iteration, 
        maxTurns,
        analysisFile
      );

      const abortController = new AbortController();
      const iterationMessages: SDKMessage[] = [];
      
      // Run one Claude Code session
      for await (const message of query({
        prompt: iterationPrompt,
        abortController,
        options: {
          maxTurns: 3, // Allow a few turns per iteration
          allowedTools: ["Read", "Edit", "Write"], // Only file editing tools
          cwd: tempDir,
        },
      })) {
        iterationMessages.push(message);
        allMessages.push(message);

        // Track costs
        if (message.type === "assistant") {
          const anyMsg = message as any;
          const usage = anyMsg.message?.usage || anyMsg.usage;
          
          if (usage) {
            const turnCost = tracker.calculateCost(
              usage.input_tokens || 0,
              usage.output_tokens || 0
            );
            tracker.addTurn(turnCost, {
              input_tokens: usage.input_tokens || 0,
              output_tokens: usage.output_tokens || 0,
            });

            if (verbose) {
              logger.info(`Cost for iteration ${iteration + 1}: $${turnCost.toFixed(4)}, total: $${tracker.getTotalCost().toFixed(4)}`);
            }

            // Check budget
            if (tracker.isOverBudget()) {
              logger.warn("Budget exceeded, stopping iterations", {
                used: tracker.getTotalCost(),
                budget,
              });
              abortReason = "budget";
              break;
            }
          }
        }
      }

      if (abortReason === "budget") {
        break;
      }
      
      // Read and log current state after each iteration
      try {
        const currentAnalysis = await fs.readFile(analysisFile, 'utf-8');
        const lines = currentAnalysis.split('\n');
        const summaryLine = lines.find(l => l.includes('## Summary'))?.substring(0, 100);
        const gradeLine = lines.find(l => l.includes('## Grade'))?.substring(0, 50);
        
        console.log(`\n✅ Iteration ${iteration + 1} complete:`);
        console.log(`   Summary: ${summaryLine || 'Not yet written'}`);
        console.log(`   Grade: ${gradeLine || 'Not yet assigned'}`);
        console.log(`   File size: ${currentAnalysis.length} chars`);
        
        // Show a preview of comments
        const commentsStart = currentAnalysis.indexOf('## Comments');
        if (commentsStart > -1) {
          const commentsPreview = currentAnalysis.substring(commentsStart, commentsStart + 200);
          console.log(`   Comments preview: ${commentsPreview.replace(/\n/g, ' ')}`);
        }
      } catch (err) {
        logger.warn('Could not read analysis file for progress update', err);
      }
    }

    // Read the final analysis
    const finalAnalysis = await fs.readFile(analysisFile, 'utf-8');
    
    // Parse the output
    const result = parseIterativeOutput(finalAnalysis);

    // Don't clean up - keep file for inspection
    console.log(`\n📁 Final analysis saved at: ${analysisFile}`);

    return {
      ...result,
      conversation: allMessages,
      totalCost: tracker.getTotalCost(),
      turnCount: tracker.getTurnCount(),
      budgetUsed: tracker.getBudgetUtilization(),
      abortReason,
    };
  } catch (error) {
    logger.error("Claude Code iterative analysis failed", error);
    // Clean up on error
    await fs.unlink(analysisFile).catch(() => {});
    throw error;
  }
}

function buildIterationPrompt(
  agent: Agent,
  document: Document,
  iteration: number,
  maxIterations: number,
  analysisFile: string
): string {
  const fileName = path.basename(analysisFile);
  
  if (iteration === 0) {
    return `You are analyzing a document for evaluation. The document content and initial template are in the file "${fileName}".

${agent.primaryInstructions || ""}

Please read the file and begin your analysis by:
1. Writing a comprehensive summary in the Summary section
2. Analyzing the main arguments and structure in the Main Analysis section
3. Identifying specific issues or highlights with exact quotes in the Comments section

Use the Edit tool to update the file with your analysis.`;
  } else if (iteration < maxIterations - 1) {
    return `Continue your analysis of the document in "${fileName}". 

This is iteration ${iteration + 1} of ${maxIterations}. Please:
1. Read your current analysis
2. Expand on areas that need more detail
3. Add more specific comments with exact quotes from the document
4. Refine your assessment

Focus on areas you haven't fully covered yet.`;
  } else {
    return `This is your final iteration (${iteration + 1} of ${maxIterations}) to complete the analysis in "${fileName}".

Please:
1. Read your analysis one more time
2. Assign a final grade (0-100) in the Grade section based on your assessment
3. Ensure the summary is complete and concise
4. Add any final comments with specific quotes
5. Make sure all sections are properly filled out

Format comments as:
- "Exact quote from document" (Line X or Section Y) - Your specific feedback`;
  }
}