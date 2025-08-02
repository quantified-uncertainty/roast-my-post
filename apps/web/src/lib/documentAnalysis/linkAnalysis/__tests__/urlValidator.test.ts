import { validateUrl, UrlValidationInput } from "@/lib/urlValidator/index";

// Mock fetch globally
global.fetch = jest.fn();

describe("urlValidator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("validateUrl", () => {

    it("should validate an accessible URL", async () => {
      // Mock successful HEAD request
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        url: "https://react.dev/learn",
        headers: {
          get: jest.fn().mockReturnValue("text/html"),
        },
      });

      const input: UrlValidationInput = {
        url: "https://react.dev/learn",
      };

      const result = await validateUrl(input);

      expect(result.url).toBe("https://react.dev/learn");
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.accessError).toBeUndefined();
      expect(result.linkDetails).toBeDefined();
      expect(result.linkDetails?.contentType).toBe("text/html");
      expect(result.linkDetails?.statusCode).toBe(200);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://react.dev/learn",
        expect.objectContaining({
          method: "HEAD",
        })
      );
    });

    it("should detect when a URL doesn't exist", async () => {
      // Mock failed HEAD request (domain not found)
      (global.fetch as jest.Mock).mockRejectedValue(new Error("ENOTFOUND fake-domain-12345.com"));

      const input: UrlValidationInput = {
        url: "https://fake-domain-12345.com/article",
      };

      const result = await validateUrl(input);

      expect(result.url).toBe("https://fake-domain-12345.com/article");
      expect(result.accessError).toBeDefined();
      expect(result.accessError?.type).toBe("NetworkError");
      if (result.accessError?.type === "NetworkError") {
        expect(result.accessError.message).toBe("Domain not found or connection refused");
      }
      expect(result.linkDetails).toBeUndefined();
    });

    it("should handle 404 errors properly", async () => {
      // Mock 404 response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        headers: {
          get: jest.fn().mockReturnValue("text/html"),
        },
      });

      const input: UrlValidationInput = {
        url: "https://example.com/nonexistent-page",
      };

      const result = await validateUrl(input);

      expect(result.url).toBe("https://example.com/nonexistent-page");
      expect(result.accessError).toBeDefined();
      expect(result.accessError?.type).toBe("NotFound");
      if (result.accessError?.type === "NotFound") {
        expect(result.accessError.statusCode).toBe(404);
      }
    });

    it("should handle PDFs like any other accessible content", async () => {
      // Mock PDF response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        url: "https://arxiv.org/pdf/1706.03762.pdf",
        headers: {
          get: jest.fn().mockReturnValue("application/pdf"),
        },
      });

      const input: UrlValidationInput = {
        url: "https://arxiv.org/pdf/1706.03762.pdf",
      };

      const result = await validateUrl(input);

      expect(result.url).toBe("https://arxiv.org/pdf/1706.03762.pdf");
      expect(result.accessError).toBeUndefined();
      expect(result.linkDetails).toBeDefined();
      expect(result.linkDetails?.contentType).toBe("application/pdf");
      expect(result.linkDetails?.statusCode).toBe(200);
    });


    it("should handle redirects appropriately", async () => {
      // Mock redirect
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        url: "https://react.dev/learn", // Redirected URL
        headers: {
          get: jest.fn().mockReturnValue("text/html"),
        },
      });

      const input: UrlValidationInput = {
        url: "https://reactjs.org/docs",
      };

      const result = await validateUrl(input);

      expect(result.url).toBe("https://reactjs.org/docs");
      expect(result.finalUrl).toBe("https://react.dev/learn");
      expect(result.linkDetails?.contentType).toBe("text/html");
      expect(result.linkDetails?.statusCode).toBe(200);
    });



    it("should handle timeout errors", async () => {
      // Mock timeout error
      const abortError = new Error("The operation was aborted");
      abortError.name = "AbortError";
      (global.fetch as jest.Mock).mockRejectedValue(abortError);

      const input: UrlValidationInput = {
        url: "https://slow-website.com",
      };

      const result = await validateUrl(input);

      expect(result.url).toBe("https://slow-website.com");
      expect(result.accessError).toBeDefined();
      expect(result.accessError?.type).toBe("Timeout");
      if (result.accessError?.type === "Timeout") {
        expect(result.accessError.duration).toBeGreaterThanOrEqual(0);
      }
    });
  });
});