import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

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

export const SEARCH_MODEL = "openai/gpt-4.1"; // For search tasks still using OpenRouter
export const ANALYSIS_MODEL = "claude-3-5-sonnet-20241022"; // Using Anthropic directly

// Anthropic client for analysis tasks
export const anthropic = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
});

// OpenAI client via OpenRouter for search tasks
export const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://github.com/ozziegooen/open-annotate",
    "X-Title": "open-annotate",
  },
});

export const DEFAULT_TEMPERATURE = 0.1; // Lower temperature for more deterministic results
export const DEFAULT_TIMEOUT = 120000; // 2 minutes timeout for LLM requests

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
