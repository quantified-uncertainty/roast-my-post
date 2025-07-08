import type { Comment } from "../../../types/documentSchema";
import type { LLMUsage } from "../../../types/llm";
import type { LineSnippetHighlight } from "./lineBasedHighlighter";

// Response from Anthropic API
export interface RawLLMHighlight {
  description: string;
  highlight: LineSnippetHighlight;
  importance?: number;
  grade?: number;
}

// Validated highlight with line-based highlight
export interface LineBasedHighlight {
  description: string;
  title?: string;
  observation?: string;
  significance?: string;
  importance: number;
  grade?: number;
  highlight: LineSnippetHighlight;
}

// Anthropic API response structure
export interface AnthropicResponse {
  content: Array<{
    type: string;
    name?: string;
    input?: any;
  }>;
  usage: LLMUsage;
}

// Tool response structure
export interface HighlightToolResponse {
  highlights: RawLLMHighlight[];
}

