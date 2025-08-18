import type { Comment } from "../../../shared/types";
import type { LLMUsage } from "../../../types";
import type { LineBasedLocation } from "../../../text-location/line-based";

// Response from Anthropic API
export interface RawLLMHighlight {
  description: string;
  highlight: LineBasedLocation;
  importance?: number;
  grade?: number;
}

// Validated highlight with line-based highlight
export interface LineBasedHighlight {
  description: string;
  importance: number;
  grade?: number;
  highlight: LineBasedLocation;
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

