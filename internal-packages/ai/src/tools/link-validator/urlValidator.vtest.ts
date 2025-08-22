import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { validateUrl, UrlValidationInput } from "./urlValidator";
import axios from 'axios';

// Mock fetch globally
global.fetch = vi.fn();

// Mock axios
vi.mock('axios');

describe("urlValidator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validateUrl", () => {

    it("should validate an accessible URL", async () => {
      // Mock successful HEAD request
      (global.fetch as any).mockImplementation(() => Promise.resolve({
        ok: true,
        status: 200,
        url: "https://react.dev/learn",
        headers: {
          get: vi.fn().mockReturnValue("text/html"),
        },
      }));

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
      (global.fetch as any).mockImplementation(() => Promise.reject(new Error("ENOTFOUND fake-domain-12345.com")));

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
      (global.fetch as any).mockImplementation(() => Promise.resolve({
        ok: false,
        status: 404,
        headers: {
          get: vi.fn().mockReturnValue("text/html"),
        },
      }));

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
      (global.fetch as any).mockImplementation(() => Promise.resolve({
        ok: true,
        status: 200,
        url: "https://arxiv.org/pdf/1706.03762.pdf",
        headers: {
          get: vi.fn().mockReturnValue("application/pdf"),
        },
      }));

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
      (global.fetch as any).mockImplementation(() => Promise.resolve({
        ok: true,
        status: 200,
        url: "https://react.dev/learn", // Redirected URL
        headers: {
          get: vi.fn().mockReturnValue("text/html"),
        },
      }));

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
      (global.fetch as any).mockImplementation(() => Promise.reject(abortError));

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

    it("should handle SSL/TLS certificate errors", async () => {
      // Mock SSL error
      (global.fetch as any).mockImplementation(() => Promise.reject(new Error("CERT_HAS_EXPIRED")));

      const input: UrlValidationInput = {
        url: "https://expired-cert.example.com",
      };

      const result = await validateUrl(input);

      expect(result.url).toBe("https://expired-cert.example.com");
      expect(result.accessError).toBeDefined();
      expect(result.accessError?.type).toBe("NetworkError");
      if (result.accessError?.type === "NetworkError") {
        expect(result.accessError.message).toBe("SSL/TLS certificate error");
        expect(result.accessError.retryable).toBe(false);
      }
    });

    it("should handle 403 Forbidden errors", async () => {
      // Mock 403 response
      (global.fetch as any).mockImplementation(() => Promise.resolve({
        ok: false,
        status: 403,
        headers: {
          get: vi.fn().mockReturnValue("text/html"),
        },
      }));

      const input: UrlValidationInput = {
        url: "https://example.com/protected",
      };

      const result = await validateUrl(input);

      expect(result.url).toBe("https://example.com/protected");
      expect(result.accessError).toBeDefined();
      expect(result.accessError?.type).toBe("Forbidden");
      if (result.accessError?.type === "Forbidden") {
        expect(result.accessError.statusCode).toBe(403);
      }
    });

    it("should handle rate limiting (429) errors", async () => {
      // Mock 429 response
      (global.fetch as any).mockImplementation(() => Promise.resolve({
        ok: false,
        status: 429,
        headers: {
          get: vi.fn((header) => {
            if (header === "x-ratelimit-reset") return "1700000000";
            return null;
          }),
        },
      }));

      const input: UrlValidationInput = {
        url: "https://api.example.com/endpoint",
      };

      const result = await validateUrl(input);

      expect(result.url).toBe("https://api.example.com/endpoint");
      expect(result.accessError).toBeDefined();
      expect(result.accessError?.type).toBe("RateLimited");
      if (result.accessError?.type === "RateLimited") {
        expect(result.accessError.resetTime).toBe(1700000000);
      }
    });

    it("should handle server errors (5xx)", async () => {
      // Mock 500 response
      (global.fetch as any).mockImplementation(() => Promise.resolve({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        headers: {
          get: vi.fn().mockReturnValue("text/html"),
        },
      }));

      const input: UrlValidationInput = {
        url: "https://example.com/broken",
      };

      const result = await validateUrl(input);

      expect(result.url).toBe("https://example.com/broken");
      expect(result.accessError).toBeDefined();
      expect(result.accessError?.type).toBe("ServerError");
      if (result.accessError?.type === "ServerError") {
        expect(result.accessError.statusCode).toBe(500);
      }
    });

    it("should try multiple strategies before giving up", async () => {
      // Mock failures for first two strategies, success on third
      (global.fetch as any)
        .mockImplementationOnce(() => Promise.reject(new Error("Network error")))
        .mockImplementationOnce(() => Promise.reject(new Error("Network error")))
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          status: 200,
          url: "https://example.com",
          headers: {
            get: vi.fn().mockReturnValue("text/html"),
          },
        }));

      const input: UrlValidationInput = {
        url: "https://example.com",
      };

      const result = await validateUrl(input);

      expect(result.url).toBe("https://example.com");
      expect(result.accessError).toBeUndefined();
      expect(result.linkDetails).toBeDefined();
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    describe("LessWrong and EA Forum URLs", () => {
      it("should use GraphQL API for LessWrong URLs", async () => {
        const mockAxios = vi.mocked(axios);
        mockAxios.post.mockResolvedValueOnce({
          data: {
            data: {
              post: {
                result: {
                  _id: 'testId123',
                  title: 'Test Post',
                  postedAt: '2024-01-01T00:00:00Z'
                }
              }
            }
          }
        });

        const input: UrlValidationInput = {
          url: "https://www.lesswrong.com/posts/testId123/test-post",
        };

        const result = await validateUrl(input);

        expect(mockAxios.post).toHaveBeenCalledWith(
          "https://www.lesswrong.com/graphql",
          expect.objectContaining({
            query: expect.stringContaining('$postId'),
            variables: { postId: 'testId123' }
          }),
          expect.any(Object)
        );
        expect(global.fetch).not.toHaveBeenCalled();
        expect(result.accessError).toBeUndefined();
        expect(result.linkDetails?.statusCode).toBe(200);
      });

      it("should use GraphQL API for EA Forum URLs", async () => {
        const mockAxios = vi.mocked(axios);
        mockAxios.post.mockResolvedValueOnce({
          data: {
            data: {
              post: {
                result: {
                  _id: 'eaTestId',
                  title: 'EA Test Post',
                  postedAt: '2024-01-01T00:00:00Z'
                }
              }
            }
          }
        });

        const input: UrlValidationInput = {
          url: "https://forum.effectivealtruism.org/posts/eaTestId/ea-test-post",
        };

        const result = await validateUrl(input);

        expect(mockAxios.post).toHaveBeenCalledWith(
          "https://forum.effectivealtruism.org/graphql",
          expect.objectContaining({
            query: expect.stringContaining('$postId'),
            variables: { postId: 'eaTestId' }
          }),
          expect.any(Object)
        );
        expect(global.fetch).not.toHaveBeenCalled();
        expect(result.accessError).toBeUndefined();
        expect(result.linkDetails?.statusCode).toBe(200);
      });

      it("should handle invalid LessWrong post IDs", async () => {
        const mockAxios = vi.mocked(axios);
        mockAxios.post.mockResolvedValueOnce({
          data: {
            data: {
              post: {
                result: null
              }
            }
          }
        });

        const input: UrlValidationInput = {
          url: "https://www.lesswrong.com/posts/INVALID/invalid-post",
        };

        const result = await validateUrl(input);

        expect(result.accessError).toEqual({
          type: "NotFound",
          statusCode: 404
        });
      });

      it("should handle malformed LessWrong URLs", async () => {
        const input: UrlValidationInput = {
          url: "https://www.lesswrong.com/not-a-post-url",
        };

        const result = await validateUrl(input);

        expect(result.accessError).toBeDefined();
        expect(result.accessError?.type).toBe("Unknown");
      });

      it("should handle LessWrong API timeouts", async () => {
        const mockAxios = vi.mocked(axios);
        const error = new Error('timeout') as any;
        error.code = 'ECONNABORTED';
        error.isAxiosError = true;
        mockAxios.post.mockRejectedValueOnce(error);
        mockAxios.isAxiosError = vi.fn().mockReturnValue(true);

        const input: UrlValidationInput = {
          url: "https://www.lesswrong.com/posts/test/test",
        };

        const result = await validateUrl(input);

        expect(result.accessError).toEqual({
          type: "Timeout",
          duration: 10000
        });
      });

      it("should handle EA Forum API rate limiting", async () => {
        const mockAxios = vi.mocked(axios);
        const error = new Error('Rate limited') as any;
        error.response = { status: 429 };
        error.isAxiosError = true;
        mockAxios.post.mockRejectedValueOnce(error);
        mockAxios.isAxiosError = vi.fn().mockReturnValue(true);

        const input: UrlValidationInput = {
          url: "https://forum.effectivealtruism.org/posts/test/test",
        };

        const result = await validateUrl(input);

        expect(result.accessError).toEqual({
          type: "RateLimited"
        });
      });

      it("should use regular fetch for non-LW/EA URLs", async () => {
        (global.fetch as any).mockImplementation(() => Promise.resolve({
          ok: true,
          status: 200,
          url: "https://example.com",
          headers: {
            get: vi.fn().mockReturnValue("text/html"),
          },
        }));

        const input: UrlValidationInput = {
          url: "https://example.com",
        };

        const result = await validateUrl(input);

        expect(global.fetch).toHaveBeenCalled();
        expect(axios.post).not.toHaveBeenCalled();
        expect(result.accessError).toBeUndefined();
      });
    });
  });
});