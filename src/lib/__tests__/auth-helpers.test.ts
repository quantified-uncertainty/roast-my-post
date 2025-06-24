import { NextRequest } from "next/server";
import { authenticateRequest, authenticateRequestSessionFirst } from "../auth-helpers";

// Mock dependencies
jest.mock("../auth", () => ({
  auth: jest.fn(),
}));

jest.mock("../auth-api", () => ({
  authenticateApiKey: jest.fn(),
}));

import { auth } from "../auth";
import { authenticateApiKey } from "../auth-api";

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockAuthenticateApiKey = authenticateApiKey as jest.MockedFunction<typeof authenticateApiKey>;

describe("auth-helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("authenticateRequest", () => {
    it("should return userId when API key authentication succeeds", async () => {
      const request = new NextRequest("http://localhost:3000");
      mockAuthenticateApiKey.mockResolvedValue({
        success: true,
        userId: "api-user-id",
        keyId: "key-id",
      });

      const result = await authenticateRequest(request);

      expect(result).toBe("api-user-id");
      expect(mockAuthenticateApiKey).toHaveBeenCalledWith(request);
      expect(mockAuth).not.toHaveBeenCalled();
    });

    it("should fall back to session auth when API key fails", async () => {
      const request = new NextRequest("http://localhost:3000");
      mockAuthenticateApiKey.mockResolvedValue({
        success: false,
        error: {
          type: "INVALID_KEY",
          message: "Invalid key",
          statusCode: 401,
        },
      } as any);
      mockAuth.mockResolvedValue({
        user: { id: "session-user-id" },
      } as any);

      const result = await authenticateRequest(request);

      expect(result).toBe("session-user-id");
      expect(mockAuthenticateApiKey).toHaveBeenCalledWith(request);
      expect(mockAuth).toHaveBeenCalled();
    });

    it("should return undefined when both auth methods fail", async () => {
      const request = new NextRequest("http://localhost:3000");
      mockAuthenticateApiKey.mockResolvedValue({
        success: false,
        error: {
          type: "INVALID_KEY",
          message: "Invalid key",
          statusCode: 401,
        },
      } as any);
      mockAuth.mockResolvedValue(null);

      const result = await authenticateRequest(request);

      expect(result).toBeUndefined();
    });
  });

  describe("authenticateRequestSessionFirst", () => {
    it("should return userId when session authentication succeeds", async () => {
      const request = new NextRequest("http://localhost:3000");
      mockAuth.mockResolvedValue({
        user: { id: "session-user-id" },
      } as any);

      const result = await authenticateRequestSessionFirst(request);

      expect(result).toBe("session-user-id");
      expect(mockAuth).toHaveBeenCalled();
      expect(mockAuthenticateApiKey).not.toHaveBeenCalled();
    });

    it("should fall back to API key auth when session fails", async () => {
      const request = new NextRequest("http://localhost:3000");
      mockAuth.mockResolvedValue(null);
      mockAuthenticateApiKey.mockResolvedValue({
        success: true,
        userId: "api-user-id",
        keyId: "key-id",
      });

      const result = await authenticateRequestSessionFirst(request);

      expect(result).toBe("api-user-id");
      expect(mockAuth).toHaveBeenCalled();
      expect(mockAuthenticateApiKey).toHaveBeenCalledWith(request);
    });

    it("should return undefined when both auth methods fail", async () => {
      const request = new NextRequest("http://localhost:3000");
      mockAuth.mockResolvedValue(null);
      mockAuthenticateApiKey.mockResolvedValue({
        success: false,
        error: {
          type: "INVALID_KEY",
          message: "Invalid key",
          statusCode: 401,
        },
      } as any);

      const result = await authenticateRequestSessionFirst(request);

      expect(result).toBeUndefined();
    });
  });
});