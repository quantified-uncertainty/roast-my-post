import type { Agent } from "../../../types/agentSchema";
import type {
  LLMInteraction,
  LLMMessage,
} from "../../../types/llm";
import {
  ANALYSIS_MODEL,
  anthropic,
  DEFAULT_TEMPERATURE,
  withTimeout,
} from "../../../types/openai";
import {
  calculateApiCost,
  mapModelToCostModel,
} from "../../../utils/costCalculator";
import { createLogDetails } from "../shared/llmUtils";
import type { TaskResult } from "../shared/types";

export interface SelfCritiqueInput {
  summary: string;
  analysis: string;
  grade?: number;
  comments?: Array<{
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

  if (evaluationOutput.comments && evaluationOutput.comments.length > 0) {
    evaluationText += `\n\n# Comments\n`;
    evaluationOutput.comments.forEach((comment, index) => {
      evaluationText += `\n## Comment ${index + 1}: ${comment.title}\n${comment.text}\n`;
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

  const messages: LLMMessage[] = [
    { role: "system", content: systemMessage },
    { role: "user", content: userMessage },
  ];

  let response;
  let validationResult;
  let rawResponse;

  try {
    const apiParams = {
      model: ANALYSIS_MODEL,
      max_tokens: 1000,
      temperature: DEFAULT_TEMPERATURE,
      system: systemMessage,
      messages: [
        {
          role: "user" as const,
          content: userMessage,
        },
      ],
      tools: [
        {
          name: "provide_self_critique",
          description: "Provide a quality evaluation of the given analysis",
          input_schema: {
            type: "object" as const,
            properties: {
              selfCritique: {
                type: "string" as const,
                description:
                  "Quality evaluation of the analysis. Provide a numerical score (1-100) and explain your assessment based on completeness, evidence quality, fairness, clarity, usefulness, and adherence to instructions. Be specific about strengths and weaknesses. 200-400 words.",
              },
            },
            required: ["selfCritique"],
          },
        },
      ],
      tool_choice: { type: "tool" as const, name: "provide_self_critique" },
    };

    response = (await withTimeout(
      anthropic.messages.create(apiParams),
      60000, // 1 minute timeout
      "Anthropic API request timed out after 1 minute"
    )) as any; // Type assertion to avoid complex union type issues
  } catch (error: any) {
    console.error("❌ Anthropic API error in self-critique generation:", error);

    if (error?.status === 429) {
      throw new Error(
        "Anthropic API rate limit exceeded. Please try again in a moment."
      );
    }
    if (error?.status === 402) {
      throw new Error(
        "Anthropic API quota exceeded. Please check your billing."
      );
    }
    if (error?.status === 401) {
      throw new Error(
        "Anthropic API authentication failed. Please check your API key."
      );
    }
    if (error?.status >= 500) {
      throw new Error(
        `Anthropic API server error (${error.status}). Please try again later.`
      );
    }
    throw new Error(`Anthropic API error: ${error?.message || error}`);
  }

  try {
    const toolUse = response.content.find((c: any) => c.type === "tool_use");
    if (!toolUse || toolUse.name !== "provide_self_critique") {
      throw new Error(
        "No tool use response from Anthropic for self-critique generation"
      );
    }

    validationResult = toolUse.input as SelfCritiqueOutput;

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

    rawResponse = JSON.stringify(validationResult);
  } catch (error) {
    console.error("❌ Failed to parse or validate Anthropic response:", error);
    throw new Error(
      `Failed to process Anthropic response: ${error instanceof Error ? error.message : error}`
    );
  }

  const interaction: LLMInteraction = {
    messages: [...messages, { role: "assistant", content: rawResponse }],
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    },
  };

  const endTime = Date.now();
  const timeInSeconds = Math.round((endTime - startTime) / 1000);

  const cost = calculateApiCost(
    {
      input_tokens: interaction.usage.input_tokens,
      output_tokens: interaction.usage.output_tokens,
    },
    mapModelToCostModel(ANALYSIS_MODEL)
  );

  const logDetails = createLogDetails(
    "generateSelfCritique",
    ANALYSIS_MODEL,
    startTime,
    endTime,
    cost,
    interaction.usage.input_tokens,
    interaction.usage.output_tokens,
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
      modelName: ANALYSIS_MODEL,
      priceInCents: cost,
      timeInSeconds,
      log: JSON.stringify(logDetails, null, 2),
      llmInteractions: [interaction],
    },
    outputs: validationResult,
  };
}
