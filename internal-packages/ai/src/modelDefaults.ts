/** Shared, client-safe model choices. Keep explicit versions in saved profiles. */
export const CLAUDE_MODEL_CHOICES = [
  { id: 'claude-sonnet-5-5', name: 'Claude Sonnet 5.5' },
  { id: 'claude-haiku-5-5', name: 'Claude Haiku 5.5' },
  { id: 'claude-opus-5-5', name: 'Claude Opus 5.5' },
] as const;

export const DEFAULT_RESEARCH_MODEL = 'openai/gpt-6-luna';

export const DEFAULT_CLAIM_MODELS = [
  'anthropic/claude-sonnet-5.5',
  'openai/gpt-6-luna',
  'deepseek/deepseek-v4.1-flash',
  'x-ai/grok-4.7',
];

export const OPENROUTER_MODEL_CHOICES = [
  { id: 'anthropic/claude-sonnet-5.5', name: 'Claude Sonnet 5.5' },
  { id: 'anthropic/claude-haiku-5.5', name: 'Claude Haiku 5.5' },
  { id: 'anthropic/claude-opus-5.5', name: 'Claude Opus 5.5' },
  { id: 'openai/gpt-6-luna', name: 'GPT-6 Luna' },
  { id: 'google/gemini-4-argon', name: 'Gemini 4 Argon' },
  { id: 'google/gemini-3.8-flash', name: 'Gemini 3.8 Flash' },
  { id: 'deepseek/deepseek-v4.1-flash', name: 'DeepSeek V4.1 Flash' },
  { id: 'x-ai/grok-4.7', name: 'Grok 4.7' },
  { id: 'perplexity/sonar', name: 'Perplexity Sonar' },
  { id: 'perplexity/sonar-pro', name: 'Perplexity Sonar Pro' },
] as const;

export function isAdaptiveClaude(model: string): boolean {
  return /claude-(?:sonnet|haiku|opus)-5[.-]5(?:$|-)/.test(model);
}

export function requiresAutoToolChoice(model: string): boolean {
  return isAdaptiveClaude(model) && !model.includes('haiku');
}

export function supportsSamplingTemperature(model: string): boolean {
  return !isAdaptiveClaude(model) && !/(?:^|\/)gpt-[56](?:[.-]|$)/.test(model);
}
