import { prisma } from "@/lib/prisma";
import { analyzeWithAgent } from "@/lib/documentAnalysis/agenticAnalysis";
import { logger } from "@/lib/logger";
import type { Agent } from "@/types/agentSchema";
import type { Document } from "@/types/documents";
import * as fs from "fs/promises";

async function testAgenticAnalysis() {
  try {
    // Get a test document
    const documentVersion = await prisma.documentVersion.findFirst({
      where: { 
        documentId: "JcM4O45bdrPM7qJr", // AI Intellectuals document
        content: { not: "" } 
      },
      orderBy: { version: "desc" }
    });

    if (!documentVersion) {
      throw new Error("Test document not found");
    }

    // Get document details
    const doc = await prisma.document.findUnique({
      where: { id: documentVersion.documentId }
    });

    if (!doc) {
      throw new Error("Document not found");
    }

    // Convert to Document type
    const document: Document = {
      id: doc.id,
      slug: doc.id,
      title: documentVersion.title,
      content: documentVersion.content,
      author: documentVersion.authors.join(", ") || "Unknown",
      publishedDate: doc.publishedDate.toISOString(),
      url: documentVersion.urls[0] || "",
      platforms: documentVersion.platforms,
      intendedAgents: documentVersion.intendedAgents,
      reviews: [],
    };

    // Get any agent with epistemic in the name, or just any agent
    const agentVersion = await prisma.agentVersion.findFirst({
      where: {
        name: { contains: "Epistemic" }
      },
      orderBy: { version: "desc" }
    }) || await prisma.agentVersion.findFirst({
      orderBy: { version: "desc" }
    });

    if (!agentVersion) {
      throw new Error("Agent not found");
    }

    // Convert to Agent type
    const agent: Agent = {
      id: agentVersion.agentId,
      version: agentVersion.version.toString(),
      name: agentVersion.name,
      description: agentVersion.description,
      primaryInstructions: agentVersion.primaryInstructions || `Analyze this document for:
1. Logical coherence and argument quality
2. Evidence quality and citations
3. Potential biases or assumptions
4. Clarity and persuasiveness
Provide specific critiques with exact quotes.`,
      selfCritiqueInstructions: agentVersion.selfCritiqueInstructions || undefined,
      providesGrades: agentVersion.providesGrades,
      extendedCapabilityId: agentVersion.extendedCapabilityId || undefined,
      readme: agentVersion.readme || undefined,
    };

    logger.info("Starting agentic analysis test", {
      documentTitle: document.title,
      documentLength: document.content?.length || 0,
      agentName: agent.name,
    });

    // Run agentic analysis
    console.log("\n=== STARTING AGENTIC ANALYSIS ===");
    const startTime = Date.now();
    
    const result = await analyzeWithAgent(document, agent, {
      maxTurns: 15,
      budget: 0.15,
      verbose: true,
    });
    
    const duration = Date.now() - startTime;

    // Display results
    console.log("\n=== AGENTIC ANALYSIS RESULTS ===");
    console.log(`Duration: ${duration}ms (${(duration/1000).toFixed(1)}s)`);
    console.log(`Total Cost: $${result.totalCost.toFixed(4)}`);
    console.log(`Turns Used: ${result.turnsUsed}`);
    console.log(`Comments: ${result.comments.length}`);
    console.log(`Grade: ${result.grade || "Not assigned"}/100`);
    
    console.log("\n=== TOOL USAGE ===");
    const toolUsage = result.toolCalls.reduce((acc, call) => {
      acc[call.tool] = (acc[call.tool] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(toolUsage).forEach(([tool, count]) => {
      console.log(`- ${tool}: ${count} calls`);
    });

    console.log("\n=== SUMMARY ===");
    console.log(result.summary);
    
    console.log("\n=== ANALYSIS PREVIEW (first 1500 chars) ===");
    console.log(result.analysis.substring(0, 1500) + "...");

    console.log("\n=== COMMENTS ===");
    result.comments.forEach((comment, i) => {
      console.log(`\n${i + 1}. [Importance: ${comment.importance}/10]`);
      console.log(`   "${comment.highlight.quotedText}"`);
      console.log(`   → ${comment.description}`);
    });

    console.log("\n=== TOOL CALL SEQUENCE ===");
    result.toolCalls.forEach((call, i) => {
      console.log(`\n${i + 1}. Turn ${call.turn}: ${call.tool}`);
      console.log(`   Input: ${JSON.stringify(call.input, null, 2).substring(0, 200)}...`);
      console.log(`   Result: ${call.result.substring(0, 150)}...`);
    });

    // Save detailed output
    const output = {
      metadata: {
        documentTitle: document.title,
        agentName: agent.name,
        duration,
        totalCost: result.totalCost,
        turnsUsed: result.turnsUsed,
      },
      result,
      toolCalls: result.toolCalls,
    };

    await fs.writeFile(
      "/tmp/agentic-analysis-output.json",
      JSON.stringify(output, null, 2),
      "utf-8"
    );
    console.log("\n📝 Full output saved to: /tmp/agentic-analysis-output.json");

    logger.info("Agentic analysis test completed", {
      documentId: document.id,
      agentName: agent.name,
      duration,
      cost: result.totalCost,
      turns: result.turnsUsed,
      comments: result.comments.length,
      grade: result.grade,
    });

    process.exit(0);
  } catch (error) {
    logger.error("Test failed", error);
    console.error("Test failed:", error);
    process.exit(1);
  }
}

// Run the test
testAgenticAnalysis();