import { Tool, ToolContext } from "../base/Tool";
import { z } from "zod";
import { extractUrls } from "./urlExtractor";
import { validateUrls, type LinkAnalysis } from "./urlValidator";

// Schema for the tool input
const inputSchema = z.object({
  text: z.string().describe("The text content to analyze for links"),
  maxUrls: z.number().optional().describe("Maximum number of URLs to validate (default: 20)"),
});

// Schema for the tool output
const outputSchema = z.object({
  urls: z.array(z.string()).describe("All URLs found in the text"),
  validations: z.array(z.object({
    url: z.string(),
    finalUrl: z.string().optional(),
    timestamp: z.date(),
    accessible: z.boolean(),
    error: z.object({
      type: z.string(),
      message: z.string().optional(),
      statusCode: z.number().optional(),
    }).optional(),
    details: z.object({
      contentType: z.string(),
      statusCode: z.number(),
    }).optional(),
  })).describe("Validation results for each URL"),
  summary: z.object({
    totalLinks: z.number(),
    workingLinks: z.number(),
    brokenLinks: z.number(),
    errorBreakdown: z.record(z.string(), z.number()),
  }).describe("Summary statistics of the link validation"),
});

export type LinkValidatorInput = z.infer<typeof inputSchema>;
export type LinkValidatorOutput = z.infer<typeof outputSchema>;

export class LinkValidatorTool extends Tool<LinkValidatorInput, LinkValidatorOutput> {
  config = {
    id: 'link-validator',
    name: 'Link Validator',
    description: 'Extracts and validates all URLs from a text, checking their accessibility and returning detailed validation results',
    version: '1.0.0',
    category: 'analysis' as const,
    costEstimate: 'Free (no LLM usage)',
    path: '/api/tools/link-validator',
    status: 'stable' as const
  };
  
  inputSchema = inputSchema;
  outputSchema = outputSchema as any;
  
  async execute(input: LinkValidatorInput, context: ToolContext): Promise<LinkValidatorOutput> {
    context.logger.info(`[LinkValidatorTool] Validating links in text (${input.text.length} chars)`);
    
    // Extract URLs from the text
    const urls = extractUrls(input.text, input.maxUrls || 20);
    
    // If no URLs found, return empty results
    if (urls.length === 0) {
      context.logger.info('[LinkValidatorTool] No URLs found in text');
      return {
        urls: [],
        validations: [],
        summary: {
          totalLinks: 0,
          workingLinks: 0,
          brokenLinks: 0,
          errorBreakdown: {},
        },
      };
    }
    
    context.logger.info(`[LinkValidatorTool] Found ${urls.length} URLs, validating...`);
    
    // Validate all URLs
    const validationResults = await validateUrls(
      urls.map(url => ({ url }))
    );
    
    // Transform LinkAnalysis results to our output format
    const validations = validationResults.map((result: LinkAnalysis) => ({
      url: result.url,
      finalUrl: result.finalUrl,
      timestamp: result.timestamp,
      accessible: !result.accessError,
      error: result.accessError ? {
        type: result.accessError.type,
        message: 'message' in result.accessError ? result.accessError.message : undefined,
        statusCode: 'statusCode' in result.accessError ? result.accessError.statusCode : undefined,
      } : undefined,
      details: result.linkDetails ? {
        contentType: result.linkDetails.contentType,
        statusCode: result.linkDetails.statusCode,
      } : undefined,
    }));
    
    // Calculate summary statistics
    const errorBreakdown: Record<string, number> = {};
    let workingLinks = 0;
    let brokenLinks = 0;
    
    validations.forEach(validation => {
      if (validation.accessible) {
        workingLinks++;
      } else {
        brokenLinks++;
        if (validation.error) {
          errorBreakdown[validation.error.type] = (errorBreakdown[validation.error.type] || 0) + 1;
        }
      }
    });
    
    context.logger.info(`[LinkValidatorTool] Validation complete: ${workingLinks} working, ${brokenLinks} broken`);
    
    return {
      urls,
      validations,
      summary: {
        totalLinks: urls.length,
        workingLinks,
        brokenLinks,
        errorBreakdown,
      },
    };
  }
}

// Export singleton instance
export const linkValidator = new LinkValidatorTool();

// Also export as default for consistency with other tools
export default linkValidator;

// Export utility functions for advanced usage
export { extractUrls } from './urlExtractor';
export { validateUrl, validateUrls, type LinkAnalysis, type AccessError } from './urlValidator';
export { 
  generateLinkHighlights, 
  findUrlPosition, 
  formatUrlForDisplay 
} from './linkHighlightGenerator';
export { 
  generateLinkAnalysisAndSummary,
  generateLinkAnalysisReport,
  generateNoLinksReport,
  calculateLinkMetrics,
  calculateLinkGradeFromMetrics,
  type LinkMetrics
} from './linkAnalysisReporter';