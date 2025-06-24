import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { hashApiKey } from "@/lib/crypto";

export async function authenticateApiKey(request: NextRequest): Promise<{ userId: string } | null> {
  const authHeader = request.headers.get("authorization");
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  
  const plainKey = authHeader.substring(7); // Remove "Bearer " prefix
  
  // Basic format validation
  if (!plainKey.startsWith("oa_") || plainKey.length < 40) {
    return null;
  }
  
  try {
    // Hash the provided key to compare with stored hash
    const hashedKey = hashApiKey(plainKey);
    
    const key = await prisma.apiKey.findUnique({
      where: { key: hashedKey },
      include: { user: true },
    });
    
    if (!key) {
      return null;
    }
    
    // Check if key is expired
    if (key.expiresAt && key.expiresAt < new Date()) {
      return null;
    }
    
    // Update last used timestamp (but not on every request to avoid DB load)
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (!key.lastUsedAt || key.lastUsedAt < hourAgo) {
      await prisma.apiKey.update({
        where: { id: key.id },
        data: { lastUsedAt: new Date() },
      });
    }
    
    return { userId: key.userId };
  } catch (error) {
    console.error("Error authenticating API key:", error);
    return null;
  }
}