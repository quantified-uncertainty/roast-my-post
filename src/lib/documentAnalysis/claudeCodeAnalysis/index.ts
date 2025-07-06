import { analyzeWithClaudeCodeIterative } from "./iterativeAnalysis";
import type { Document } from "@/types/documents";
import type { Agent } from "@/types/agentSchema";
import type { ClaudeCodeAnalysisResult, ClaudeCodeOptions } from "./types";

export async function analyzeWithClaudeCode(
  document: Document,
  agent: Agent,
  options: ClaudeCodeOptions = {}
): Promise<ClaudeCodeAnalysisResult> {
  // Use the iterative approach for better results
  return analyzeWithClaudeCodeIterative(document, agent, options);
}

// Keep the old implementation below for reference
import { query, type SDKMessage } from "@anthropic-ai/claude-code";
import { BudgetTracker } from "./budgetTracker";
import { buildSystemPrompt, buildInitialPrompt } from "./prompts";
import { parseSDKMessages } from "./outputParser";
import { logger } from "@/lib/logger";

export async function analyzeWithClaudeCodeSinglePrompt(
  document: Document,
  agent: Agent,
  options: ClaudeCodeOptions = {}
): Promise<ClaudeCodeAnalysisResult> {
  const { 
    budget = 0.06, 
    maxTurns = 10, 
    verbose = false,
    temperature = 0.7 
  } = options;

  const tracker = new BudgetTracker(budget);
  const messages: SDKMessage[] = [];
  let abortReason: "budget" | "max_turns" | "completion" = "completion";
  const abortController = new AbortController();

  try {
    // Build the initial prompt combining system instructions and document
    const systemPrompt = buildSystemPrompt(agent);
    const documentPrompt = buildInitialPrompt(document, agent);
    const fullPrompt = `${systemPrompt}\n\n${documentPrompt}`;

    if (verbose) {
      logger.info("Starting Claude Code analysis", {
        agentName: agent.name,
        documentId: document.id,
        budget,
        maxTurns,
      });
    }

    // Run Claude Code query
    for await (const message of query({
      prompt: fullPrompt,
      abortController,
      options: {
        maxTurns,
        // Disable tools for document analysis
        disallowedTools: ["*"], // Disable all tools
        // Custom system prompt is already included in our prompt
        // Temperature and other model settings are handled by Claude Code
      },
    })) {
      messages.push(message);

      if (verbose) {
        logger.info("Claude Code message received", {
          type: message.type,
          subtype: (message as any).subtype,
          messageKeys: Object.keys(message),
          message: JSON.stringify(message).substring(0, 200),
        });
      }

      // Track costs for assistant messages
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
            logger.info(`Turn cost: $${turnCost.toFixed(4)}, total: $${tracker.getTotalCost().toFixed(4)}`);
          }

          // Check budget
          if (tracker.isOverBudget()) {
            logger.warn("Budget exceeded, aborting conversation", {
              used: tracker.getTotalCost(),
              budget,
            });
            abortController.abort();
            abortReason = "budget";
          }
        }
      }

      // Check for error or completion messages
      if (message.type === "result") {
        const resultMsg = message as any;
        if (resultMsg.subtype === "error_max_turns") {
          abortReason = "max_turns";
        } else if (resultMsg.subtype === "error_during_execution") {
          logger.error("Claude Code execution error", resultMsg);
          throw new Error("Claude Code execution failed");
        }
      }
    }

    // Parse final output from messages
    const result = parseSDKMessages(messages);

    return {
      ...result,
      conversation: messages as any[], // Type conversion for compatibility
      totalCost: tracker.getTotalCost(),
      turnCount: tracker.getTurnCount(),
      budgetUsed: tracker.getBudgetUtilization(),
      abortReason,
    };
  } catch (error) {
    logger.error("Claude Code analysis failed", error);
    throw error;
  }
}