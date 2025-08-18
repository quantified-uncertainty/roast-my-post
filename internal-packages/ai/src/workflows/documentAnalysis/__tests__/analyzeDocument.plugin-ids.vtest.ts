import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
/**
 * Test for plugin IDs array functionality in analyzeDocument
 */

import { analyzeDocument } from "../analyzeDocument";
import { PluginType } from "../../../analysis-plugins/types/plugin-types";
import type { Agent } from "../../../types/agentSchema";
import type { Document } from "../../../types/documents";

// Mock the unified workflow since we're testing routing logic
vi.mock("../unified/index", () => ({
  analyzeDocumentUnified: vi.fn().mockImplementation(() => Promise.resolve({
    thinking: "Mock thinking from unified workflow",
    analysis: "Mock analysis from unified workflow", 
    summary: "Mock summary from unified workflow",
    highlights: [],
    tasks: [],
    jobLogString: "Mock job log"
  }))
}));

// Mock the LLM workflow components
vi.mock("../comprehensiveAnalysis", () => ({
  generateComprehensiveAnalysis: vi.fn().mockImplementation(() => Promise.resolve({
    outputs: {
      thinking: "Mock LLM thinking",
      analysis: "Mock LLM analysis",
      summary: "Mock LLM summary",
      grade: undefined
    },
    task: {
      name: "comprehensiveAnalysis",
      metadata: { logMessage: "Mock log" }
    }
  }))
}));

vi.mock("../highlightExtraction", () => ({
  extractHighlightsFromAnalysis: vi.fn().mockImplementation(() => Promise.resolve({
    outputs: {
      highlights: []
    },
    task: {
      name: "highlightExtraction",
      metadata: { logMessage: "Mock log" }
    }
  }))
}));

vi.mock("../selfCritique", () => ({
  generateSelfCritique: vi.fn().mockImplementation(() => Promise.resolve({
    outputs: {
      selfCritique: "Mock self critique"
    },
    task: {
      name: "selfCritique",
      metadata: { logMessage: "Mock log" }
    }
  }))
}));

import { analyzeDocumentUnified } from "../unified/index";

