import "dotenv/config";

import OpenAI from "openai";

import Anthropic from "@anthropic-ai/sdk";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!ANTHROPIC_API_KEY) {
  throw new Error(
    "❌ Missing Anthropic API key. Set ANTHROPIC_API_KEY in .env"
  );
}

if (!OPENROUTER_API_KEY) {
  throw new Error(
    "❌ Missing OpenRouter API key. Set OPENROUTER_API_KEY in .env"
  );
}

export const SEARCH_MODEL = process.env.SEARCH_MODEL || "openai/gpt-4.1"; // For search tasks still using OpenRouter
export const ANALYSIS_MODEL = process.env.ANALYSIS_MODEL || "claude-sonnet-4-20250514"; // Using Anthropic directly

// Anthropic client for analysis tasks
export const anthropic = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
});

// OpenAI client via OpenRouter for search tasks
export const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://github.com/ozziegooen/roast-my-post",
    "X-Title": "roast-my-post",
  },
});

export const DEFAULT_TEMPERATURE = 0.1; // Lower temperature for more deterministic results
export const DEFAULT_TIMEOUT = 300000; // 5 minutes default timeout for LLM requests

// Configurable timeouts via environment variables
export const COMPREHENSIVE_ANALYSIS_TIMEOUT = parseInt(process.env.COMPREHENSIVE_ANALYSIS_TIMEOUT || '600000'); // 10 minutes
export const COMMENT_EXTRACTION_TIMEOUT = parseInt(process.env.COMMENT_EXTRACTION_TIMEOUT || '300000'); // 5 minutes
export const SELF_CRITIQUE_TIMEOUT = parseInt(process.env.SELF_CRITIQUE_TIMEOUT || '180000'); // 3 minutes

// Helper function to add timeout to Anthropic requests
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = DEFAULT_TIMEOUT,
  errorMessage: string = "Request timed out"
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}
