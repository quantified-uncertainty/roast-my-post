import "dotenv/config";
// Add Node shim for OpenAI library to support fetch in Node environment
import "openai/shims/node";

import OpenAI from "openai";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  throw new Error(
    "❌ Missing OpenRouter API key. Set OPENROUTER_API_KEY in .env"
  );
}

export const SEARCH_MODEL = "openai/gpt-4.1"; // "google/gemini-2.0-flash-001";
export const ANALYSIS_MODEL = SEARCH_MODEL; //"openai/gpt-4.1-mini"; //"anthropic/claude-3.7-sonnet";

export const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://github.com/ozziegooen/open-annotate",
    "X-Title": "open-annotate",
  },
});

export const DEFAULT_TEMPERATURE = 0.1; // Lower temperature for more deterministic results
