import { Anthropic } from "@anthropic-ai/sdk";
import { z } from "zod";

// Schema for the validation result
export const UrlValidationResultSchema = z.object({
  doesExist: z.boolean(),
  correctlyCited: z.boolean(),
  message: z.string().optional(),
});

export type UrlValidationResult = z.infer<typeof UrlValidationResultSchema>;

// Schema for the input
export const UrlValidationInputSchema = z.object({
  url: z.string().url(),
  usageContext: z.string().describe("Description of how the URL is being used or what it's supposed to reference"),
});

export type UrlValidationInput = z.infer<typeof UrlValidationInputSchema>;

async function checkUrlExists(url: string): Promise<{ exists: boolean; status?: number; finalUrl?: string; error?: string }> {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LinkValidator/1.0)",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });
    
    return {
      exists: response.ok || response.status < 400,
      status: response.status,
      finalUrl: response.url, // After redirects
    };
  } catch (error) {
    return {
      exists: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function validateUrl(
  input: UrlValidationInput,
  anthropicApiKey: string
): Promise<UrlValidationResult> {
  const anthropic = new Anthropic({
    apiKey: anthropicApiKey,
  });

  // First, check if the URL exists
  const urlCheck = await checkUrlExists(input.url);
  const doesExist = urlCheck.exists;

  // Now use Claude to analyze the results
  const systemPrompt = `You are a URL validation expert. Analyze the URL validation results and provide a JSON response.

Your response must be valid JSON in this exact format:
{
  "correctlyCited": boolean,
  "message": "string explaining the validation result"
}`;

  const userPrompt = `Validate this URL citation:
URL: ${input.url}
Usage Context: ${input.usageContext}
URL Exists: ${doesExist}
${urlCheck.finalUrl && urlCheck.finalUrl !== input.url ? `Redirects to: ${urlCheck.finalUrl}` : ''}
${urlCheck.error ? `Error: ${urlCheck.error}` : ''}

Analyze:
1. If the URL exists, does it correctly match the usage context?
2. If it doesn't exist, explain why this is problematic
3. Provide a clear, concise message explaining your findings

Consider:
- Domain authenticity and plausibility
- Contextual appropriateness 
- Common hallucination patterns (made-up domains, incorrect TLDs, etc.)
- Temporal accuracy (are dates/years appropriate?)
- Whether the URL structure makes sense for the claimed content`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 500,
      temperature: 0,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    // Extract JSON from Claude's response
    const responseText = response.content[0].type === "text" 
      ? response.content[0].text 
      : "{}";
    
    // Try to find JSON in the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }
    
    const analysis = JSON.parse(jsonMatch[0]);
    
    return {
      doesExist,
      correctlyCited: analysis.correctlyCited || false,
      message: analysis.message,
    };
  } catch (error) {
    console.error("Error analyzing URL:", error);
    
    // Fallback response
    return {
      doesExist,
      correctlyCited: doesExist,
      message: doesExist 
        ? "URL exists but could not verify if it matches the usage context"
        : "URL does not exist",
    };
  }
}

// Convenience function for validating multiple URLs
export async function validateUrls(
  inputs: UrlValidationInput[],
  anthropicApiKey: string
): Promise<UrlValidationResult[]> {
  // Process in batches to avoid rate limits
  const batchSize = 5;
  const results: UrlValidationResult[] = [];
  
  for (let i = 0; i < inputs.length; i += batchSize) {
    const batch = inputs.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(input => validateUrl(input, anthropicApiKey))
    );
    results.push(...batchResults);
    
    // Add a small delay between batches to respect rate limits
    if (i + batchSize < inputs.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}