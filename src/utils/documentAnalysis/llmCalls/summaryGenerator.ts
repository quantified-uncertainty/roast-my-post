import {
  ANALYSIS_MODEL,
  DEFAULT_TEMPERATURE,
  openai,
} from "../../../types/openai";

export async function generateSummary(
  thinking: any,
  comments: any[],
  targetWordCount: number
) {
  const summaryPrompt = `Based on the following analysis and comments, write a ${targetWordCount}-word summary of the document:

Analysis:
${JSON.stringify(thinking, null, 2)}

Comments:
${JSON.stringify(comments, null, 2)}

Write a ${targetWordCount}-word summary that captures the key points and insights from the analysis and comments.`;

  const response = await openai.chat.completions.create({
    model: ANALYSIS_MODEL,
    temperature: DEFAULT_TEMPERATURE,
    messages: [
      {
        role: "system",
        content:
          "You are an expert document analyst. Provide a concise, insightful summary.",
      },
      {
        role: "user",
        content: summaryPrompt,
      },
    ],
  });

  if (!response.choices[0]?.message?.content) {
    throw new Error("No response from LLM for summary");
  }

  return {
    summary: response.choices[0].message.content,
    usage: response.usage,
  };
}
