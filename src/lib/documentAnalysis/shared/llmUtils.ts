import { LLMInteraction, LLMUsage } from "../../../types/llm";

export function countTokensFromInteractions(
  interactions: LLMInteraction[],
  tokenType: "input_tokens" | "output_tokens"
): number {
  return interactions.reduce(
    (sum, interaction) => sum + (interaction.usage?.[tokenType] || 0),
    0
  );
}

interface LogDetails {
  task: {
    name: string;
    model: string;
    startTime: string;
    endTime: string;
    durationSeconds: number;
  };
  cost: {
    estimatedCents: number;
    usage: LLMUsage;
  };
  context: Record<string, string | number | boolean | null | undefined>;
  outputStats: Record<string, string | number | boolean | null | undefined>;
  summary: string;
}

export function createLogDetails(
  name: string,
  model: string,
  startTime: number,
  endTime: number,
  cost: number,
  inputTokens: number,
  outputTokens: number,
  context: Record<string, string | number | boolean | null | undefined>,
  outputStats: Record<string, string | number | boolean | null | undefined>,
  summary: string
): LogDetails {
  return {
    task: {
      name,
      model,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      durationSeconds: Math.round((endTime - startTime) / 1000),
    },
    cost: {
      estimatedCents: cost,
      usage: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
      },
    },
    context,
    outputStats,
    summary,
  };
}