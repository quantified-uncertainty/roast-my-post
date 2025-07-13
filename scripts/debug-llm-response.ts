import { anthropic, ANALYSIS_MODEL, DEFAULT_TEMPERATURE } from "../src/types/openai";

async function debugLLMResponse() {
  console.log("=== Debugging LLM Response Structure ===\n");

  const testChunk = {
    content: "This have an error and recieve is misspelled.",
    startLineNumber: 1,
    lines: ["This have an error and recieve is misspelled."]
  };

  const numberedContent = testChunk.lines
    .map((line, index) => `Line ${testChunk.startLineNumber + index}: ${line}`)
    .join("\n");

  console.log("Input content:");
  console.log(numberedContent);
  console.log("\nSending request to Claude...\n");

  try {
    const response = await anthropic.messages.create({
      model: ANALYSIS_MODEL,
      max_tokens: 2000,
      temperature: DEFAULT_TEMPERATURE,
      system: "You are a professional proofreader and grammar checker. Find spelling and grammar errors and be PRECISE in highlighting only the problematic words.",
      messages: [
        {
          role: "user",
          content: `Analyze this text for spelling/grammar errors:

${numberedContent}

For each error, highlight ONLY the problematic word(s), not entire sentences.`
        }
      ],
      tools: [
        {
          name: "report_errors",
          description: "Report spelling and grammar errors found in the text",
          input_schema: {
            type: "object",
            properties: {
              errors: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    lineStart: {
                      type: "number",
                      description: "Starting line number where the error occurs",
                    },
                    lineEnd: {
                      type: "number", 
                      description: "Ending line number where the error occurs",
                    },
                    highlightedText: {
                      type: "string",
                      description: "ONLY the problematic word(s)",
                    },
                    description: {
                      type: "string",
                      description: "Clear explanation of the error and suggested correction",
                    },
                  },
                  required: ["lineStart", "lineEnd", "highlightedText", "description"],
                },
              },
            },
            required: ["errors"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "report_errors" },
    });

    console.log("Raw response:");
    console.log(JSON.stringify(response, null, 2));

    const toolUse = response.content.find((c) => c.type === "tool_use");
    
    if (toolUse) {
      console.log("\nTool use found:");
      console.log("Name:", toolUse.name);
      console.log("Input:", JSON.stringify(toolUse.input, null, 2));
      
      if (toolUse.name === "report_errors") {
        const result = toolUse.input as any;
        if (result && Array.isArray(result.errors)) {
          console.log(`\n✓ Valid structure with ${result.errors.length} errors`);
          result.errors.forEach((error: any, i: number) => {
            console.log(`${i + 1}. Line ${error.lineStart}: "${error.highlightedText}" - ${error.description}`);
          });
        } else {
          console.log("\n❌ Invalid structure - no errors array");
          console.log("Result:", result);
        }
      }
    } else {
      console.log("\n❌ No tool use found");
      console.log("Content:", response.content);
    }

  } catch (error) {
    console.error("Error:", error);
  }
}

debugLLMResponse().catch(console.error);