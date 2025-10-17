import { NextRequest } from "next/server";
import { prisma, generateId } from '@roast/db';
import {
  parseAndExpandYaml,
  executeBulkClaimOperations,
  type SaveClaimEvaluationFn,
  analyzeClaimEvaluation,
} from '@roast/ai/server';
import type { ClaimEvaluatorOutput } from '@roast/ai/server';
import { logger as aiLogger } from '@roast/ai';
import { authenticateRequest } from "@/infrastructure/auth/auth-helpers";
import { getUserIdWithDevBypass } from "@/infrastructure/auth/dev-bypass";
import { logger } from "@/infrastructure/logging/logger";
import { errorResponse, successResponse } from "@/infrastructure/http/api-response-helpers";
import { strictRateLimit, getClientIdentifier } from "@/infrastructure/http/rate-limiter";

// Increase timeout for bulk operations with large contexts (10 minutes)
export const maxDuration = 600;

/**
 * POST /api/claim-evaluations/bulk
 *
 * Bulk create claim evaluations from YAML
 *
 * Request body:
 * - yaml: YAML string with variables, templates, and claims
 *
 * OR
 *
 * - json: Direct JSON structure (same as YAML structure)
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request);
    const { success } = await strictRateLimit.check(clientId);
    if (!success) {
      return errorResponse("Too many requests", 429);
    }

    // Authenticate request (API key first, then session) with dev bypass
    const authenticatedUserId = await authenticateRequest(request);
    const userId = await getUserIdWithDevBypass(authenticatedUserId, 'bulk claim evaluations');

    if (!userId) {
      return errorResponse("User must be logged in to run bulk claim evaluations", 401);
    }

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON in request body", 400);
    }

    if (typeof body !== 'object' || body === null) {
      return errorResponse("Request body must be an object", 400);
    }

    const bodyObj = body as Record<string, unknown>;

    // Parse YAML or JSON
    let yamlContent: string;
    if ('yaml' in bodyObj && typeof bodyObj.yaml === 'string') {
      yamlContent = bodyObj.yaml;
    } else if ('json' in bodyObj) {
      // Convert JSON structure to YAML (for consistency)
      const yaml = await import('yaml');
      yamlContent = yaml.stringify(bodyObj.json);
    } else {
      return errorResponse(
        "Request body must contain either 'yaml' (string) or 'json' (object) field",
        400
      );
    }

    // Parse and expand YAML
    let expandedClaims;
    try {
      expandedClaims = parseAndExpandYaml(yamlContent);
    } catch (error) {
      return errorResponse(
        `Failed to parse YAML: ${error instanceof Error ? error.message : String(error)}`,
        400
      );
    }

    logger.info(
      `[BulkClaimEvaluations] Processing ${expandedClaims.length} claims for user ${userId}`
    );

    // Create save function that interacts with database
    const saveClaimEvaluation: SaveClaimEvaluationFn = async (params) => {
      const evaluation = await prisma.claimEvaluation.create({
        data: {
          id: generateId(16),
          userId: params.userId,
          claim: params.claim,
          context: params.context,
          summaryMean: params.summaryMean,
          rawOutput: params.rawOutput as any,
          explanationLength: params.explanationLength,
          temperature: params.temperature,
          variationOf: params.variationOf,
          submitterNotes: params.submitterNotes,
          tags: params.tags || [],
          analysisText: params.analysisText,
          analysisGeneratedAt: params.analysisGeneratedAt,
        },
      });

      return { id: evaluation.id };
    };

    // Execute bulk operations
    const result = await executeBulkClaimOperations(
      expandedClaims,
      {
        userId,
        logger: aiLogger,
      },
      saveClaimEvaluation
    );

    logger.info(
      `[BulkClaimEvaluations] Completed: ${result.successful}/${result.total} successful`
    );

    return successResponse(result);
  } catch (error) {
    logger.error('Error in bulk claim evaluations API:', error);

    return errorResponse(
      error instanceof Error ? error.message : "Failed to process bulk claim evaluations",
      500
    );
  }
}

/**
 * GET /api/claim-evaluations/bulk/schema
 *
 * Return JSON schema for YAML bulk operations (for documentation/validation)
 */
export async function GET() {
  const schema = {
    description: "YAML structure for bulk claim evaluations",
    properties: {
      variables: {
        type: "object",
        description: "Reusable variables (use {{VAR_NAME}} syntax to reference)",
        additionalProperties: true,
      },
      templates: {
        type: "object",
        description: "Reusable claim templates",
        additionalProperties: {
          type: "object",
          properties: {
            claim: { type: "string" },
            context: { type: "string" },
            models: { type: "array", items: { type: "string" } },
            runs: { type: "number", minimum: 1, maximum: 5 },
            temperature: { type: "number", minimum: 0, maximum: 1 },
            explanationLength: { type: "number", minimum: 3, maximum: 200 },
            promptTemplate: { type: "string" },
            submitterNotes: { type: "string" },
            tags: { type: "array", items: { type: "string" } },
          },
        },
      },
      claims: {
        type: "array",
        description: "Array of claims to evaluate",
        items: {
          type: "object",
          required: ["claim"],
          properties: {
            claim: { type: "string", minLength: 1 },
            template: { type: "string", description: "Reference to template name" },
            context: { type: "string" },
            models: { type: "array", items: { type: "string" } },
            runs: { type: "number", minimum: 1, maximum: 5 },
            temperature: { type: "number", minimum: 0, maximum: 1 },
            explanationLength: { type: "number", minimum: 3, maximum: 200 },
            promptTemplate: { type: "string" },
            submitterNotes: { type: "string" },
            tags: { type: "array", items: { type: "string" } },
            variationOf: {
              description: "Index (number) or ID (string) of parent claim",
              oneOf: [{ type: "number" }, { type: "string" }],
            },
          },
        },
      },
    },
    required: ["claims"],
  };

  return successResponse(schema);
}
