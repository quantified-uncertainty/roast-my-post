import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { authenticateRequest } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse, commonErrors } from "@/lib/api-response-helpers";
import { GitHubAgentImporter, verifyAgentConfig } from "@/lib/agentImport";

const importRequestSchema = z.object({
  githubUrl: z.string().url().refine(
    (url) => url.includes('github.com'),
    { message: 'Must be a GitHub URL' }
  ),
});

export async function POST(request: NextRequest) {
  try {
    // Authenticate request
    const userId = await authenticateRequest(request);
    if (!userId) {
      return commonErrors.unauthorized();
    }

    // Parse and validate request body
    const body = await request.json();
    const parseResult = importRequestSchema.safeParse(body);
    
    if (!parseResult.success) {
      return NextResponse.json(
        { 
          error: "Invalid request", 
          errors: parseResult.error.errors 
        },
        { status: 400 }
      );
    }

    const { githubUrl } = parseResult.data;

    // Import from GitHub
    let agentConfig;
    try {
      const importer = new GitHubAgentImporter(githubUrl);
      agentConfig = await importer.importAgent();
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : "Failed to import from GitHub",
        400
      );
    }

    // Verify the configuration
    const verification = verifyAgentConfig(agentConfig);
    if (!verification.valid) {
      return NextResponse.json(
        { 
          error: "Agent configuration is invalid", 
          errors: verification.errors 
        },
        { status: 400 }
      );
    }

    // Create the agent in the database
    const agent = await prisma.agent.create({
      data: {
        id: nanoid(16),
        submittedById: userId,
        versions: {
          create: {
            version: 1,
            name: agentConfig.name,
            description: agentConfig.description,
            primaryInstructions: agentConfig.primaryInstructions,
            selfCritiqueInstructions: agentConfig.selfCritiqueInstructions || null,
            providesGrades: agentConfig.providesGrades,
            extendedCapabilityId: agentConfig.extendedCapabilityId || null,
            readme: agentConfig.readme || null,
            githubUrl: githubUrl,
          },
        },
      },
    });

    return successResponse({
      agentId: agent.id,
      warnings: verification.warnings,
      info: verification.info,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: "Validation error", 
          errors: error.errors 
        },
        { status: 400 }
      );
    }

    // Check for unique constraint violation
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return errorResponse(
        "An agent with this ID already exists. Please use a different name.",
        409
      );
    }

    // Log error for debugging but don't expose internal details
    return errorResponse(
      "Failed to import agent",
      500
    );
  }
}