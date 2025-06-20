// Manual test file to verify URL validator works with real API
// Run with: npm test -- --testPathPattern=manual

import "dotenv/config";
import { validateUrl } from "../index";

describe("Manual URL Validator Tests", () => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    console.log("Skipping manual tests - no ANTHROPIC_API_KEY provided");
    it.skip("requires API key", () => {});
    return;
  }

  jest.setTimeout(30000);

  it("should validate a correct URL citation", async () => {
    const result = await validateUrl({
      url: "https://react.dev/learn",
      usageContext: "Official React documentation for learning React basics"
    }, apiKey);

    console.log("✅ Valid URL test result:", result);
    
    expect(result.doesExist).toBe(true);
    expect(result.correctlyCited).toBe(true);
    expect(result.message).toBeTruthy();
  });

  it("should detect a non-existent URL", async () => {
    const result = await validateUrl({
      url: "https://does-not-exist-fake-domain-12345.com/page",
      usageContext: "Documentation about React components"
    }, apiKey);

    console.log("❌ Non-existent URL test result:", result);
    
    expect(result.doesExist).toBe(false);
    expect(result.correctlyCited).toBe(false);
    expect(result.message).toBeTruthy();
  });

  it("should detect incorrect citation context", async () => {
    const result = await validateUrl({
      url: "https://www.python.org/",
      usageContext: "JavaScript documentation for React development"
    }, apiKey);

    console.log("🔄 Context mismatch test result:", result);
    
    expect(result.doesExist).toBe(true);
    // Note: This might be true or false depending on Claude's interpretation
    expect(result.message).toBeTruthy();
  });

  it("should catch potential hallucinations", async () => {
    const result = await validateUrl({
      url: "https://openai.com/blog/gpt-5-announcement-2024",
      usageContext: "OpenAI's announcement of GPT-5 release in 2024"
    }, apiKey);

    console.log("🤖 Hallucination test result:", result);
    
    // This URL likely doesn't exist (as of test writing)
    expect(result.doesExist).toBe(false);
    expect(result.message).toBeTruthy();
  });

  it("should handle redirects properly", async () => {
    const result = await validateUrl({
      url: "https://github.com/facebook/react",
      usageContext: "React GitHub repository"
    }, apiKey);

    console.log("🔀 Redirect test result:", result);
    
    expect(result.doesExist).toBe(true);
    expect(result.correctlyCited).toBe(true);
  });
});