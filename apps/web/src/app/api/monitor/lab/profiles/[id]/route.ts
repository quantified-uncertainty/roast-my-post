import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/infrastructure/logging/logger";
import { authenticateRequest } from "@/infrastructure/auth/auth-helpers";
import { commonErrors } from "@/infrastructure/http/api-response-helpers";
import { isAdmin } from "@/infrastructure/auth/auth";
import { prisma } from "@roast/db";
import type { RouteIdParams } from "../../types";

// ============================================================================
// Profile Config Zod Schemas
// ============================================================================

const reasoningEffortSchema = z.enum(['none', 'minimal', 'low', 'medium', 'high', 'xhigh']);

const reasoningConfigSchema = z.union([
  z.literal(false),
  z.object({ effort: reasoningEffortSchema }),
  z.object({ budget_tokens: z.number().min(1024) }),
]);

const providerPreferencesSchema = z.object({
  order: z.array(z.string()).optional(),
  allow_fallbacks: z.boolean().optional(),
}).optional();

const extractorConfigSchema = z.object({
  model: z.string().min(1),
  temperature: z.union([z.number(), z.literal('default')]).optional(),
  label: z.string().optional(),
  thinking: z.boolean().optional(),
  reasoning: reasoningConfigSchema.optional(),
  provider: providerPreferencesSchema,
});

const judgeConfigSchema = z.object({
  model: z.string().min(1),
  temperature: z.union([z.number(), z.literal('default')]).optional(),
  thinking: z.boolean().optional(),
  reasoning: reasoningConfigSchema.optional(),
  provider: providerPreferencesSchema,
  enabled: z.boolean(),
});

const thresholdConfigSchema = z.object({
  minSeverityThreshold: z.number().min(0).max(100),
  maxIssues: z.number().min(1).max(100),
  dedupThreshold: z.number().min(0).max(1),
  maxIssuesToProcess: z.number().min(1).max(100),
});

const promptConfigSchema = z.object({
  extractorSystemPrompt: z.string().optional(),
  extractorUserPrompt: z.string().optional(),
  judgeSystemPrompt: z.string().optional(),
  reviewSystemPrompt: z.string().optional(),
}).optional();

const filterTypeSchema = z.enum([
  'dedup', 'principle-of-charity', 'supported-elsewhere', 'severity', 'confidence', 'review'
]);

const baseFilterSchema = z.object({
  id: z.string(),
  type: filterTypeSchema,
  enabled: z.boolean(),
});

const filterChainItemSchema = baseFilterSchema.and(
  z.object({
    model: z.string().optional(),
    temperature: z.union([z.number(), z.literal('default')]).optional(),
    reasoning: reasoningConfigSchema.optional(),
    provider: providerPreferencesSchema,
    customPrompt: z.string().optional(),
    minSeverity: z.number().optional(),
    minConfidence: z.number().optional(),
  }).partial()
);

const profileConfigSchema = z.object({
  version: z.literal(1),
  models: z.object({
    extractors: z.array(extractorConfigSchema).min(1),
    judge: judgeConfigSchema,
  }),
  thresholds: thresholdConfigSchema,
  prompts: promptConfigSchema,
  filterChain: z.array(filterChainItemSchema),
});

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  config: profileConfigSchema.optional(),
  isDefault: z.boolean().optional(),
});

/**
 * GET /api/monitor/lab/profiles/[id]
 * Get a single profile by ID
 */
export async function GET(
  request: NextRequest,
  { params }: RouteIdParams
) {
  const userId = await authenticateRequest(request);
  if (!userId) return commonErrors.unauthorized();

  const adminCheck = await isAdmin();
  if (!adminCheck) return commonErrors.forbidden();

  const { id } = await params;

  try {
    const profile = await prisma.fallacyCheckerProfile.findUnique({
      where: { id },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    logger.error("Error fetching profile:", error);
    return commonErrors.serverError("Failed to fetch profile");
  }
}

/**
 * PUT /api/monitor/lab/profiles/[id]
 * Update a profile
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteIdParams
) {
  const userId = await authenticateRequest(request);
  if (!userId) return commonErrors.unauthorized();

  const adminCheck = await isAdmin();
  if (!adminCheck) return commonErrors.forbidden();

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { name, description, config, isDefault } = parsed.data;

    // Check profile exists
    const existing = await prisma.fallacyCheckerProfile.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Check for duplicate name (excluding current profile)
    if (name && name !== existing.name) {
      const duplicate = await prisma.fallacyCheckerProfile.findFirst({
        where: {
          agentId: existing.agentId,
          name,
          id: { not: id },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: "A profile with this name already exists" },
          { status: 400 }
        );
      }
    }

    // If setting as default, unset other defaults first
    if (isDefault && !existing.isDefault) {
      await prisma.fallacyCheckerProfile.updateMany({
        where: { agentId: existing.agentId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const profile = await prisma.fallacyCheckerProfile.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(config !== undefined && { config }),
        ...(isDefault !== undefined && { isDefault }),
      },
    });

    logger.info("Profile updated", { profileId: id });

    return NextResponse.json({ profile });
  } catch (error) {
    logger.error("Error updating profile:", error);
    return commonErrors.serverError("Failed to update profile");
  }
}

/**
 * DELETE /api/monitor/lab/profiles/[id]
 * Delete a profile
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteIdParams
) {
  const userId = await authenticateRequest(request);
  if (!userId) return commonErrors.unauthorized();

  const adminCheck = await isAdmin();
  if (!adminCheck) return commonErrors.forbidden();

  const { id } = await params;

  try {
    const existing = await prisma.fallacyCheckerProfile.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    await prisma.fallacyCheckerProfile.delete({
      where: { id },
    });

    logger.info("Profile deleted", { profileId: id });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting profile:", error);
    return commonErrors.serverError("Failed to delete profile");
  }
}
