import { prisma } from "@/lib/prisma";
import { analyzeWithClaudeCode } from "@/lib/documentAnalysis/claudeCodeAnalysis";
import { logger } from "@/lib/logger";
import type { Agent } from "@/types/agentSchema";
import type { Document } from "@/types/documents";

async function testClaudeCodeAgent() {
  try {
    // Get specific document
    const documentId = "JcM4O45bdrPM7qJr";
    const documentVersion = await prisma.documentVersion.findFirst({
      where: { 
        documentId: documentId,
        content: { not: "" } 
      },
      orderBy: { version: "desc" }
    });

    if (!documentVersion) {
      throw new Error("No test document found");
    }

    // Get the document details
    const doc = await prisma.document.findUnique({
      where: { id: documentVersion.documentId }
    });

    if (!doc) {
      throw new Error("Document not found");
    }

    // Convert to Document type
    const document: Document = {
      id: doc.id,
      slug: doc.id, // Using id as slug for simplicity
      title: documentVersion.title,
      content: documentVersion.content,
      author: documentVersion.authors.join(", ") || "Unknown",
      publishedDate: doc.publishedDate.toISOString(),
      url: documentVersion.urls[0] || "",
      platforms: documentVersion.platforms,
      intendedAgents: documentVersion.intendedAgents,
      reviews: [],
    };

    // Get any evaluation for this document
    const evaluation = await prisma.evaluation.findFirst({
      where: { documentId: documentId },
      include: {
        agent: {
          include: {
            versions: {
              orderBy: { version: "desc" },
              take: 1
            }
          }
        }
      }
    });

    let agentVersion;
    if (evaluation && evaluation.agent.versions[0]) {
      agentVersion = evaluation.agent.versions[0];
    } else {
      // Fallback to any agent
      agentVersion = await prisma.agentVersion.findFirst({
        orderBy: { createdAt: "desc" }
      });
    }

    if (!agentVersion) {
      throw new Error("No test agent found");
    }

    // Convert to Agent type with Claude Code enabled
    const agent: Agent = {
      id: agentVersion.agentId,
      version: agentVersion.version.toString(),
      name: agentVersion.name,
      description: agentVersion.description,
      primaryInstructions: agentVersion.primaryInstructions || undefined,
      selfCritiqueInstructions: agentVersion.selfCritiqueInstructions || undefined,
      providesGrades: agentVersion.providesGrades,
      extendedCapabilityId: agentVersion.extendedCapabilityId || undefined,
      readme: agentVersion.readme || undefined,
      // Enable Claude Code for testing
      useClaudeCode: true,
      claudeCodeBudget: 0.06,
    } as Agent & { useClaudeCode: boolean; claudeCodeBudget: number };

    logger.info("Test setup complete", {
      documentTitle: document.title,
      documentLength: document.content?.length || 0,
      agentName: agent.name,
    });

    // Run Claude Code analysis
    logger.info("Starting Claude Code analysis...");
    const claudeCodeStart = Date.now();
    
    const result = await analyzeWithClaudeCode(
      document,
      agent,
      { 
        budget: 0.06, 
        verbose: true,
        maxTurns: 2, // Number of iterations (each can have multiple Claude Code turns)
      }
    );
    
    const claudeCodeDuration = Date.now() - claudeCodeStart;

    // Display results
    console.log("\n=== CLAUDE CODE ANALYSIS RESULTS ===");
    console.log(`Duration: ${claudeCodeDuration}ms`);
    console.log(`Total Cost: $${result.totalCost.toFixed(4)}`);
    console.log(`Turns: ${result.turnCount}`);
    console.log(`Budget Used: ${result.budgetUsed.toFixed(1)}%`);
    console.log(`Abort Reason: ${result.abortReason}`);
    console.log(`Comments Extracted: ${result.comments.length}`);
    
    if (result.grade !== undefined) {
      console.log(`Grade: ${result.grade}/100`);
    }

    console.log("\n=== SUMMARY ===");
    console.log(result.summary);
    
    console.log("\n=== FULL ANALYSIS (first 2000 chars) ===");
    console.log(result.analysis.substring(0, 2000));

    console.log("\n=== COMMENTS ===");
    result.comments.forEach((comment, i) => {
      console.log(`\n${i + 1}. "${comment.highlight.quotedText}"`);
      console.log(`   ${comment.description}`);
    });

    console.log("\n=== CONVERSATION TURNS ===");
    result.conversation.forEach((msg, i) => {
      console.log(`\nTurn ${i + 1} - Type: ${msg.type}`);
      if (msg.type === "assistant") {
        const content = (msg as any).content;
        console.log(`Content preview: ${content?.substring(0, 200)}...`);
      }
    });

    // Log test results
    logger.info("Claude Code test completed", {
      documentId: document.id,
      agentName: agent.name,
      duration: claudeCodeDuration,
      cost: result.totalCost,
      turns: result.turnCount,
      comments: result.comments.length,
      grade: result.grade,
      abortReason: result.abortReason,
    });

    logger.info("Test completed successfully");
    process.exit(0);
  } catch (error) {
    logger.error("Test failed", error);
    console.error("Test failed:", error);
    process.exit(1);
  }
}

// Run the test
testClaudeCodeAgent();