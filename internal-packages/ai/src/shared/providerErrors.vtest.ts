import { describe, expect, it } from "vitest";

import {
  asProviderAccessError,
  asProviderAccessResult,
  ProviderAccessError,
} from "./providerErrors";

describe("provider access errors", () => {
  it("recognizes the Anthropic low-credit response seen in production", () => {
    const error = Object.assign(
      new Error(
        "400: Your credit balance is too low to access the Anthropic API."
      ),
      { status: 400 }
    );

    const result = asProviderAccessError(error);

    expect(result).toBeInstanceOf(ProviderAccessError);
    expect(result?.message).toBe(
      "AI provider credit balance is too low. Please try again later."
    );
  });

  it("recognizes provider billing and authentication status codes", () => {
    expect(asProviderAccessError({ status: 402 })).toBeInstanceOf(
      ProviderAccessError
    );
    expect(asProviderAccessError({ response: { status: 401 } })).toBeInstanceOf(
      ProviderAccessError
    );
  });

  it("recognizes missing Anthropic and OpenRouter credentials", () => {
    expect(
      asProviderAccessError(
        new Error("Missing Anthropic API key. Set ANTHROPIC_API_KEY in .env")
      )
    ).toBeInstanceOf(ProviderAccessError);
    expect(
      asProviderAccessError(
        new Error("OpenRouter API key is required for Perplexity integration")
      )
    ).toBeInstanceOf(ProviderAccessError);
  });

  it("reads Anthropic payloads attached to Error instances", () => {
    const error = Object.assign(new Error("Request failed"), {
      status: 400,
      error: {
        type: "error",
        error: {
          type: "invalid_request_error",
          message: "Your credit balance is too low",
        },
      },
    });

    expect(asProviderAccessError(error)).toBeInstanceOf(ProviderAccessError);
  });

  it("only classifies complete Agent SDK provider-error results", () => {
    expect(asProviderAccessResult("Credit balance is too low")).toBeInstanceOf(
      ProviderAccessError
    );
    expect(
      asProviderAccessResult(
        'Malformed analysis quoting the document: "payment required"'
      )
    ).toBeUndefined();
  });

  it("does not classify ordinary analysis errors as provider access failures", () => {
    expect(
      asProviderAccessError(new Error("Invalid JSON output"))
    ).toBeUndefined();
    expect(
      asProviderAccessError({ status: 400, message: "Invalid request" })
    ).toBeUndefined();
    expect(
      asProviderAccessError(
        new Error("EACCES: permission denied, mkdir /tmp/job")
      )
    ).toBeUndefined();
    expect(
      asProviderAccessError(new Error("Insufficient funds for transfer"))
    ).toBeUndefined();
    expect(
      asProviderAccessError(new Error("ENOSPC: disk quota exceeded"))
    ).toBeUndefined();
  });
});
