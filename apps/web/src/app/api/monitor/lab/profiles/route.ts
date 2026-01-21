import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/infrastructure/logging/logger";
import { authenticateRequest } from "@/infrastructure/auth/auth-helpers";
import { commonErrors } from "@/infrastructure/http/api-response-helpers";
import { isAdmin } from "@/infrastructure/auth/auth";
import { prisma } from "@roast/db";

/**
 * GET /api/monitor/lab/profiles
 * List all profiles for an agent
 */
export async function GET(request: NextRequest) {
  const userId = await authenticateRequest(request);
  if (!userId) return commonErrors.unauthorized();

  const adminCheck = await isAdmin();
  if (!adminCheck) return commonErrors.forbidden();

  const agentId = request.nextUrl.searchParams.get("agentId");
  if (!agentId) {
    return NextResponse.json({ error: "agentId is required" }, { status: 400 });
  }

  try {
    const profiles = await prisma.fallacyCheckerProfile.findMany({
      where: { agentId },
      orderBy: [
        { isDefault: "desc" },
        { name: "asc" },
      ],
    });

    return NextResponse.json({ profiles });
  } catch (error) {
    logger.error("Error fetching profiles:", error);
    return commonErrors.serverError("Failed to fetch profiles");
  }
}

/**
 * POST /api/monitor/lab/profiles
 * Create a new profile
 */
export async function POST(request: NextRequest) {
  const userId = await authenticateRequest(request);
  if (!userId) return commonErrors.unauthorized();

  const adminCheck = await isAdmin();
  if (!adminCheck) return commonErrors.forbidden();

  try {
    const body = await request.json();
    const { name, description, agentId, config, isDefault } = body;

    if (!name || !agentId) {
      return NextResponse.json(
        { error: "name and agentId are required" },
        { status: 400 }
      );
    }

    // Check for duplicate name
    const existing = await prisma.fallacyCheckerProfile.findFirst({
      where: { agentId, name },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A profile with this name already exists" },
        { status: 400 }
      );
    }

    // If setting as default, unset other defaults first
    if (isDefault) {
      await prisma.fallacyCheckerProfile.updateMany({
        where: { agentId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const profile = await prisma.fallacyCheckerProfile.create({
      data: {
        name,
        description: description ?? null,
        agentId,
        config: config ?? getDefaultConfig(),
        isDefault: isDefault ?? false,
      },
    });

    logger.info("Profile created", { profileId: profile.id, name, agentId });

    return NextResponse.json({ profile });
  } catch (error) {
    logger.error("Error creating profile:", error);
    return commonErrors.serverError("Failed to create profile");
  }
}

/**
 * Default profile configuration - matches the real fallacy checker defaults
 * Uses the NEW filterChain array format (not the old { filters: [...] } format)
 */
function getDefaultConfig() {
  return {
    version: 1,
    models: {
      extractors: [
        { model: "claude-sonnet-4-5-20250929", temperature: 0, thinking: false },
        { model: "google/gemini-3-flash-preview", temperature: "default", thinking: true },
        { model: "google/gemini-2.5-flash", temperature: "default", thinking: true },
      ],
      judge: {
        model: "claude-sonnet-4-5-20250929",
        enabled: false,
      },
    },
    thresholds: {
      minSeverityThreshold: 60,
      maxIssues: 15,
      dedupThreshold: 0.7,
      maxIssuesToProcess: 25,
    },
    filterChain: [
      {
        id: "default-supported-elsewhere",
        type: "supported-elsewhere",
        enabled: true,
        model: "claude-sonnet-4-5-20250929",
        temperature: 0.1,
      },
    ],
  };
}
