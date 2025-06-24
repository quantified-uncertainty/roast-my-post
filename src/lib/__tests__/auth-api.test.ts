import { NextRequest } from "next/server";
import { authenticateApiKey } from "../auth-api";
import { prisma } from "../prisma";
import { hashApiKey, generateApiKey } from "../crypto";

// Mock prisma
jest.mock("../prisma", () => ({
  prisma: {
    apiKey: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe("authenticateApiKey", () => {
  const mockUserId = "user123";
  const validApiKey = generateApiKey();
  const hashedKey = hashApiKey(validApiKey);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return null when no authorization header", async () => {
    const request = new NextRequest("http://localhost:3000/api/test");
    const result = await authenticateApiKey(request);
    expect(result).toBeNull();
  });

  it("should return null when authorization header doesn't start with Bearer", async () => {
    const request = new NextRequest("http://localhost:3000/api/test", {
      headers: {
        authorization: "Basic sometoken",
      },
    });
    const result = await authenticateApiKey(request);
    expect(result).toBeNull();
  });

  it("should return null for invalid key format", async () => {
    const request = new NextRequest("http://localhost:3000/api/test", {
      headers: {
        authorization: "Bearer invalid_key",
      },
    });
    const result = await authenticateApiKey(request);
    expect(result).toBeNull();
  });

  it("should return null when key not found in database", async () => {
    (prisma.apiKey.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/api/test", {
      headers: {
        authorization: `Bearer ${validApiKey}`,
      },
    });
    const result = await authenticateApiKey(request);
    expect(result).toBeNull();
    expect(prisma.apiKey.findUnique).toHaveBeenCalledWith({
      where: { key: hashedKey },
      include: { user: true },
    });
  });

  it("should return null for expired key", async () => {
    const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
    (prisma.apiKey.findUnique as jest.Mock).mockResolvedValue({
      id: "key123",
      key: hashedKey,
      userId: mockUserId,
      expiresAt: expiredDate,
      lastUsedAt: null,
    });

    const request = new NextRequest("http://localhost:3000/api/test", {
      headers: {
        authorization: `Bearer ${validApiKey}`,
      },
    });
    const result = await authenticateApiKey(request);
    expect(result).toBeNull();
  });

  it("should authenticate valid key and update lastUsedAt", async () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    (prisma.apiKey.findUnique as jest.Mock).mockResolvedValue({
      id: "key123",
      key: hashedKey,
      userId: mockUserId,
      expiresAt: null,
      lastUsedAt: twoHoursAgo,
    });

    const request = new NextRequest("http://localhost:3000/api/test", {
      headers: {
        authorization: `Bearer ${validApiKey}`,
      },
    });
    const result = await authenticateApiKey(request);
    
    expect(result).toEqual({ userId: mockUserId });
    expect(prisma.apiKey.update).toHaveBeenCalledWith({
      where: { id: "key123" },
      data: { lastUsedAt: expect.any(Date) },
    });
  });

  it("should not update lastUsedAt if recently used", async () => {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    (prisma.apiKey.findUnique as jest.Mock).mockResolvedValue({
      id: "key123",
      key: hashedKey,
      userId: mockUserId,
      expiresAt: null,
      lastUsedAt: thirtyMinutesAgo,
    });

    const request = new NextRequest("http://localhost:3000/api/test", {
      headers: {
        authorization: `Bearer ${validApiKey}`,
      },
    });
    const result = await authenticateApiKey(request);
    
    expect(result).toEqual({ userId: mockUserId });
    expect(prisma.apiKey.update).not.toHaveBeenCalled();
  });

  it("should handle database errors gracefully", async () => {
    (prisma.apiKey.findUnique as jest.Mock).mockRejectedValue(new Error("DB Error"));

    const request = new NextRequest("http://localhost:3000/api/test", {
      headers: {
        authorization: `Bearer ${validApiKey}`,
      },
    });
    const result = await authenticateApiKey(request);
    expect(result).toBeNull();
  });
});