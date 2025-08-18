import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
/**
 * Test for plugin IDs array functionality in analyzeDocument
 */

import { analyzeDocument } from "../analyzeDocument";
import { PluginType } from "../../../analysis-plugins/types/plugin-types";
import type { Agent } from "../../../types/agentSchema";
import type { Document } from "../../../types/documents";

// Mock the unified workflow since we're testing routing logic
vi.mock("../unified", () => ({
  analyzeDocumentUnified: vi.fn().mockImplementation(() => Promise.resolve({
    thinking: "Mock thinking from unified workflow",
    analysis: "Mock analysis from unified workflow", 
    summary: "Mock summary from unified workflow",
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

    it("should throw error when no pluginIds provided", async () => {
      const mockAgent: Agent = {
        id: "test-agent",
        version: "1",
        name: "Test Agent", 
        description: "Test agent without plugin IDs",
        providesGrades: false
      };

      await expect(analyzeDocument(mockDocument, mockAgent)).rejects.toThrow(
        /Agent Test Agent has no valid plugins/
      );
    });

    it("should throw error when pluginIds array is empty", async () => {
      const mockAgent: Agent = {
        id: "test-agent",
        version: "1",
        name: "Test Agent", 
        description: "Test agent with empty plugin IDs",
        pluginIds: [],
        providesGrades: false
      };

      await expect(analyzeDocument(mockDocument, mockAgent)).rejects.toThrow(
        /Agent Test Agent has no valid plugins/
      );
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

      const { analyzeDocumentUnified } = require("../unified");
      
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

    it("should throw error when all plugin IDs are invalid", async () => {
      const mockAgent: Agent = {
        id: "test-agent",
        version: "1",
        name: "Test Agent",
        description: "Test agent with all invalid plugins",
        pluginIds: ["INVALID1" as any, "INVALID2" as any],
        providesGrades: false
      };

      await expect(analyzeDocument(mockDocument, mockAgent)).rejects.toThrow(
        /Agent Test Agent has no valid plugins/
      );
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

      const { analyzeDocumentUnified } = require("../unified");
      
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

      const { analyzeDocumentUnified } = require("../unified");
      
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