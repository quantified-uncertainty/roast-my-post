import yaml from 'js-yaml';
import type { Document, Evaluation, Comment } from '@/shared/types/databaseTypes';

/**
 * Interface for document exporters
 */
interface DocumentExporter {
  export(doc: Document): string | Record<string, unknown>;
  getContentType(): string;
  getFileName(docId: string): string;
}

/**
 * Base class for document exporters with common functionality
 */
abstract class BaseDocumentExporter implements DocumentExporter {
  abstract export(doc: Document): string | Record<string, unknown>;
  abstract getContentType(): string;
  abstract getFileName(docId: string): string;

  /**
   * Common method to extract evaluation data
   */
  protected extractEvaluations(reviews?: Evaluation[]) {
    if (!reviews || reviews.length === 0) return null;

    return reviews.map((review: Evaluation) => ({
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
        comments: this.extractComments(review.comments),
      },
    }));
  }

  /**
   * Common method to extract comment data
   */
  protected extractComments(comments?: Comment[]) {
    if (!comments) return null;

    return comments.map((comment: Comment) => ({
      header: comment.header,
      variant: comment.variant,
      source: comment.source,
      metadata: comment.metadata,
      description: comment.description,
      importance: comment.importance,
      grade: comment.grade,
      highlight: comment.highlight ? {
        quotedText: comment.highlight.quotedText,
        startOffset: comment.highlight.startOffset,
        endOffset: comment.highlight.endOffset,
        isValid: comment.highlight.isValid,
      } : null,
    }));
  }

  /**
   * Common metadata extraction
   */
  protected extractMetadata(doc: Document) {
    return {
      author: doc.author,
      platforms: doc.platforms,
      url: doc.url,
      importUrl: doc.importUrl,
      intendedAgents: doc.intendedAgents,
    };
  }
}

/**
 * Markdown exporter
 */
class MarkdownExporter extends BaseDocumentExporter {
  export(doc: Document): string {
    const sections = [
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
    ].filter(Boolean);

    // Add evaluations if any
    if (doc.reviews && doc.reviews.length > 0) {
      sections.push("", "## Evaluations", "");

      doc.reviews.forEach((review: Evaluation) => {
        sections.push(`### ${review.agent.name}`, "");
        
        if (review.agent.description) {
          sections.push(`**Description**: ${review.agent.description}`, "");
        }
        
        if (review.summary) {
          sections.push("**Summary**:", review.summary, "");
        }

        if (review.analysis) {
          sections.push("**Analysis**:", review.analysis, "");
        }

        if (review.grade !== null && review.grade !== undefined) {
          sections.push(`**Grade**: ${review.grade}/10`, "");
        }

        if (review.comments && review.comments.length > 0) {
          sections.push("**Comments**:");
          review.comments.forEach((comment: Comment, idx: number) => {
            const header = comment.header || `Comment ${idx + 1}`;
            sections.push(`${idx + 1}. **${header}**`);
            
            const badges = [];
            if (comment.variant) badges.push(`[${comment.variant.toUpperCase()}]`);
            if (comment.source) badges.push(`[${comment.source}]`);
            if (badges.length > 0) {
              sections.push(`   ${badges.join(" ")}`);
            }
            
            sections.push(`   ${comment.description}`);
            if (comment.highlight?.quotedText) {
              sections.push(`   > "${comment.highlight.quotedText}"`);
            }
            if (comment.importance !== null && comment.importance !== undefined) {
              sections.push(`   Importance: ${comment.importance}/10`);
            }
          });
          sections.push("");
        }
      });
    }

    return sections.join("\n");
  }

  getContentType(): string {
    return 'text/markdown; charset=utf-8';
  }

  getFileName(docId: string): string {
    return `${docId}.md`;
  }
}

/**
 * JSON exporter
 */
class JSONExporter extends BaseDocumentExporter {
  export(doc: Document): Record<string, unknown> {
    const exportData: Record<string, unknown> = {
      id: doc.id,
      title: doc.title,
      publishedDate: doc.publishedDate,
      metadata: this.extractMetadata(doc),
      content: doc.content,
      evaluations: this.extractEvaluations(doc.reviews),
    };

    // Only include submittedBy for private documents (owner can see their own info)
    // Public documents should not expose who submitted them
    if (doc.isPrivate) {
      exportData.metadata = {
        ...(exportData.metadata as Record<string, unknown>),
        submittedBy: doc.submittedBy,
      };
    }

    return exportData;
  }

  getContentType(): string {
    return 'application/json; charset=utf-8';
  }

  getFileName(docId: string): string {
    return `${docId}.json`;
  }
}

/**
 * YAML exporter
 */
class YAMLExporter extends BaseDocumentExporter {
  export(doc: Document): string {
    const data = {
      id: doc.id,
      title: doc.title,
      publishedDate: doc.publishedDate,
      metadata: this.extractMetadata(doc),
      content: doc.content,
      evaluations: this.extractEvaluations(doc.reviews),
    };

    return yaml.dump(data, { 
      noRefs: true, 
      sortKeys: false,
      lineWidth: -1,
    });
  }

  getContentType(): string {
    return 'text/yaml; charset=utf-8';
  }

  getFileName(docId: string): string {
    return `${docId}.yaml`;
  }
}

/**
 * Document export service
 * Provides a unified interface for exporting documents in various formats
 */
export class DocumentExportService {
  private static exporters: Record<string, DocumentExporter> = {
    'markdown': new MarkdownExporter(),
    'md': new MarkdownExporter(),
    'json': new JSONExporter(),
    'yaml': new YAMLExporter(),
    'yml': new YAMLExporter(),
  };

  /**
   * Export a document in the specified format
   */
  static export(doc: Document, format: string): {
    content: string | Record<string, unknown>;
    contentType: string;
    fileName: string;
  } {
    const exporter = this.exporters[format.toLowerCase()] || this.exporters['json'];
    
    return {
      content: exporter.export(doc),
      contentType: exporter.getContentType(),
      fileName: exporter.getFileName(doc.id),
    };
  }

  /**
   * Check if a format is supported
   */
  static isFormatSupported(format: string): boolean {
    return format.toLowerCase() in this.exporters;
  }

  /**
   * Get list of supported formats
   */
  static getSupportedFormats(): string[] {
    return Object.keys(this.exporters);
  }
}