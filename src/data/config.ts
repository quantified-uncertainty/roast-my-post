import 'dotenv/config';

import OpenAI from 'openai';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  throw new Error(
    "❌ Missing OpenRouter API key. Set OPENROUTER_API_KEY in .env"
  );
}

// export const MODEL = "anthropic/claude-3.7-sonnet";
export const MODEL = "google/gemini-2.5-pro-exp-03-25:free";

export const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://github.com/OAGr/content-evaluation-experiment",
    "X-Title": "content-evaluation-experiment",
  },
});

export const DEFAULT_TEMPERATURE = 0.7;
