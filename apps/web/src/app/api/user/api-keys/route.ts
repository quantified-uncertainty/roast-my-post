import { NextRequest, NextResponse } from "next/server";
import { authenticateRequestSessionFirst } from "@/infrastructure/auth/auth-helpers";
import { prisma } from "@roast/db";
import { logger } from "@/infrastructure/logging/logger";
import { generateApiKey, hashApiKey } from "@/shared/utils/crypto";

export async function GET(request: NextRequest) {
  const userId = await authenticateRequestSessionFirst(request);
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const apiKeys = await prisma.apiKey.findMany({
      where: {
        userId: userId,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ apiKeys });
  } catch (error) {
    logger.error('Error fetching API keys', error, {
      endpoint: '/api/user/api-keys',
      userId,
    });
    return NextResponse.json(
      { error: "Failed to fetch API keys" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const userId = await authenticateRequestSessionFirst(request);
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, expiresIn } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // Generate a secure API key
    const key = generateApiKey();
    const hashedKey = hashApiKey(key);

    // Calculate expiration date if provided
    let expiresAt = null;
    if (expiresIn && typeof expiresIn === 'number') {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresIn);
    }

    const apiKey = await prisma.apiKey.create({
      data: {
        key: hashedKey,
        name,
        userId: userId,
        expiresAt,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    return NextResponse.json({ 
      apiKey: {
        ...apiKey,
        key, // Return the unhashed key only on creation
      }
    });
  } catch (error) {
    logger.error('Error creating API key', error, {
      endpoint: '/api/user/api-keys',
      method: 'POST',
      userId,
    });
    return NextResponse.json(
      { error: "Failed to create API key" },
      { status: 500 }
    );
  }
}