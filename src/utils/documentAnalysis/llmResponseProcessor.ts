import { z } from "zod";

export interface LLMProcessor<T> {
  parseResponse(raw: string): unknown;
  validateResponse(parsed: unknown): T;
}

export class BaseLLMProcessor<T> implements LLMProcessor<T> {
  constructor(private schema: z.ZodSchema<T>) {}

  parseResponse(raw: string): unknown {
    // First try to find a JSON object in the content
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(
        `Failed to find JSON object in LLM response. Raw content: ${raw}`
      );
    }

    // Clean the JSON string
    let jsonString = jsonMatch[0]
      .replace(/^```json\n?|\n?```$/g, "") // Remove markdown code fences
      .replace(/\\n/g, "\n") // Convert escaped newlines
      .replace(/\\"/g, '"') // Convert escaped quotes
      .trim();

    try {
      return JSON.parse(jsonString);
    } catch (jsonError) {
      throw new Error(`Failed to parse LLM response JSON. Raw content: ${raw}`);
    }
  }

  validateResponse(parsed: unknown): T {
    const validationResult = this.schema.safeParse(parsed);
    if (!validationResult.success) {
      throw new Error(
        `LLM response JSON failed schema validation: ${validationResult.error.flatten()}`
      );
    }
    return validationResult.data;
  }

  processResponse(raw: string): T {
    const parsed = this.parseResponse(raw);
    return this.validateResponse(parsed);
  }
}

// Pre-process function for common data transformations
export function preprocessCommentData(comments: any[]): any[] {
  return comments.map((comment: any) => {
    // Ensure 'importance' is a number
    if (
      comment.importance !== undefined &&
      typeof comment.importance === "string"
    ) {
      const parsedImportance = parseInt(comment.importance, 10);
      comment.importance = isNaN(parsedImportance)
        ? comment.importance
        : parsedImportance;
    }

    // Pre-process grade as well
    if (comment.grade !== undefined && typeof comment.grade === "string") {
      const parsedGrade = parseInt(comment.grade, 10);
      comment.grade = isNaN(parsedGrade) ? comment.grade : parsedGrade;
    }

    return comment;
  });
}
