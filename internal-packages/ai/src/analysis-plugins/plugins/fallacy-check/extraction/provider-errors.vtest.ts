import { describe, expect, it, vi } from "vitest";

import { ProviderAccessError } from "../../../../shared/providerErrors";
import fallacyExtractorTool from "../../../../tools/fallacy-extractor";
import { runMultiExtractor } from "./multiExtractor";

vi.mock("../../../../tools/fallacy-extractor", () => ({
  default: { execute: vi.fn() },
}));

describe("multi-extractor provider failures", () => {
  it("propagates provider failures instead of returning an empty result", async () => {
    vi.mocked(fallacyExtractorTool.execute).mockRejectedValue(
      new ProviderAccessError("AI provider credit balance is too low")
    );

    await expect(
      runMultiExtractor("Document text", {
        extractors: [{ model: "anthropic/test" }],
        judge: { model: "anthropic/test", enabled: false },
      })
    ).rejects.toBeInstanceOf(ProviderAccessError);
  });
});
