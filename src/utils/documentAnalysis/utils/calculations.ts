export function calculateTargetWordCount(content: string): number {
  const baseWords = 50;
  const contentLength = content.length;
  // More aggressive logarithmic scaling
  // 500 chars -> ~50 words
  // 1000 chars -> ~100 words
  // 10000 chars -> ~200 words
  const additionalWords = Math.log10(contentLength / 500) * 100;
  return Math.round(baseWords + Math.max(0, additionalWords));
}

export function calculateTargetComments(content: string): number {
  const baseComments = 3;
  const contentLength = content.length;
  // Roughly 1 comment per 1000 characters
  const additionalComments = Math.floor(contentLength / 1000);
  return Math.max(baseComments, Math.min(additionalComments, 10)); // Cap at 10 comments
}

export function calculateCost(
  promptTokens: number,
  completionTokens: number,
  model: string
): number {
  // TODO: Implement actual cost calculation based on model
  return (promptTokens + completionTokens) * 0.00002; // Placeholder
}
