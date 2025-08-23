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
    severity: z.enum(["success", "warning", "error"]).describe("Severity of the validation result"),
    validationMethod: z.enum(["LessWrong GraphQL API", "EA Forum GraphQL API", "HTTP Request"]).describe("Method used to validate the URL"),
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
    warningLinks: z.number(),
    errorBreakdown: z.record(z.string(), z.number()),
    methodsUsed: z.record(z.string(), z.number()).describe("Count of validation methods used"),
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
    path: '/tools/link-validator',
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
          warningLinks: 0,
          errorBreakdown: {},
          methodsUsed: {},
        },
      };
    }
    
    context.logger.info(`[LinkValidatorTool] Found ${urls.length} URLs, validating...`);
    
    // Validate all URLs
    const validationResults = await validateUrls(
      urls.map(url => ({ url }))
    );
    
    // Transform LinkAnalysis results to our output format
    const validations = validationResults.map((result: LinkAnalysis) => {
      // Determine severity based on error type
      let severity: "success" | "warning" | "error" = "success";
      if (result.accessError) {
        // Treat 403 Forbidden and rate limiting as warnings (site exists but blocks access)
        if (result.accessError.type === "Forbidden" || result.accessError.type === "RateLimited") {
          severity = "warning";
        } else {
          // Treat 404, network errors, timeouts as errors (site likely doesn't exist or is broken)
          severity = "error";
        }
      }
      
      return {
        url: result.url,
        finalUrl: result.finalUrl,
        timestamp: result.timestamp,
        accessible: !result.accessError,
        severity,
        validationMethod: result.validationMethod,
        error: result.accessError ? {
          type: result.accessError.type,
          message: 'message' in result.accessError ? result.accessError.message : undefined,
          statusCode: 'statusCode' in result.accessError ? result.accessError.statusCode : undefined,
        } : undefined,
        details: result.linkDetails ? {
          contentType: result.linkDetails.contentType,
          statusCode: result.linkDetails.statusCode,
        } : undefined,
      };
    });
    
    // Calculate summary statistics
    const errorBreakdown: Record<string, number> = {};
    const methodsUsed: Record<string, number> = {};
    let workingLinks = 0;
    let brokenLinks = 0;
    let warningLinks = 0;
    
    validations.forEach(validation => {
      if (validation.severity === "success") {
        workingLinks++;
      } else if (validation.severity === "warning") {
        warningLinks++;
        if (validation.error) {
          errorBreakdown[validation.error.type] = (errorBreakdown[validation.error.type] || 0) + 1;
        }
      } else {
        brokenLinks++;
        if (validation.error) {
          errorBreakdown[validation.error.type] = (errorBreakdown[validation.error.type] || 0) + 1;
        }
      }
      // Track validation methods used
      methodsUsed[validation.validationMethod] = (methodsUsed[validation.validationMethod] || 0) + 1;
    });
    
    context.logger.info(`[LinkValidatorTool] Validation complete: ${workingLinks} working, ${warningLinks} warnings, ${brokenLinks} broken`);
    
    return {
      urls,
      validations,
      summary: {
        totalLinks: urls.length,
        workingLinks,
        brokenLinks,
        warningLinks,
        errorBreakdown,
        methodsUsed,
      },
    };
  }
}

// Export singleton instance
export const linkValidator = new LinkValidatorTool();

// Also export as default for consistency with other tools
export default linkValidator;

// Export utility functions for advanced usage
export { extractUrls, extractUrlsWithPositions, type ExtractedUrl } from './urlExtractor';
export { validateUrl, validateUrls, type LinkAnalysis, type AccessError } from './urlValidator';
export { 
  generateLinkHighlights,
  generateLinkHighlightsLegacy,
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