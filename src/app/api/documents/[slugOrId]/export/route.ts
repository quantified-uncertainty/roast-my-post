import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { DocumentModel } from "@/models/Document";
import yaml from "js-yaml";
import type { Document, Evaluation, Comment } from "@/types/documentSchema";

function documentToMarkdown(doc: Document): string {
  const metadata = [
    `# ${doc.title}`,
    "",
    "## Metadata",
    `- **ID**: ${doc.id}`,
    `- **Published**: ${doc.publishedDate}`,
    `- **Author**: ${doc.author || "Unknown"}`,
    `- **Platforms**: ${doc.platforms?.join(", ") || "N/A"}`,
    doc.url ? `- **URL**: ${doc.url}` : null,
    doc.importUrl ? `- **Import URL**: ${doc.importUrl}` : null,
    "",
    "## Content",
    "",
    doc.content,
  ].filter(Boolean).join("\n");

  // Add evaluations if any
  if (doc.reviews && doc.reviews.length > 0) {
    const evalSection = [
      "",
      "## Evaluations",
      "",
    ];

    doc.reviews.forEach((review: Evaluation) => {
      evalSection.push(`### ${review.agent.name}`);
      evalSection.push("");
      evalSection.push(`**Description**: ${review.agent.description}`);
      evalSection.push("");
      
      if (review.summary) {
        evalSection.push("**Summary**:");
        evalSection.push(review.summary);
        evalSection.push("");
      }

      if (review.analysis) {
        evalSection.push("**Analysis**:");
        evalSection.push(review.analysis);
        evalSection.push("");
      }

      if (review.grade !== null && review.grade !== undefined) {
        evalSection.push(`**Grade**: ${review.grade}/10`);
        evalSection.push("");
      }

      if (review.comments && review.comments.length > 0) {
        evalSection.push("**Comments**:");
        review.comments.forEach((comment: Comment, idx: number) => {
          evalSection.push(`${idx + 1}. ${comment.description}`);
          if (comment.highlight?.quotedText) {
            evalSection.push(`   > "${comment.highlight.quotedText}"`);
          }
          if (comment.importance !== null && comment.importance !== undefined) {
            evalSection.push(`   Importance: ${comment.importance}/10`);
          }
        });
        evalSection.push("");
      }
    });

    return metadata + evalSection.join("\n");
  }

  return metadata;
}

function documentToYAML(doc: Document): string {
  const exportData: Record<string, any> = {
    id: doc.id,
    title: doc.title,
    publishedDate: doc.publishedDate,
    metadata: {
      author: doc.author,
      platforms: doc.platforms,
      url: doc.url,
      importUrl: doc.importUrl,
      intendedAgents: doc.intendedAgents,
    },
    content: doc.content,
  };

  if (doc.reviews && doc.reviews.length > 0) {
    exportData.evaluations = doc.reviews.map((review: Evaluation) => ({
      agent: {
        id: review.agent.id,
        name: review.agent.name,
        description: review.agent.description,
      },
      evaluation: {
        summary: review.summary,
        analysis: review.analysis,
        grade: review.grade,
        comments: review.comments?.map((comment: Comment) => ({
          description: comment.description,
          importance: comment.importance,
          grade: comment.grade,
          highlight: comment.highlight ? {
            quotedText: comment.highlight.quotedText,
            startOffset: comment.highlight.startOffset,
            endOffset: comment.highlight.endOffset,
          } : null,
        })),
      },
    }));
  }

  return yaml.dump(exportData, { 
    noRefs: true, 
    sortKeys: false,
    lineWidth: -1,
  });
}

function documentToJSON(doc: Document): Record<string, any> {
  const exportData: Record<string, any> = {
    id: doc.id,
    title: doc.title,
    publishedDate: doc.publishedDate,
    metadata: {
      author: doc.author,
      platforms: doc.platforms,
      url: doc.url,
      importUrl: doc.importUrl,
      intendedAgents: doc.intendedAgents,
      submittedBy: doc.submittedBy,
    },
    content: doc.content,
  };

  if (doc.reviews && doc.reviews.length > 0) {
    exportData.evaluations = doc.reviews.map((review: Evaluation) => ({
      agent: {
        id: review.agent.id,
        name: review.agent.name,
        description: review.agent.description,
      },
      evaluation: {
        summary: review.summary,
        analysis: review.analysis,
        grade: review.grade,
        selfCritique: review.selfCritique,
        comments: review.comments?.map((comment: Comment) => ({
          description: comment.description,
          importance: comment.importance,
          grade: comment.grade,
          highlight: comment.highlight ? {
            quotedText: comment.highlight.quotedText,
            startOffset: comment.highlight.startOffset,
            endOffset: comment.highlight.endOffset,
            isValid: comment.highlight.isValid,
          } : null,
        })),
      },
    }));
  }

  return exportData;
}

export async function GET(req: NextRequest, context: { params: Promise<{ slugOrId: string }> }) {
  const params = await context.params;
  const { slugOrId: id } = params;
  const searchParams = req.nextUrl.searchParams;
  const format = searchParams.get('format') || 'json';

  try {
    // Use the DocumentModel to get a formatted document with all evaluations
    const document = await DocumentModel.getDocumentWithEvaluations(id);

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Return based on format
    switch (format.toLowerCase()) {
      case 'md':
      case 'markdown':
        const markdown = documentToMarkdown(document);
        return new NextResponse(markdown, {
          headers: {
            'Content-Type': 'text/markdown; charset=utf-8',
            'Content-Disposition': `attachment; filename="${id}.md"`,
          },
        });

      case 'yaml':
      case 'yml':
        const yamlContent = documentToYAML(document);
        return new NextResponse(yamlContent, {
          headers: {
            'Content-Type': 'text/yaml; charset=utf-8',
            'Content-Disposition': `attachment; filename="${id}.yaml"`,
          },
        });

      case 'json':
      default:
        const jsonData = documentToJSON(document);
        return NextResponse.json(jsonData, {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Disposition': `attachment; filename="${id}.json"`,
          },
        });
    }
  } catch (error) {
    logger.error('Error exporting document:', error);
    return NextResponse.json(
      { error: "Failed to export document" },
      { status: 500 }
    );
  }
}