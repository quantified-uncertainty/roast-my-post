import type { Agent } from "../../../types/agentSchema";
import { logger } from "@/lib/logger";
import type { LLMInteraction } from "../../../types/llm";
import {
  DEFAULT_TEMPERATURE,
  withTimeout,
  SELF_CRITIQUE_TIMEOUT,
} from "../../../types/openai";
import { calculateLLMCost } from "../shared/costUtils";
import { createLogDetails } from "../shared/llmUtils";
import type { TaskResult } from "../shared/types";
import { handleAnthropicError } from "../utils/anthropicErrorHandler";
import { callClaudeWithTool, MODEL_CONFIG } from "@/lib/claude/wrapper";

export interface SelfCritiqueInput {
  summary: string;
  analysis: string;
  grade?: number;
  highlights?: Array<{
    title: string;
    text: string;
  }>;
}

export interface SelfCritiqueOutput {
  selfCritique: string;
}

export async function generateSelfCritique(
  evaluationOutput: SelfCritiqueInput,
  agent: Agent
): Promise<{ task: TaskResult; outputs: SelfCritiqueOutput }> {
  const startTime = Date.now();

  // Prepare the evaluation text for critique
  let evaluationText = `# Summary\n${evaluationOutput.summary}\n\n# Analysis\n${evaluationOutput.analysis}`;

  if (evaluationOutput.grade !== undefined) {
    evaluationText += `\n\n# Grade\n${evaluationOutput.grade}/100`;
  }

  if (evaluationOutput.highlights && evaluationOutput.highlights.length > 0) {
    evaluationText += `\n\n# Highlights\n`;
    evaluationOutput.highlights.forEach((highlight, index) => {
      evaluationText += `\n## Highlight ${index + 1}: ${highlight.title}\n${highlight.text}\n`;
    });
  }

  const systemMessage = `Context: Quality assessment of the provided evaluation.

${
  agent.selfCritiqueInstructions ||
  `Consider the following aspects:
- Completeness and coverage
- Quality of evidence and support
- Balance and objectivity
- Clarity of presentation
- Practical value
- Adherence to instructions`
}

Provide specific observations about strengths and areas for improvement.`;

  const userMessage = `Please critique the following evaluation. Provide a numerical score (1-100) and a detailed assessment (200-400 words).

${evaluationText}`;

  let response;
  let validationResult;
  let interaction;

  try {
    const result = await withTimeout(
      callClaudeWithTool<SelfCritiqueOutput>({
        model: MODEL_CONFIG.analysis,
        system: systemMessage,
        messages: [{ role: "user", content: userMessage }],
        max_tokens: 1000,
        temperature: DEFAULT_TEMPERATURE,
        toolName: "provide_self_critique",
        toolDescription: "Provide a quality evaluation of the given analysis",
        toolSchema: {
          type: "object" as const,
          properties: {
            selfCritique: {
              type: "string" as const,
              description:
                "Quality evaluation of the analysis. Provide a numerical score (1-100) and explain your assessment based on completeness, evidence quality, fairness, clarity, usefulness, and adherence to instructions. Be specific about strengths and weaknesses. 200-400 words.",
            },
          },
          required: ["selfCritique"],
        }
      }),
      SELF_CRITIQUE_TIMEOUT,
      `Anthropic API request timed out after ${SELF_CRITIQUE_TIMEOUT / 60000} minutes`
    );

    response = result.response;
    interaction = result.interaction;
    validationResult = result.toolResult;
  } catch (error: unknown) {
    logger.error('❌ Anthropic API error in self-critique generation:', error);
    handleAnthropicError(error);
  }

  // Validate that required fields are present and non-empty
  if (
    !validationResult.selfCritique ||
    validationResult.selfCritique.trim().length === 0
  ) {
    throw new Error(
      "Anthropic response missing or empty 'selfCritique' field"
    );
  }

  // Fix formatting issues from JSON tool use
  validationResult.selfCritique = validationResult.selfCritique
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\")
    .trim();

  // Convert RichLLMInteraction to LLMInteraction format
  const llmInteraction: LLMInteraction = {
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: userMessage },
      { role: "assistant", content: JSON.stringify(validationResult) }
    ],
    usage: {
      input_tokens: interaction.tokensUsed.prompt,
      output_tokens: interaction.tokensUsed.completion,
    },
  };

  const endTime = Date.now();
  const timeInSeconds = Math.round((endTime - startTime) / 1000);

  const cost = calculateLLMCost(MODEL_CONFIG.analysis, llmInteraction.usage);

  const logDetails = createLogDetails(
    "generateSelfCritique",
    MODEL_CONFIG.analysis,
    startTime,
    endTime,
    cost,
    interaction.tokensUsed.prompt,
    interaction.tokensUsed.completion,
    {
      agentName: agent.name,
      evaluationLength: evaluationText.length,
    },
    {
      selfCritiqueLength: validationResult.selfCritique.length,
    },
    `Generated self-critique (${validationResult.selfCritique.length} chars)`
  );

  return {
    task: {
      name: "generateSelfCritique",
      modelName: MODEL_CONFIG.analysis,
      priceInDollars: cost / 100,
      timeInSeconds,
      log: JSON.stringify(logDetails, null, 2),
      llmInteractions: [llmInteraction],
    },
    outputs: validationResult,
  };
}
