export type LLMRole = "system" | "user" | "assistant";

export interface LLMMessage {
  role: LLMRole;
  content: string;
}

export interface LLMUsage {
  input_tokens: number;
  output_tokens: number;
}

// Legacy LLMInteraction format used by some parts of the app
export interface LLMInteraction {
  messages: LLMMessage[];
  usage: LLMUsage;
}

export interface CommentLLMInteraction extends LLMInteraction {
  validCommentsCount: number;
  failedCommentsCount: number;
}

// Plugin/Tool LLMInteraction format - more detailed tracking
export interface PluginLLMInteraction {
  model: string;
  prompt: string;
  response: string;
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
  timestamp: Date;
  duration: number;
}
