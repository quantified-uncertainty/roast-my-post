import { NextRequest } from "next/server";
import { generateApiKey, hashApiKey } from "@/lib/crypto";

// Mock dependencies before imports
jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    apiKey: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
  },
}));
jest.mock("@/lib/crypto");

// Import after mocking
const { GET, POST } = require("../route");
const { auth } = require("@/lib/auth");
const { prisma } = require("@/lib/prisma");

describe("/api/user/api-keys", () => {
  const mockUserId = "user123";
  const mockSession = { user: { id: mockUserId } };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET", () => {
    it("should return 401 when not authenticated", async () => {
      (auth as jest.Mock).mockResolvedValue(null);
      
      const response = await GET();
      const data = await response.json();
      
      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return user's API keys", async () => {
      (auth as jest.Mock).mockResolvedValue(mockSession);
      const mockKeys = [
        {
          id: "key1",
          name: "Test Key 1",
          createdAt: new Date("2024-01-01"),
          lastUsedAt: new Date("2024-01-02"),
          expiresAt: null,
        },
        {
          id: "key2",
          name: "Test Key 2",
          createdAt: new Date("2024-01-03"),
          lastUsedAt: null,
          expiresAt: new Date("2024-12-31"),
        },
      ];
      (prisma.apiKey.findMany as jest.Mock).mockResolvedValue(mockKeys);

      const response = await GET();
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.apiKeys).toEqual(
        mockKeys.map(key => ({
          ...key,
          createdAt: key.createdAt.toISOString(),
          expiresAt: key.expiresAt?.toISOString() || null,
          lastUsedAt: key.lastUsedAt?.toISOString() || null,
        }))
      );
      expect(prisma.apiKey.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        select: {
          id: true,
          name: true,
          createdAt: true,
          lastUsedAt: true,
          expiresAt: true,
        },
        orderBy: { createdAt: "desc" },
      });
    });

    it("should handle database errors", async () => {
      (auth as jest.Mock).mockResolvedValue(mockSession);
      (prisma.apiKey.findMany as jest.Mock).mockRejectedValue(new Error("DB Error"));

      const response = await GET();
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to fetch API keys");
    });
  });

  describe("POST", () => {
    const mockPlainKey = "oa_test_key_123";
    const mockHashedKey = "hashed_key_123";

    beforeEach(() => {
      (generateApiKey as jest.Mock).mockReturnValue(mockPlainKey);
      (hashApiKey as jest.Mock).mockReturnValue(mockHashedKey);
    });

    it("should return 401 when not authenticated", async () => {
      (auth as jest.Mock).mockResolvedValue(null);
      
      const request = new NextRequest("http://localhost:3000/api/user/api-keys", {
        method: "POST",
        body: JSON.stringify({ name: "Test Key" }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should enforce API key limit", async () => {
      (auth as jest.Mock).mockResolvedValue(mockSession);
      (prisma.apiKey.count as jest.Mock).mockResolvedValue(10);

      const request = new NextRequest("http://localhost:3000/api/user/api-keys", {
        method: "POST",
        body: JSON.stringify({ name: "Test Key" }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toBe("Maximum API key limit reached (10 keys)");
    });

    it("should validate input", async () => {
      (auth as jest.Mock).mockResolvedValue(mockSession);
      (prisma.apiKey.count as jest.Mock).mockResolvedValue(0);

      const invalidRequests = [
        { body: {} }, // Missing name
        { body: { name: "" } }, // Empty name
        { body: { name: "a".repeat(51) } }, // Name too long
        { body: { name: "Test", expiresIn: -1 } }, // Negative expiration
        { body: { name: "Test", expiresIn: 400 } }, // Expiration too long
      ];

      for (const { body } of invalidRequests) {
        const request = new NextRequest("http://localhost:3000/api/user/api-keys", {
          method: "POST",
          body: JSON.stringify(body),
        });
        
        const response = await POST(request);
        expect(response.status).toBe(400);
      }
    });

    it("should create API key successfully", async () => {
      (auth as jest.Mock).mockResolvedValue(mockSession);
      (prisma.apiKey.count as jest.Mock).mockResolvedValue(5);
      
      const mockCreatedKey = {
        id: "newkey123",
        key: mockHashedKey,
        name: "Test Key",
        createdAt: new Date(),
        expiresAt: null,
      };
      (prisma.apiKey.create as jest.Mock).mockResolvedValue(mockCreatedKey);

      const request = new NextRequest("http://localhost:3000/api/user/api-keys", {
        method: "POST",
        body: JSON.stringify({ name: "Test Key" }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.apiKey.key).toBe(mockPlainKey); // Should return plain key, not hash
      expect(data.apiKey.name).toBe("Test Key");
      expect(data.message).toContain("Save this API key securely");
      
      expect(prisma.apiKey.create).toHaveBeenCalledWith({
        data: {
          key: mockHashedKey,
          name: "Test Key",
          userId: mockUserId,
          expiresAt: null,
        },
      });
    });

    it("should create API key with expiration", async () => {
      (auth as jest.Mock).mockResolvedValue(mockSession);
      (prisma.apiKey.count as jest.Mock).mockResolvedValue(0);
      
      const mockCreatedKey = {
        id: "newkey123",
        key: mockHashedKey,
        name: "Expiring Key",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };
      (prisma.apiKey.create as jest.Mock).mockResolvedValue(mockCreatedKey);

      const request = new NextRequest("http://localhost:3000/api/user/api-keys", {
        method: "POST",
        body: JSON.stringify({ name: "Expiring Key", expiresIn: 30 }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.apiKey.expiresAt).toBeTruthy();
      
      const createCall = (prisma.apiKey.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.expiresAt).toBeInstanceOf(Date);
    });
  });
});