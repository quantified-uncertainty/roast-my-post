import { validateUrl, UrlValidationInput } from "../index";
import { Anthropic } from "@anthropic-ai/sdk";

// Mock fetch globally
global.fetch = jest.fn();

// Store the mock create function
let mockAnthropicCreate: jest.Mock;

// Mock the Anthropic SDK
jest.mock("@anthropic-ai/sdk", () => {
  mockAnthropicCreate = jest.fn();
  return {
    Anthropic: jest.fn().mockImplementation(() => ({
      messages: {
        create: mockAnthropicCreate,
      },
    })),
  };
});

describe("urlValidator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("validateUrl", () => {
    const mockApiKey = "test-api-key";

    it("should validate an existing URL that is correctly cited", async () => {
      // Mock successful HEAD request
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        url: "https://react.dev/learn",
      });

      // Mock Anthropic response
      mockAnthropicCreate.mockResolvedValue({
        content: [{
          type: "text",
          text: JSON.stringify({
            correctlyCited: true,
            message: "The URL correctly links to React documentation as described.",
          }),
        }],
      });

      const input: UrlValidationInput = {
        url: "https://react.dev/learn",
        usageContext: "React documentation for learning React basics",
      };

      const result = await validateUrl(input, mockApiKey);

      expect(result).toEqual({
        doesExist: true,
        correctlyCited: true,
        message: "The URL correctly links to React documentation as described.",
      });

      expect(global.fetch).toHaveBeenCalledWith(
        "https://react.dev/learn",
        expect.objectContaining({
          method: "HEAD",
        })
      );
      expect(mockAnthropicCreate).toHaveBeenCalled();
    });

    it("should detect when a URL doesn't exist", async () => {
      // Mock failed HEAD request
      (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

      // Mock Anthropic response
      mockAnthropicCreate.mockResolvedValue({
        content: [{
          type: "text",
          text: JSON.stringify({
            correctlyCited: false,
            message: "The URL doesn't exist and appears to be hallucinated.",
          }),
        }],
      });

      const input: UrlValidationInput = {
        url: "https://fake-domain-12345.com/article",
        usageContext: "Article about machine learning",
      };

      const result = await validateUrl(input, mockApiKey);

      expect(result).toEqual({
        doesExist: false,
        correctlyCited: false,
        message: "The URL doesn't exist and appears to be hallucinated.",
      });
    });

    it("should identify when a URL exists but is incorrectly cited", async () => {
      // Mock successful HEAD request
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        url: "https://docs.python.org/3/",
      });

      // Mock Anthropic response
      mockAnthropicCreate.mockResolvedValue({
        content: [{
          type: "text",
          text: JSON.stringify({
            correctlyCited: false,
            message: "This URL points to Python documentation, not JavaScript/React as described in the context.",
          }),
        }],
      });

      const input: UrlValidationInput = {
        url: "https://docs.python.org/3/",
        usageContext: "React documentation for learning React basics",
      };

      const result = await validateUrl(input, mockApiKey);

      expect(result).toEqual({
        doesExist: true,
        correctlyCited: false,
        message: "This URL points to Python documentation, not JavaScript/React as described in the context.",
      });
    });

    it("should handle redirects appropriately", async () => {
      // Mock redirect
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        url: "https://react.dev/learn", // Redirected URL
      });

      // Mock Anthropic response
      mockAnthropicCreate.mockResolvedValue({
        content: [{
          type: "text",
          text: JSON.stringify({
            correctlyCited: true,
            message: "The URL redirects to the current React documentation, which matches the usage context.",
          }),
        }],
      });

      const input: UrlValidationInput = {
        url: "https://reactjs.org/docs",
        usageContext: "React documentation",
      };

      const result = await validateUrl(input, mockApiKey);

      expect(result.doesExist).toBe(true);
      expect(result.correctlyCited).toBe(true);
      expect(result.message).toContain("redirects");
    });

    it("should handle API errors gracefully", async () => {
      // Mock successful HEAD request
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        url: "https://example.com",
      });

      // Mock Anthropic API error
      mockAnthropicCreate.mockRejectedValue(new Error("API error"));

      const input: UrlValidationInput = {
        url: "https://example.com",
        usageContext: "Example website",
      };

      const result = await validateUrl(input, mockApiKey);

      expect(result.doesExist).toBe(true);
      expect(result.correctlyCited).toBe(true); // Fallback to true when exists
      expect(result.message).toContain("could not verify");
    });

    it("should handle malformed JSON responses", async () => {
      // Mock successful HEAD request
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        url: "https://example.com",
      });

      // Mock Anthropic response with invalid JSON
      mockAnthropicCreate.mockResolvedValue({
        content: [{
          type: "text",
          text: "This is not valid JSON",
        }],
      });

      const input: UrlValidationInput = {
        url: "https://example.com",
        usageContext: "Example website",
      };

      const result = await validateUrl(input, mockApiKey);

      expect(result.doesExist).toBe(true);
      expect(result.correctlyCited).toBe(true); // Fallback behavior
      expect(result.message).toBeDefined();
    });
  });
});