import { prisma } from "@/lib/prisma";
import { analyzeWithMultiTurn } from "@/lib/documentAnalysis/multiTurnAnalysis";
import { logger } from "@/lib/logger";
import type { Agent } from "@/types/agentSchema";
import type { Document } from "@/types/documents";

async function testMultiTurnAnalysis() {
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

    // Convert to Agent type
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
    };

    logger.info("Test setup complete", {
      documentTitle: document.title,
      documentLength: document.content?.length || 0,
      agentName: agent.name,
    });

    // Run multi-turn analysis
    logger.info("Starting multi-turn analysis...");
    const startTime = Date.now();
    
    const result = await analyzeWithMultiTurn(
      document,
      agent,
      { 
        budget: 0.06, 
        verbose: true,
        maxTurns: 5,
        temperature: 0.7,
      }
    );
    
    const duration = Date.now() - startTime;

    // Display results
    console.log("\n=== MULTI-TURN ANALYSIS RESULTS ===");
    console.log(`Duration: ${duration}ms`);
    console.log(`Total Cost: $${result.totalCost.toFixed(4)}`);
    console.log(`Turns: ${result.turnCount}`);
    console.log(`Budget Used: ${result.budgetUsed.toFixed(1)}%`);
    console.log(`Comments Extracted: ${result.comments.length}`);
    
    if (result.grade !== undefined) {
      console.log(`Grade: ${result.grade}/100`);
    }

    console.log("\n=== SUMMARY ===");
    console.log(result.summary);
    
    console.log("\n=== ANALYSIS PREVIEW (first 1000 chars) ===");
    console.log(result.analysis.substring(0, 1000) + "...");

    console.log("\n=== COMMENTS ===");
    result.comments.forEach((comment, i) => {
      console.log(`\n${i + 1}. "${comment.highlight.quotedText}"`);
      console.log(`   ${comment.description}`);
    });

    console.log("\n=== CONVERSATION TURNS ===");
    result.conversationHistory.forEach((msg, i) => {
      const preview = msg.content.substring(0, 150).replace(/\n/g, ' ');
      console.log(`\nTurn ${i + 1} [${msg.role}]: ${preview}...`);
    });

    logger.info("Multi-turn test completed successfully", {
      documentId: document.id,
      agentName: agent.name,
      duration,
      cost: result.totalCost,
      turns: result.turnCount,
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
testMultiTurnAnalysis();