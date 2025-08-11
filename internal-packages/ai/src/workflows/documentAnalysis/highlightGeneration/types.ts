import type { Comment } from "@roast/ai";
import type { LLMUsage } from "@roast/ai";
import type { LineSnippetHighlight } from "@roast/ai/text-location/line-based";

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

