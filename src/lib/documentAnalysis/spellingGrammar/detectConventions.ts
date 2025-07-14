import { anthropic, ANALYSIS_MODEL, DEFAULT_TEMPERATURE } from "../../../types/openai";
import { logger } from "@/lib/logger";
import { LOG_PREFIXES } from "./constants";

export interface DocumentConventions {
  language: 'US' | 'UK' | 'mixed' | 'unknown';
  documentType: 'academic' | 'blog' | 'technical' | 'casual' | 'unknown';
  formality: 'formal' | 'informal' | 'mixed';
  examples: string[];
}

export interface ConventionDetectionResult {
  conventions: DocumentConventions;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Detects the language convention and document type from a sample of text
 */
export async function detectDocumentConventions(
  content: string,
  sampleSize: number = 2000
): Promise<ConventionDetectionResult> {
  // Take a sample from the beginning of the document
  const sample = content.slice(0, sampleSize);
  
  // If sample is too short, return defaults
  if (sample.length < 100) {
    return {
      conventions: {
        language: 'unknown',
        documentType: 'unknown',
        formality: 'mixed',
        examples: []
      },
      usage: { input_tokens: 0, output_tokens: 0 }
    };
  }

  const systemPrompt = `You are a linguistics expert who identifies language conventions and document types.

Your task is to analyze a text sample and determine:
1. Whether it uses US English, UK English, mixed conventions, or unknown
2. The type of document (academic, blog post, technical documentation, casual writing)
3. The formality level (formal, informal, mixed)

Focus on:
- Spelling patterns (color/colour, organize/organise, etc.)
- Vocabulary choices
- Sentence structure and tone
- Technical vs casual language
- Presence of citations or formal structure`;

  const userPrompt = `Analyze this text sample and identify the language conventions and document type:

${sample}

Look for:
- Spelling conventions (US vs UK)
- Document formality and type
- Writing style indicators

Provide specific examples from the text that support your conclusions.`;

  try {
    const response = await anthropic.messages.create({
      model: ANALYSIS_MODEL,
      max_tokens: 1000,
      temperature: DEFAULT_TEMPERATURE,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
      tools: [
        {
          name: "report_conventions",
          description: "Report the detected language conventions and document type",
          input_schema: {
            type: "object",
            properties: {
              language: {
                type: "string",
                enum: ["US", "UK", "mixed", "unknown"],
                description: "The detected spelling convention"
              },
              documentType: {
                type: "string",
                enum: ["academic", "blog", "technical", "casual", "unknown"],
                description: "The type of document"
              },
              formality: {
                type: "string",
                enum: ["formal", "informal", "mixed"],
                description: "The formality level of the writing"
              },
              examples: {
                type: "array",
                items: {
                  type: "string"
                },
                description: "Specific examples from the text supporting the conclusions"
              },
              reasoning: {
                type: "string",
                description: "Brief explanation of the detection logic"
              }
            },
            required: ["language", "documentType", "formality", "examples", "reasoning"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "report_conventions" },
    });

    const toolUse = response.content.find((c) => c.type === "tool_use");
    if (!toolUse || toolUse.name !== "report_conventions") {
      logger.error(`${LOG_PREFIXES.WORKFLOW} No tool use response from convention detection`);
      return {
        conventions: {
          language: 'unknown',
          documentType: 'unknown',
          formality: 'mixed',
          examples: []
        },
        usage: response.usage
      };
    }

    const result = toolUse.input as {
      language: 'US' | 'UK' | 'mixed' | 'unknown';
      documentType: 'academic' | 'blog' | 'technical' | 'casual' | 'unknown';
      formality: 'formal' | 'informal' | 'mixed';
      examples: string[];
      reasoning: string;
    };
    logger.info(`${LOG_PREFIXES.WORKFLOW} Detected conventions`, {
      language: `${result.language} English`,
      documentType: result.documentType,
      formality: result.formality,
      reasoning: result.reasoning,
      exampleCount: result.examples.length
    });

    return {
      conventions: {
        language: result.language,
        documentType: result.documentType,
        formality: result.formality,
        examples: result.examples
      },
      usage: response.usage
    };

  } catch (error) {
    logger.error(`${LOG_PREFIXES.ERROR} Failed to detect document conventions`, { error });
    // Return sensible defaults on error
    return {
      conventions: {
        language: 'unknown',
        documentType: 'unknown', 
        formality: 'mixed',
        examples: []
      },
      usage: { input_tokens: 0, output_tokens: 0 }
    };
  }
}