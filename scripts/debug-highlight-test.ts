#!/usr/bin/env npx tsx

/**
 * Debug script to investigate why the second highlight is being dropped
 * in the comprehensive analysis unit test
 */

import { extractHighlightsFromAnalysis } from "../src/lib/documentAnalysis/highlightExtraction";
import type { Agent } from "../src/types/agentSchema";
import type { Document } from "../src/types/documents";
import type { ComprehensiveAnalysisOutputs } from "../src/lib/documentAnalysis/comprehensiveAnalysis";

// Set up test data that matches the unit test
const mockAgent: Agent = {
  id: "test-agent-1",
  name: "Test Agent",
  version: "1.0",
  description: "A test agent",
  primaryInstructions: "Test instructions",
  providesGrades: true,
};

const mockDocument: Document = {
  id: "test-doc-1",
  slug: "test-doc",
  title: "Test Document",
  content: "Line 1: This is a test document.\nLine 2: It has multiple lines.\nLine 3: For testing purposes.",
  author: "Test Author",
  publishedDate: "2024-01-01",
  reviews: [],
  intendedAgents: ["test-agent-1"],
};

const mockAnalysisOutputs: ComprehensiveAnalysisOutputs = {
  summary: "Test summary",
  analysis: "Test analysis with insights",
  grade: 85,
  highlightInsights: [
    {
      id: "insight-1",
      location: "Lines 1",
      suggestedHighlight: "Test Highlight 1. This is the first highlight text",
    },
    {
      id: "insight-2",
      location: "Lines 2-3",
      suggestedHighlight: "Test Highlight 2. This is the second highlight text",
    },
  ],
};

async function debug() {
  console.log("=== Debug Highlight Extraction ===\n");
  
  console.log("Document content:");
  console.log(mockDocument.content);
  console.log("\nDocument lines:");
  mockDocument.content.split('\n').forEach((line, idx) => {
    console.log(`Line ${idx + 1}: "${line}"`);
  });
  
  console.log("\n=== Starting extraction ===\n");
  
  try {
    const result = await extractHighlightsFromAnalysis(
      mockDocument,
      mockAgent,
      mockAnalysisOutputs,
      2
    );
    
    console.log("\n=== Extraction Result ===");
    console.log(`Number of highlights extracted: ${result.outputs.highlights.length}`);
    console.log(`Expected: 2`);
    
    result.outputs.highlights.forEach((highlight, idx) => {
      console.log(`\nHighlight ${idx + 1}:`);
      console.log(`  Description: ${highlight.description}`);
      console.log(`  Start Offset: ${highlight.highlight.startOffset}`);
      console.log(`  End Offset: ${highlight.highlight.endOffset}`);
      console.log(`  Quoted Text: "${highlight.highlight.quotedText}"`);
      console.log(`  Is Valid: ${highlight.isValid}`);
    });
    
    // Check what text is at the offsets
    console.log("\n=== Verify Offsets ===");
    result.outputs.highlights.forEach((highlight, idx) => {
      const start = highlight.highlight.startOffset;
      const end = highlight.highlight.endOffset;
      const extractedText = mockDocument.content.substring(start, end);
      console.log(`\nHighlight ${idx + 1} extracted text:`);
      console.log(`  "${extractedText}"`);
      console.log(`  Matches quoted text: ${extractedText === highlight.highlight.quotedText}`);
    });
    
  } catch (error) {
    console.error("\n=== Error during extraction ===");
    console.error(error);
  }
}

// Add detailed logging to trace the execution
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleDebug = console.debug;

// Intercept logger calls to see what's happening
console.log = (...args: any[]) => {
  if (args[0]?.includes?.('🔍') || args[0]?.includes?.('Location finder') || args[0]?.includes?.('Processing highlight')) {
    originalConsoleLog('[LOG]', ...args);
  }
  originalConsoleLog(...args);
};

console.warn = (...args: any[]) => {
  originalConsoleWarn('[WARN]', ...args);
};

console.debug = (...args: any[]) => {
  originalConsoleDebug('[DEBUG]', ...args);
};

// Run the debug script
debug().catch(console.error);