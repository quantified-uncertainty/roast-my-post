import { describe, expect, it } from "vitest";

import { asProviderAccessError, ProviderAccessError } from "./providerErrors";

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

  it("does not classify ordinary analysis errors as provider access failures", () => {
    expect(
      asProviderAccessError(new Error("Invalid JSON output"))
    ).toBeUndefined();
    expect(
      asProviderAccessError({ status: 400, message: "Invalid request" })
    ).toBeUndefined();
  });
});
