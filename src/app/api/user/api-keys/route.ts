import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateApiKey, hashApiKey } from "@/lib/crypto";
import { z } from "zod";

// GET /api/user/api-keys - List user's API keys
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKeys = await prisma.apiKey.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        name: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ apiKeys });
  } catch (error) {
    console.error("Error fetching API keys:", error);
    return NextResponse.json(
      { error: "Failed to fetch API keys" },
      { status: 500 }
    );
  }
}

// Input validation schema
const createApiKeySchema = z.object({
  name: z.string().min(1).max(50),
  expiresIn: z.number().int().positive().max(365).optional(),
});

// POST /api/user/api-keys - Create a new API key
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check API key limit (max 10 per user)
    const keyCount = await prisma.apiKey.count({
      where: { userId: session.user.id }
    });
    
    if (keyCount >= 10) {
      return NextResponse.json(
        { error: "Maximum API key limit reached (10 keys)" },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    // Validate input
    const validatedData = createApiKeySchema.parse(body);
    const { name, expiresIn } = validatedData;

    // Generate a secure API key
    const plainKey = generateApiKey();
    const hashedKey = hashApiKey(plainKey);

    // Calculate expiration date if provided (in days)
    let expiresAt = null;
    if (expiresIn) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresIn);
    }

    const apiKey = await prisma.apiKey.create({
      data: {
        key: hashedKey, // Store the hashed version
        name,
        userId: session.user.id,
        expiresAt,
      },
    });

    // Return the plain key only once (user must save it)
    return NextResponse.json({
      apiKey: {
        id: apiKey.id,
        key: plainKey, // Return the plain key, not the hash
        name: apiKey.name,
        createdAt: apiKey.createdAt,
        expiresAt: apiKey.expiresAt,
      },
      message: "Save this API key securely. You won't be able to see it again.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }
    
    console.error("Error creating API key:", error);
    return NextResponse.json(
      { error: "Failed to create API key" },
      { status: 500 }
    );
  }
}

