export type LLMRole = "system" | "user" | "assistant";

export interface LLMMessage {
  role: LLMRole;
  content: string;
}

export interface LLMUsage {
  input_tokens: number;
  output_tokens: number;
}

export interface LLMInteraction {
  messages: LLMMessage[];
  usage: LLMUsage;
}

export interface CommentLLMInteraction extends LLMInteraction {
  validCommentsCount: number;
  failedCommentsCount: number;
}
