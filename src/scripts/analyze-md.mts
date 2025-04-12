#!/usr/bin/env ts-node-esm

import 'dotenv/config';

import axios from 'axios';
import { Command } from 'commander';
import {
  readFile,
  writeFile,
} from 'fs/promises';
import path from 'path';

const program = new Command();

program
  .name("analyze-md")
  .description(
    "Use OpenRouter to analyze a markdown file and output structured JSON"
  )
  .requiredOption("-i, --input <path>", "Input markdown file")
  .requiredOption("-o, --output <path>", "Output JSON file")
  .parse(process.argv);

const options = program.opts();

const OPENROUTER_API_KEY = options.apikey || process.env.OPENROUTER_API_KEY;
if (!OPENROUTER_API_KEY) {
  console.error(
    "❌ Missing OpenRouter API key. Use --apikey or set OPENROUTER_API_KEY."
  );
  process.exit(1);
}

const MODEL = "openai/gpt-4-1106-preview"; // change if needed

async function main() {
  const markdown = await readFile(options.input, "utf-8");
  const basename = path.basename(options.input, ".md");

  const prompt = `
You're an expert analyst generating structured risk evaluations. Given the following Markdown document, output a single review in JSON like this:

{
  "agentId": "factual-validator",
  "analysis": "[~700 words of structured, quantitative analysis]",
  "costInCents": 200,
  "createdAt": "2025-04-12",
  "comments": {
    "1": {
      "title": "...",
      "description": "...",
      "highlight": {
        "startOffset": ###,
        "endOffset": ###,
        "prefix": "..."
      }
    }
  }
}

Here is the Markdown:

\`\`\`markdown
${markdown}
\`\`\`
`;

  const response = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    },
    {
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  const llmResponse = response.data.choices[0].message.content;

  // Clean up the response by removing markdown code block syntax
  const cleanedResponse = llmResponse
    .replace(/```json\n?/g, "") // Remove opening ```json
    .replace(/```\n?/g, "") // Remove closing ```
    .trim(); // Remove any extra whitespace

  const fullJson = {
    id: basename,
    slug: basename,
    title: "Generated Title",
    author: "LLM System",
    publishedDate: new Date().toISOString().split("T")[0],
    content: markdown,
    reviews: [JSON.parse(cleanedResponse)],
  };

  await writeFile(options.output, JSON.stringify(fullJson, null, 2), "utf-8");
  console.log(`✅ Output written to ${options.output}`);
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
