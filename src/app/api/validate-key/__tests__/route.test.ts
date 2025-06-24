import { NextRequest } from "next/server";

import { authenticateApiKeySimple } from "@/lib/auth-api";
import { prisma } from "@/lib/prisma";

import { GET } from "../route";

// Mock dependencies
jest.mock("@/lib/auth-api");
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

describe("/api/validate-key", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 when no API key is provided", async () => {
    const request = new NextRequest("http://localhost:3000/api/auth/validate");
    (authenticateApiKeySimple as jest.Mock).mockResolvedValue(null);

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: "Invalid or expired API key" });
  });

  it("should return 401 when API key is invalid", async () => {
    const request = new NextRequest("http://localhost:3000/api/auth/validate", {
      headers: {
        Authorization: "Bearer oa_invalid_key",
      },
    });
    (authenticateApiKeySimple as jest.Mock).mockResolvedValue(null);

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: "Invalid or expired API key" });
  });

  it("should return 500 when auth result has invalid structure", async () => {
    const request = new NextRequest("http://localhost:3000/api/auth/validate", {
      headers: {
        Authorization: "Bearer oa_valid_key",
      },
    });
    // Mock auth result with missing or invalid userId
    (authenticateApiKeySimple as jest.Mock).mockResolvedValue({ userId: null });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: "Invalid authentication result" });
  });

  it("should return 500 when auth result has wrong userId type", async () => {
    const request = new NextRequest("http://localhost:3000/api/auth/validate", {
      headers: {
        Authorization: "Bearer oa_valid_key",
      },
    });
    // Mock auth result with wrong userId type
    (authenticateApiKeySimple as jest.Mock).mockResolvedValue({ userId: 123 });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: "Invalid authentication result" });
  });

  it("should return 404 when authenticated but user not found", async () => {
    const request = new NextRequest("http://localhost:3000/api/auth/validate", {
      headers: {
        Authorization: "Bearer oa_valid_key",
      },
    });
    (authenticateApiKeySimple as jest.Mock).mockResolvedValue({ userId: "user123" });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toEqual({ error: "User not found" });
  });

  it("should return user data when API key is valid", async () => {
    const mockUser = {
      id: "user123",
      email: "test@example.com",
      name: "Test User",
    };

    const request = new NextRequest("http://localhost:3000/api/auth/validate", {
      headers: {
        Authorization: "Bearer oa_valid_key",
      },
    });
    (authenticateApiKeySimple as jest.Mock).mockResolvedValue({ userId: "user123" });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      valid: true,
      user: {
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
      },
    });
  });

  it("should handle database errors gracefully", async () => {
    const request = new NextRequest("http://localhost:3000/api/auth/validate", {
      headers: {
        Authorization: "Bearer oa_valid_key",
      },
    });
    (authenticateApiKeySimple as jest.Mock).mockRejectedValue(
      new Error("Database connection failed")
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: "Failed to validate API key" });
  });
});
