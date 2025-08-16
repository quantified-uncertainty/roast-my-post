/**
 * Test for new plugin IDs array functionality in analyzeDocument
 */

import { analyzeDocument } from "../analyzeDocument";
import { PluginType } from "../../../analysis-plugins/types/plugin-types";
import type { Agent } from "../../../types/agentSchema";
import type { Document } from "../../../types/documents";

// Mock the unified workflow since we're testing routing logic
jest.mock("../unified", () => ({
  analyzeDocumentUnified: jest.fn().mockResolvedValue({
    thinking: "Mock thinking from unified workflow",
    analysis: "Mock analysis from unified workflow", 
    summary: "Mock summary from unified workflow",
    highlights: [],
    tasks: [],
    jobLogString: "Mock job log"
  })
}));

// Mock legacy workflows for backward compatibility tests
jest.mock("../linkAnalysis", () => ({
  analyzeLinkDocument: jest.fn().mockResolvedValue({
    thinking: "Mock thinking from link analysis",
    analysis: "Mock analysis from link analysis",
    summary: "Mock summary from link analysis", 
    highlights: [],
    tasks: [],
    jobLogString: "Mock job log"
  })
}));

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
    jest.clearAllMocks();
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

      const { analyzeDocumentUnified } = require("../unified");
      
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

      const { analyzeDocumentUnified } = require("../unified");
      
      await analyzeDocument(mockDocument, mockAgent);

      expect(analyzeDocumentUnified).toHaveBeenCalledWith(mockDocument, mockAgent, {
        targetHighlights: 5,
        jobId: undefined,
        plugins: {
          include: [PluginType.LINK_ANALYSIS]
        }
      });
    });

    it("should handle empty pluginIds array by falling back to legacy logic", async () => {
      const mockAgent: Agent = {
        id: "test-agent",
        version: "1",
        name: "Test Agent", 
        description: "Test agent with empty plugin IDs",
        pluginIds: [],
        extendedCapabilityId: "simple-link-verifier",
        providesGrades: false
      };

      const { analyzeLinkDocument } = require("../linkAnalysis");
      
      await analyzeDocument(mockDocument, mockAgent);

      expect(analyzeLinkDocument).toHaveBeenCalledWith(mockDocument, mockAgent, 5);
    });
  });

  describe("Backward compatibility", () => {
    it("should fall back to legacy extendedCapabilityId when no pluginIds", async () => {
      const mockAgent: Agent = {
        id: "test-agent",
        version: "1",
        name: "Test Agent",
        description: "Test agent without plugin IDs",
        extendedCapabilityId: "simple-link-verifier",
        providesGrades: false
      };

      const { analyzeLinkDocument } = require("../linkAnalysis");
      
      await analyzeDocument(mockDocument, mockAgent);

      expect(analyzeLinkDocument).toHaveBeenCalledWith(mockDocument, mockAgent, 5);
    });

    it("should prioritize pluginIds over extendedCapabilityId when both are present", async () => {
      const mockAgent: Agent = {
        id: "test-agent",
        version: "1",
        name: "Test Agent",
        description: "Test agent with both pluginIds and extendedCapabilityId",
        pluginIds: [PluginType.MATH],
        extendedCapabilityId: "simple-link-verifier", // This should be ignored
        providesGrades: false
      };

      const { analyzeDocumentUnified } = require("../unified");
      const { analyzeLinkDocument } = require("../linkAnalysis");
      
      await analyzeDocument(mockDocument, mockAgent);

      expect(analyzeDocumentUnified).toHaveBeenCalledWith(mockDocument, mockAgent, {
        targetHighlights: 5,
        jobId: undefined,
        plugins: {
          include: [PluginType.MATH]
        }
      });
      
      // Legacy workflow should NOT be called
      expect(analyzeLinkDocument).not.toHaveBeenCalled();
    });
  });
});