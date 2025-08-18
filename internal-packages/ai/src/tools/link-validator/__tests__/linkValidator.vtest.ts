import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
// jest globals are available by default
import { linkValidator } from "../index";

// Mock fetch globally
global.fetch = vi.fn() as any;

describe("Link Validator Tool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates accessible URLs", async () => {
    // Mock successful HEAD request
    (global.fetch as any).mockImplementation(() => Promise.resolve({
      ok: true,
      status: 200,
      url: "https://react.dev/learn",
      headers: {
        get: vi.fn().mockReturnValue("text/html"),
      },
    } as unknown as Response));

    const result = await linkValidator.run({
      text: "Check out [React docs](https://react.dev/learn) for tutorials.",
      maxUrls: 10
    }, {
      logger: console,
    });

    expect(result.urls).toHaveLength(1);
    expect(result.urls[0]).toBe("https://react.dev/learn");
    expect(result.validations).toHaveLength(1);
    expect(result.validations[0].accessible).toBe(true);
    expect(result.validations[0].error).toBeUndefined();
    expect(result.summary.workingLinks).toBe(1);
    expect(result.summary.brokenLinks).toBe(0);
  });

  it("detects broken URLs", async () => {
    // Mock 404 response
    (global.fetch as any).mockImplementation(() => Promise.resolve({
      ok: false,
      status: 404,
      url: "https://example.com/broken",
      headers: {
        get: vi.fn().mockReturnValue("text/html"),
      },
    } as unknown as Response));

    const result = await linkValidator.run({
      text: "Visit https://example.com/broken for more info.",
      maxUrls: 10
    }, {
      logger: console,
    });

    expect(result.urls).toHaveLength(1);
    expect(result.validations).toHaveLength(1);
    expect(result.validations[0].accessible).toBe(false);
    expect(result.validations[0].error?.type).toBe("NotFound");
    expect(result.summary.workingLinks).toBe(0);
    expect(result.summary.brokenLinks).toBe(1);
    expect(result.summary.errorBreakdown.NotFound).toBe(1);
  });

  it("handles multiple URLs", async () => {
    // Mock different responses
    (global.fetch as any)
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        status: 200,
        url: "https://working.com",
        headers: { get: vi.fn().mockReturnValue("text/html") },
      } as unknown as Response)
      .mockImplementationOnce(() => Promise.resolve({
        ok: false,
        status: 403,
        url: "https://forbidden.com",
        headers: { get: vi.fn().mockReturnValue("text/html") },
      } as unknown as Response);

    const result = await linkValidator.run({
      text: "Visit https://working.com and https://forbidden.com",
      maxUrls: 10
    }, {
      logger: console,
    });

    expect(result.urls).toHaveLength(2);
    expect(result.validations).toHaveLength(2);
    expect(result.summary.totalLinks).toBe(2);
    expect(result.summary.workingLinks).toBe(1);
    expect(result.summary.brokenLinks).toBe(1);
    expect(result.summary.errorBreakdown.Forbidden).toBe(1);
  });

  it("returns empty results for no URLs", async () => {
    const result = await linkValidator.run({
      text: "This text has no URLs at all.",
      maxUrls: 10
    }, {
      logger: console,
    });

    expect(result.urls).toHaveLength(0);
    expect(result.validations).toHaveLength(0);
    expect(result.summary.totalLinks).toBe(0);
    expect(result.summary.workingLinks).toBe(0);
    expect(result.summary.brokenLinks).toBe(0);
  });

  it("respects maxUrls limit", async () => {
    // Mock successful responses
    (global.fetch as any).mockImplementation(() => Promise.resolve({
      ok: true,
      status: 200,
      headers: { get: vi.fn().mockReturnValue("text/html") },
    } as unknown as Response);

    const result = await linkValidator.run({
      text: "URLs: https://one.com https://two.com https://three.com https://four.com",
      maxUrls: 2
    }, {
      logger: console,
    });

    expect(result.urls).toHaveLength(2); // Limited to 2
    expect(result.validations).toHaveLength(2);
  });
});