describe("analyzeDocument with pluginIds", () => {
  const mockDocument: Document = {
    id: "test-doc",
    title: "Test Document",
    content: "This is a test document content.",
    authors: ["Test Author"],
    publishedDate: new Date("2024-01-01"),
    platforms: [],
    urls: []
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Plugin-based routing", () => {
    it("should use unified workflow when pluginIds are specified", async () => {
      const mockAgent: Agent = {
        id: "test-agent",
        version: "1",
        name: "Test Agent",
        description: "Test agent with plugin IDs",
        pluginIds: [PluginType.SPELLING, PluginType.MATH],
        providesGrades: false
      };

      // analyzeDocumentUnified is already mocked at the top of the file
      
      const result = await analyzeDocument(mockDocument, mockAgent, 500, 5, "test-job-id");

      expect(analyzeDocumentUnified).toHaveBeenCalledWith(mockDocument, mockAgent, {
        targetHighlights: 5,
        jobId: "test-job-id",
        plugins: {
          include: [PluginType.SPELLING, PluginType.MATH]
        }
      });

      expect(result.thinking).toBe("Mock thinking from unified workflow");
      expect(result.analysis).toBe("Mock analysis from unified workflow");
    });

    it("should handle single plugin ID", async () => {
      const mockAgent: Agent = {
        id: "test-agent",
        version: "1", 
        name: "Test Agent",
        description: "Test agent with single plugin",
        pluginIds: [PluginType.LINK_ANALYSIS],
        providesGrades: false
      };

      // analyzeDocumentUnified is already mocked at the top of the file
      
      await analyzeDocument(mockDocument, mockAgent);

      expect(analyzeDocumentUnified).toHaveBeenCalledWith(mockDocument, mockAgent, {
        targetHighlights: 5,
        jobId: undefined,
        plugins: {
          include: [PluginType.LINK_ANALYSIS]
        }
      });
    });

    it("should fallback to LLM workflow when no pluginIds provided", async () => {
      const mockAgent: Agent = {
        id: "test-agent",
        version: "1",
        name: "Test Agent", 
        description: "Test agent without plugin IDs",
        providesGrades: false
      };

      const result = await analyzeDocument(mockDocument, mockAgent);
      
      // analyzeDocumentUnified should NOT have been called
      expect(analyzeDocumentUnified).not.toHaveBeenCalled();
      
      // Should return a valid result from the LLM workflow
      expect(result).toBeDefined();
      expect(result.analysis).toBeDefined();
    });

    it("should fallback to LLM workflow when pluginIds array is empty", async () => {
      const mockAgent: Agent = {
        id: "test-agent",
        version: "1",
        name: "Test Agent", 
        description: "Test agent with empty plugin IDs",
        pluginIds: [],
        providesGrades: false
      };

      const result = await analyzeDocument(mockDocument, mockAgent);
      
      // analyzeDocumentUnified should NOT have been called
      expect(analyzeDocumentUnified).not.toHaveBeenCalled();
      
      // Should return a valid result from the LLM workflow
      expect(result).toBeDefined();
      expect(result.analysis).toBeDefined();
    });
  });

  describe("Plugin validation", () => {
    it("should filter out invalid plugin IDs and use only valid ones", async () => {
      const mockAgent: Agent = {
        id: "test-agent",
        version: "1",
        name: "Test Agent",
        description: "Test agent with mixed valid/invalid plugins",
        pluginIds: [PluginType.SPELLING, "INVALID_PLUGIN" as any, PluginType.MATH],
        providesGrades: false
      };

      // analyzeDocumentUnified is already mocked at the top of the file
      
      await analyzeDocument(mockDocument, mockAgent);

      // Should only pass valid plugins to unified workflow
      expect(analyzeDocumentUnified).toHaveBeenCalledWith(mockDocument, mockAgent, {
        targetHighlights: 5,
        jobId: undefined,
        plugins: {
          include: [PluginType.SPELLING, PluginType.MATH]
        }
      });
    });

    it("should fallback to LLM workflow when all plugin IDs are invalid", async () => {
      const mockAgent: Agent = {
        id: "test-agent",
        version: "1",
        name: "Test Agent",
        description: "Test agent with all invalid plugins",
        pluginIds: ["INVALID1" as any, "INVALID2" as any],
        providesGrades: false
      };

      // Should not call analyzeDocumentUnified when no valid plugins
      const result = await analyzeDocument(mockDocument, mockAgent);
      
      // analyzeDocumentUnified should NOT have been called
      expect(analyzeDocumentUnified).not.toHaveBeenCalled();
      
      // Should return a valid result from the LLM workflow
      expect(result).toBeDefined();
      expect(result.analysis).toBeDefined();
      expect(result.summary).toBeDefined();
    });
  });

  describe("Multiple plugin combinations", () => {
    it("should handle epistemic verification plugins", async () => {
      const mockAgent: Agent = {
        id: "test-agent",
        version: "1",
        name: "Epistemic Verification Agent",
        description: "Test agent with multiple epistemic plugins",
        pluginIds: [PluginType.FACT_CHECK, PluginType.MATH, PluginType.FORECAST],
        providesGrades: false
      };

      // analyzeDocumentUnified is already mocked at the top of the file
      
      await analyzeDocument(mockDocument, mockAgent);

      expect(analyzeDocumentUnified).toHaveBeenCalledWith(mockDocument, mockAgent, {
        targetHighlights: 5,
        jobId: undefined,
        plugins: {
          include: [PluginType.FACT_CHECK, PluginType.MATH, PluginType.FORECAST]
        }
      });
    });

    it("should handle all available plugins", async () => {
      const allPlugins = Object.values(PluginType);
      const mockAgent: Agent = {
        id: "test-agent",
        version: "1",
        name: "All Plugins Agent",
        description: "Test agent with all available plugins",
        pluginIds: allPlugins,
        providesGrades: false
      };

      // analyzeDocumentUnified is already mocked at the top of the file
      
      await analyzeDocument(mockDocument, mockAgent);

      expect(analyzeDocumentUnified).toHaveBeenCalledWith(mockDocument, mockAgent, {
        targetHighlights: 5,
        jobId: undefined,
        plugins: {
          include: allPlugins
        }
      });
    });
  });
});