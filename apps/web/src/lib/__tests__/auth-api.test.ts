import { NextRequest } from "next/server";
import { authenticateApiKey, authenticateApiKeySimple, AuthErrorType } from "../auth-api";
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

// Mock crypto
jest.mock("../crypto", () => ({
  hashApiKey: jest.fn(),
  generateApiKey: jest.fn(() => "rmp_test1234567890123456789012345678901234567890"),
}));

describe("authenticateApiKey", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("detailed error handling", () => {
    it("should return NO_AUTH_HEADER error when no authorization header", async () => {
      const request = new NextRequest("http://localhost:3000/api/test");
      const result = await authenticateApiKey(request);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe(AuthErrorType.NO_AUTH_HEADER);
        expect(result.error.statusCode).toBe(401);
        expect(result.error.message).toBe("Missing authorization header");
      }
    });

    it("should return INVALID_AUTH_FORMAT error when not Bearer scheme", async () => {
      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: { Authorization: "Basic sometoken" },
      });
      const result = await authenticateApiKey(request);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe(AuthErrorType.INVALID_AUTH_FORMAT);
        expect(result.error.message).toBe("Authorization header must use Bearer scheme");
      }
    });

    it("should return INVALID_KEY_FORMAT error for wrong prefix", async () => {
      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: { Authorization: "Bearer sk_invalidkey123456789012345678901234567890" },
      });
      const result = await authenticateApiKey(request);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe(AuthErrorType.INVALID_KEY_FORMAT);
        expect(result.error.message).toBe("API key must start with 'rmp_'");
      }
    });

    it("should return INVALID_KEY_FORMAT error for too short key", async () => {
      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: { Authorization: "Bearer rmp_short" },
      });
      const result = await authenticateApiKey(request);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe(AuthErrorType.INVALID_KEY_FORMAT);
        expect(result.error.message).toBe("API key is too short");
      }
    });

    it("should return KEY_NOT_FOUND error for non-existent key", async () => {
      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: { Authorization: "Bearer rmp_test1234567890123456789012345678901234567890" },
      });
      (hashApiKey as jest.Mock).mockReturnValue("hashed_key");
      (prisma.apiKey.findUnique as jest.Mock).mockResolvedValue(null);
      
      const result = await authenticateApiKey(request);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe(AuthErrorType.KEY_NOT_FOUND);
        expect(result.error.message).toBe("Invalid API key");
      }
    });

    it("should return USER_NOT_FOUND error when user is missing", async () => {
      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: { Authorization: "Bearer rmp_test1234567890123456789012345678901234567890" },
      });
      (hashApiKey as jest.Mock).mockReturnValue("hashed_key");
      (prisma.apiKey.findUnique as jest.Mock).mockResolvedValue({
        id: "key123",
        userId: "user123",
        key: "hashed_key",
        expiresAt: null,
        lastUsedAt: null,
        user: null, // User not found
      });
      
      const result = await authenticateApiKey(request);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe(AuthErrorType.USER_NOT_FOUND);
        expect(result.error.statusCode).toBe(404);
      }
    });

    it("should return KEY_EXPIRED error for expired key", async () => {
      const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: { Authorization: "Bearer rmp_test1234567890123456789012345678901234567890" },
      });
      (hashApiKey as jest.Mock).mockReturnValue("hashed_key");
      (prisma.apiKey.findUnique as jest.Mock).mockResolvedValue({
        id: "key123",
        userId: "user123",
        key: "hashed_key",
        expiresAt: expiredDate,
        lastUsedAt: null,
        user: { id: "user123" },
      });
      
      const result = await authenticateApiKey(request);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe(AuthErrorType.KEY_EXPIRED);
        expect(result.error.message).toContain(expiredDate.toISOString());
      }
    });

    it("should return DATABASE_ERROR for database failures", async () => {
      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: { Authorization: "Bearer rmp_test1234567890123456789012345678901234567890" },
      });
      (hashApiKey as jest.Mock).mockReturnValue("hashed_key");
      (prisma.apiKey.findUnique as jest.Mock).mockRejectedValue(new Error("DB Error"));
      
      const result = await authenticateApiKey(request);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe(AuthErrorType.DATABASE_ERROR);
        expect(result.error.statusCode).toBe(500);
        expect(result.error.message).toBe("DB Error");
      }
    });

    it("should return success with userId and keyId for valid key", async () => {
      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: { Authorization: "Bearer rmp_test1234567890123456789012345678901234567890" },
      });
      (hashApiKey as jest.Mock).mockReturnValue("hashed_key");
      (prisma.apiKey.findUnique as jest.Mock).mockResolvedValue({
        id: "key123",
        userId: "user123",
        key: "hashed_key",
        expiresAt: null,
        lastUsedAt: null,
        user: { id: "user123" },
      });
      (prisma.apiKey.update as jest.Mock).mockResolvedValue({});
      
      const result = await authenticateApiKey(request);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.userId).toBe("user123");
        expect(result.keyId).toBe("key123");
      }
    });

    it("should update lastUsedAt when key hasn't been used recently", async () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: { Authorization: "Bearer rmp_test1234567890123456789012345678901234567890" },
      });
      (hashApiKey as jest.Mock).mockReturnValue("hashed_key");
      (prisma.apiKey.findUnique as jest.Mock).mockResolvedValue({
        id: "key123",
        userId: "user123",
        key: "hashed_key",
        expiresAt: null,
        lastUsedAt: twoHoursAgo,
        user: { id: "user123" },
      });
      (prisma.apiKey.update as jest.Mock).mockResolvedValue({});
      
      await authenticateApiKey(request);
      
      expect(prisma.apiKey.update).toHaveBeenCalledWith({
        where: { id: "key123" },
        data: { lastUsedAt: expect.any(Date) },
      });
    });

    it("should not update lastUsedAt if recently used", async () => {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: { Authorization: "Bearer rmp_test1234567890123456789012345678901234567890" },
      });
      (hashApiKey as jest.Mock).mockReturnValue("hashed_key");
      (prisma.apiKey.findUnique as jest.Mock).mockResolvedValue({
        id: "key123",
        userId: "user123",
        key: "hashed_key",
        expiresAt: null,
        lastUsedAt: thirtyMinutesAgo,
        user: { id: "user123" },
      });
      
      await authenticateApiKey(request);
      
      expect(prisma.apiKey.update).not.toHaveBeenCalled();
    });
  });

  describe("backward compatibility with authenticateApiKeySimple", () => {
    it("should return null when no authorization header", async () => {
      const request = new NextRequest("http://localhost:3000/api/test");
      const result = await authenticateApiKeySimple(request);
      expect(result).toBeNull();
    });

    it("should return null when authorization header doesn't start with Bearer", async () => {
      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          Authorization: "Basic sometoken",
        },
      });
      const result = await authenticateApiKeySimple(request);
      expect(result).toBeNull();
    });

    it("should return null for invalid key format", async () => {
      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          Authorization: "Bearer invalidkey",
        },
      });
      const result = await authenticateApiKeySimple(request);
      expect(result).toBeNull();
    });

    it("should return null when key not found in database", async () => {
      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          Authorization: "Bearer rmp_test1234567890123456789012345678901234567890",
        },
      });
      (hashApiKey as jest.Mock).mockReturnValue("hashed_key");
      (prisma.apiKey.findUnique as jest.Mock).mockResolvedValue(null);
      
      const result = await authenticateApiKeySimple(request);
      expect(result).toBeNull();
    });

    it("should return null for expired key", async () => {
      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          Authorization: "Bearer rmp_test1234567890123456789012345678901234567890",
        },
      });
      (hashApiKey as jest.Mock).mockReturnValue("hashed_key");
      (prisma.apiKey.findUnique as jest.Mock).mockResolvedValue({
        id: "key123",
        userId: "user123",
        key: "hashed_key",
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired yesterday
        lastUsedAt: null,
        user: { id: "user123" },
      });
      
      const result = await authenticateApiKeySimple(request);
      expect(result).toBeNull();
    });

    it("should authenticate valid key and update lastUsedAt", async () => {
      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          Authorization: "Bearer rmp_test1234567890123456789012345678901234567890",
        },
      });
      (hashApiKey as jest.Mock).mockReturnValue("hashed_key");
      (prisma.apiKey.findUnique as jest.Mock).mockResolvedValue({
        id: "key123",
        userId: "user123",
        key: "hashed_key",
        expiresAt: null,
        lastUsedAt: null,
        user: { id: "user123" },
      });
      (prisma.apiKey.update as jest.Mock).mockResolvedValue({});
      
      const result = await authenticateApiKeySimple(request);
      expect(result).toEqual({ userId: "user123" });
      expect(prisma.apiKey.update).toHaveBeenCalledWith({
        where: { id: "key123" },
        data: { lastUsedAt: expect.any(Date) },
      });
    });

    it("should not update lastUsedAt if recently used", async () => {
      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          Authorization: "Bearer rmp_test1234567890123456789012345678901234567890",
        },
      });
      (hashApiKey as jest.Mock).mockReturnValue("hashed_key");
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      (prisma.apiKey.findUnique as jest.Mock).mockResolvedValue({
        id: "key123",
        userId: "user123",
        key: "hashed_key",
        expiresAt: null,
        lastUsedAt: thirtyMinutesAgo,
        user: { id: "user123" },
      });
      
      const result = await authenticateApiKeySimple(request);
      expect(result).toEqual({ userId: "user123" });
      expect(prisma.apiKey.update).not.toHaveBeenCalled();
    });

    it("should handle database errors gracefully", async () => {
      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          Authorization: "Bearer rmp_test1234567890123456789012345678901234567890",
        },
      });
      (hashApiKey as jest.Mock).mockReturnValue("hashed_key");
      (prisma.apiKey.findUnique as jest.Mock).mockRejectedValue(new Error("DB Error"));
      
      const result = await authenticateApiKeySimple(request);
      expect(result).toBeNull();
    });
  });
});