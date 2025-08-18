import { linkValidator } from "./index";

// Mock the urlValidator module
vi.mock("./urlValidator", () => ({
  validateUrls: vi.fn(),
}));

import { validateUrls } from "./urlValidator";

describe("link-validator tool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should extract and validate URLs from text", async () => {
    const mockValidationResults = [
      {
        url: "https://example.com/page1",
        finalUrl: "https://example.com/page1",
        timestamp: new Date(),
        linkDetails: {
          contentType: "text/html",
          statusCode: 200,
        },
      },
      {
        url: "https://example.com/broken",
        timestamp: new Date(),
        accessError: {
          type: "NotFound",
          statusCode: 404,
        },
      },
    ];

    (validateUrls as any).mockResolvedValue(mockValidationResults);

    const input = {
      text: `
        Check out this [working link](https://example.com/page1).
        And this broken one: https://example.com/broken
      `,
    };

    const result = await linkValidator.execute(input, {
      logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() }
    });

    expect(result.urls).toEqual([
      "https://example.com/page1",
      "https://example.com/broken",
    ]);

    expect(result.validations).toHaveLength(2);
    expect(result.validations[0].accessible).toBe(true);
    expect(result.validations[1].accessible).toBe(false);

    expect(result.summary).toEqual({
      totalLinks: 2,
      workingLinks: 1,
      brokenLinks: 1,
      errorBreakdown: {
        NotFound: 1,
      },
    });
  });

  it("should handle text with no URLs", async () => {
    const input = {
      text: "This is just plain text with no links.",
    };

    const result = await linkValidator.execute(input, {
      logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() }
    });

    expect(result.urls).toEqual([]);
    expect(result.validations).toEqual([]);
    expect(result.summary).toEqual({
      totalLinks: 0,
      workingLinks: 0,
      brokenLinks: 0,
      errorBreakdown: {},
    });

    expect(validateUrls).not.toHaveBeenCalled();
  });

  it("should respect maxUrls parameter", async () => {
    const mockValidationResults = Array.from({ length: 5 }, (_, i) => ({
      url: `https://example.com/page${i}`,
      timestamp: new Date(),
      linkDetails: {
        contentType: "text/html",
        statusCode: 200,
      },
    }));

    (validateUrls as any).mockResolvedValue(mockValidationResults);

    const input = {
      text: Array.from({ length: 10 }, (_, i) => 
        `Link ${i}: https://example.com/page${i}`
      ).join('\n'),
      maxUrls: 5,
    };

    const result = await linkValidator.execute(input, {
      logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() }
    });

    expect(result.urls).toHaveLength(5);
    expect(result.validations).toHaveLength(5);
    expect(validateUrls).toHaveBeenCalledWith(
      expect.arrayContaining([
        { url: "https://example.com/page0" },
        { url: "https://example.com/page1" },
        { url: "https://example.com/page2" },
        { url: "https://example.com/page3" },
        { url: "https://example.com/page4" },
      ])
    );
  });

  it("should categorize different error types correctly", async () => {
    const mockValidationResults = [
      {
        url: "https://example.com/working",
        timestamp: new Date(),
        linkDetails: { contentType: "text/html", statusCode: 200 },
      },
      {
        url: "https://example.com/notfound",
        timestamp: new Date(),
        accessError: { type: "NotFound", statusCode: 404 },
      },
      {
        url: "https://example.com/forbidden",
        timestamp: new Date(),
        accessError: { type: "Forbidden", statusCode: 403 },
      },
      {
        url: "https://example.com/timeout",
        timestamp: new Date(),
        accessError: { type: "Timeout", duration: 10000 },
      },
      {
        url: "https://example.com/network",
        timestamp: new Date(),
        accessError: { type: "NetworkError", message: "DNS error", retryable: false },
      },
    ];

    (validateUrls as any).mockResolvedValue(mockValidationResults);

    const input = {
      text: `
        https://example.com/working
        https://example.com/notfound
        https://example.com/forbidden
        https://example.com/timeout
        https://example.com/network
      `,
    };

    const result = await linkValidator.execute(input, {
      logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() }
    });

    expect(result.summary).toEqual({
      totalLinks: 5,
      workingLinks: 1,
      brokenLinks: 4,
      errorBreakdown: {
        NotFound: 1,
        Forbidden: 1,
        Timeout: 1,
        NetworkError: 1,
      },
    });
  });

  it("should handle URLs with redirects", async () => {
    const mockValidationResults = [
      {
        url: "https://old.example.com",
        finalUrl: "https://new.example.com",
        timestamp: new Date(),
        linkDetails: {
          contentType: "text/html",
          statusCode: 200,
        },
      },
    ];

    (validateUrls as any).mockResolvedValue(mockValidationResults);

    const input = {
      text: "Visit https://old.example.com for more info",
    };

    const result = await linkValidator.execute(input, {
      logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() }
    });

    expect(result.validations[0].url).toBe("https://old.example.com");
    expect(result.validations[0].finalUrl).toBe("https://new.example.com");
    expect(result.validations[0].accessible).toBe(true);
  });

  it("should include error details in validation results", async () => {
    const mockValidationResults = [
      {
        url: "https://example.com/error",
        timestamp: new Date(),
        accessError: {
          type: "Unknown",
          message: "Unexpected error occurred",
        },
      },
    ];

    (validateUrls as any).mockResolvedValue(mockValidationResults);

    const input = {
      text: "Error link: https://example.com/error",
    };

    const result = await linkValidator.execute(input, {
      logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() }
    });

    expect(result.validations[0].error).toEqual({
      type: "Unknown",
      message: "Unexpected error occurred",
      statusCode: undefined,
    });
  });
});