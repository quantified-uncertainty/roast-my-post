export function calculateTargetWordCount(
  content: string,
  baseWords: number = 200
): number {
  const wordCount = content.split(/\s+/).length;
  return Math.max(baseWords, Math.floor(wordCount / 50));
}

export function calculateTargetComments(
  content: string,
  baseComments: number = 3
): number {
  const wordCount = content.split(/\s+/).length;
  return Math.max(baseComments, Math.floor(wordCount / 1000)) * 3;
}

export function calculateCost(
  promptTokens: number,
  completionTokens: number,
  model: string
): number {
  // TODO: Implement actual cost calculation based on model
  return (promptTokens + completionTokens) * 0.00002; // Placeholder
}
