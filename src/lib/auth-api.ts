import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function authenticateApiKey(request: NextRequest): Promise<{ userId: string } | null> {
  const authHeader = request.headers.get("authorization");
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  
  const apiKey = authHeader.substring(7); // Remove "Bearer " prefix
  
  try {
    const key = await prisma.apiKey.findUnique({
      where: { key: apiKey },
      include: { user: true },
    });
    
    if (!key) {
      return null;
    }
    
    // Check if key is expired
    if (key.expiresAt && key.expiresAt < new Date()) {
      return null;
    }
    
    // Update last used timestamp
    await prisma.apiKey.update({
      where: { id: key.id },
      data: { lastUsedAt: new Date() },
    });
    
    return { userId: key.userId };
  } catch (error) {
    console.error("Error authenticating API key:", error);
    return null;
  }
}