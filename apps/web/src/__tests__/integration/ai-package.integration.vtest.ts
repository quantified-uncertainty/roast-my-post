/**
 * Integration test to verify @roast/ai package works correctly
 * when imported and used in the web application.
 */

import { describe, it, expect } from 'vitest';
import { type Agent, type Document } from "@roast/ai";
import { callClaude, checkSpellingGrammarTool, MathPlugin, PluginManager } from "@roast/ai/server";

describe("@roast/ai Package Integration in Web App", () => {
  it("should import and use AI package exports", () => {
    // Verify core functions are available
    expect(callClaude).toBeDefined();
    expect(typeof callClaude).toBe("function");


    // Verify tools are available
    expect(checkSpellingGrammarTool).toBeDefined();
    expect(checkSpellingGrammarTool.config.name).toBe("Spelling & Grammar Checker");

    // Verify plugin system is available
    expect(PluginManager).toBeDefined();
    expect(MathPlugin).toBeDefined();
  });

  it("should use AI package types", () => {
    // This verifies TypeScript compilation with the types
    const testAgent: Agent = {
      id: "test-agent",
      name: "Test Agent",
      version: "1.0",
      description: "Integration test agent",
      providesGrades: false,
    };

    const testDoc: Document = {
      id: "test-doc",
      slug: "test-doc",
      title: "Test Document",
      content: "Test content",
      author: "Test Author",
      url: "https://example.com",
      publishedDate: new Date().toISOString(),
      reviews: [],
      intendedAgents: [],
    };

    expect(testAgent.id).toBe("test-agent");
    expect(testDoc.id).toBe("test-doc");
  });

  it("should access plugin configuration", () => {
    const mathPlugin = new MathPlugin();
    expect(mathPlugin.name()).toBe("MATH");
    expect(mathPlugin.name()).toBeDefined();
  });
});