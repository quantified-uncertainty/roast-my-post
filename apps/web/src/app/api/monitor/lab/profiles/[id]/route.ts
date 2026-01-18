import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/infrastructure/logging/logger";
import { authenticateRequest } from "@/infrastructure/auth/auth-helpers";
import { commonErrors } from "@/infrastructure/http/api-response-helpers";
import { isAdmin } from "@/infrastructure/auth/auth";
import { prisma } from "@roast/db";

/**
 * GET /api/monitor/lab/profiles/[id]
 * Get a single profile by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await authenticateRequest(request);
  if (!userId) return commonErrors.unauthorized();

  const adminCheck = await isAdmin();
  if (!adminCheck) return commonErrors.forbidden();

  const { id } = await params;

  try {
    const body = await request.json();
    const { name, description, config, isDefault } = body;

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
  { params }: { params: Promise<{ id: string }> }
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
