// LLM interaction tracking is now handled automatically by Helicone
// This file maintains legacy logging utilities for task results

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
    usage: {
      input_tokens: number;
      output_tokens: number;
    };
  };
  context: Record<string, unknown>;
  outputStats: Record<string, unknown>;
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
  context: Record<string, unknown>,
  outputStats: Record<string, unknown>,
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