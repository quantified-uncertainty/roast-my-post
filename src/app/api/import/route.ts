import {
  NextRequest,
  NextResponse,
} from "next/server";

import { auth } from "@/lib/auth";
import { authenticateApiKey } from "@/lib/auth-api";
import { processArticle } from "@/lib/articleImport";
import { DocumentModel } from "@/models/Document";
import { prisma } from "@/lib/prisma";


export async function POST(request: NextRequest) {
  try {
    // Try API key authentication first
    const apiAuth = await authenticateApiKey(request);
    let userId: string | undefined;
    
    if (apiAuth) {
      userId = apiAuth.userId;
    } else {
      // Fall back to session authentication
      const session = await auth();
      userId = session?.user?.id;
    }

    if (!userId) {
      return NextResponse.json(
        { error: "User must be logged in to import a document" },
        { status: 401 }
      );
    }

    const { url, importUrl, agentIds } = await request.json();
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Validate agentIds if provided
    if (agentIds && !Array.isArray(agentIds)) {
      return NextResponse.json({ error: "agentIds must be an array" }, { status: 400 });
    }

    // Use the shared article processing library
    const processedArticle = await processArticle(url);

    const documentData = {
      title: processedArticle.title,
      authors: processedArticle.author,
      content: processedArticle.content,
      urls: processedArticle.url,
      platforms: processedArticle.platforms.join(", "),
      importUrl: importUrl || url,
    };

    console.log("💾 Creating document...");
    const document = await DocumentModel.create({
      ...documentData,
      submittedById: userId,
    });

    const latestVersion = document.versions[document.versions.length - 1];
    
    // Create evaluations and jobs if agentIds are provided
    const createdEvaluations = [];
    if (agentIds && agentIds.length > 0) {
      console.log(`📋 Creating evaluations for ${agentIds.length} agents...`);
      
      for (const agentId of agentIds) {
        try {
          // Create evaluation and job in a transaction
          const result = await prisma.$transaction(async (tx) => {
            // Create the evaluation
            const evaluation = await tx.evaluation.create({
              data: {
                documentId: document.id,
                agentId: agentId,
              },
            });

            // Create the job
            const job = await tx.job.create({
              data: {
                evaluationId: evaluation.id,
              },
            });

            return { evaluation, job };
          });

          createdEvaluations.push({
            evaluationId: result.evaluation.id,
            agentId: agentId,
            jobId: result.job.id,
          });
        } catch (error) {
          console.error(`❌ Failed to create evaluation for agent ${agentId}:`, error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      documentId: document.id,
      document: {
        id: document.id,
        title: latestVersion.title,
        authors: latestVersion.authors,
      },
      evaluations: createdEvaluations,
    });
  } catch (error) {
    console.error("❌ Error importing document:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to import document",
      },
      { status: 500 }
    );
  }
}
