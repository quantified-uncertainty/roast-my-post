/**
 * Document Formatter
 * 
 * Handles formatting and serialization of document data
 * between database format and API/frontend format.
 */

import { DocumentWithEvaluations } from './Document.entity';
import { getCommentProperty } from '@/types/commentTypes';

export class DocumentFormatter {
  /**
   * Format a database document with evaluations for API response
   */
  static formatWithEvaluations(dbDoc: any): DocumentWithEvaluations {
    if (!dbDoc.versions || dbDoc.versions.length === 0) {
      throw new Error(`Document ${dbDoc.id} has no versions`);
    }

    const latestVersion = dbDoc.versions[0];
    
    return {
      id: dbDoc.id,
      title: latestVersion.title,
      content: this.combineContent(latestVersion),
      author: latestVersion.authors?.[0] || 'Unknown',
      publishedDate: dbDoc.publishedDate?.toISOString() || null,
      url: latestVersion.urls?.[0] || null,
      platforms: latestVersion.platforms || [],
      createdAt: dbDoc.createdAt,
      updatedAt: dbDoc.updatedAt,
      submittedBy: this.formatUser(dbDoc.submittedBy),
      importUrl: latestVersion.importUrl,
      ephemeralBatchId: dbDoc.ephemeralBatchId,
      reviews: this.formatEvaluations(dbDoc.evaluations || [], latestVersion.version),
      intendedAgents: latestVersion.intendedAgents || []
    };
  }

  /**
   * Format multiple documents for list views
   */
  static formatDocumentList(dbDocs: any[]): DocumentWithEvaluations[] {
    return dbDocs.map(doc => this.formatWithEvaluations(doc));
  }

  /**
   * Combine markdown prepend with content
   */
  private static combineContent(version: any): string {
    if (version.markdownPrepend) {
      return version.markdownPrepend + version.content;
    }
    return version.content;
  }

  /**
   * Format user data for public display
   */
  private static formatUser(user: any): DocumentWithEvaluations['submittedBy'] {
    if (!user) return undefined;
    
    return {
      id: user.id,
      name: user.name,
      email: user.hideEmail ? null : user.email
    };
  }

  /**
   * Format evaluations with all nested data
   */
  private static formatEvaluations(evaluations: any[], currentDocVersion: number): any[] {
    return evaluations.map(evaluation => {
      // Get the latest evaluation version
      const latestVersion = evaluation.versions?.[0];
      if (!latestVersion) return null;

      // Determine if this evaluation is stale
      const isStale = latestVersion.documentVersion?.version !== currentDocVersion;

      return {
        id: evaluation.id,
        agentId: evaluation.agentId,
        agent: this.formatAgent(evaluation.agent),
        comments: this.formatComments(latestVersion.comments || []),
        priceInDollars: this.convertDecimalToNumber(latestVersion.job?.priceInDollars),
        createdAt: evaluation.createdAt,
        thinking: latestVersion.thinking || '',
        summary: latestVersion.summary || '',
        analysis: latestVersion.analysis || '',
        isStale,
        version: latestVersion.version,
        job: this.formatJob(latestVersion.job),
        documentVersion: latestVersion.documentVersion?.version
      };
    }).filter(Boolean);
  }

  /**
   * Format agent data
   */
  private static formatAgent(agent: any): any {
    if (!agent) return null;

    const latestVersion = agent.versions?.[0];
    if (!latestVersion) return null;

    return {
      id: agent.id,
      name: agent.name,
      version: latestVersion.version.toString(),
      description: latestVersion.description,
      primaryInstructions: latestVersion.primaryInstructions,
      selfCritiqueInstructions: latestVersion.selfCritiqueInstructions,
      providesGrades: latestVersion.providesGrades
    };
  }

  /**
   * Format comments with highlights
   */
  private static formatComments(comments: any[]): any[] {
    return comments.map(comment => ({
      id: comment.id,
      evaluationId: comment.evaluationVersionId,
      agentId: getCommentProperty(comment, 'agentId'),
      commentType: getCommentProperty(comment, 'commentType'),
      content: getCommentProperty(comment, 'content'),
      description: getCommentProperty(comment, 'description'),
      importance: this.convertDecimalToNumber(getCommentProperty(comment, 'importance')),
      grade: this.convertDecimalToNumber(getCommentProperty(comment, 'grade')),
      highlight: this.formatHighlight(comment.highlight),
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt
    }));
  }

  /**
   * Format highlight data
   */
  private static formatHighlight(highlight: any): any {
    if (!highlight) return null;

    return {
      id: highlight.id,
      startOffset: highlight.startOffset,
      endOffset: highlight.endOffset,
      prefix: highlight.prefix,
      quotedText: highlight.quotedText,
      isValid: highlight.isValid,
      error: highlight.error
    };
  }

  /**
   * Format job data
   */
  private static formatJob(job: any): any {
    if (!job) return null;

    return {
      id: job.id,
      status: job.status,
      priceInDollars: this.convertDecimalToNumber(job.priceInDollars),
      llmThinking: job.llmThinking,
      durationInSeconds: job.durationInSeconds,
      logs: job.logs,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      tasks: this.formatTasks(job.tasks || [])
    };
  }

  /**
   * Format task data
   */
  private static formatTasks(tasks: any[]): any[] {
    return tasks.map(task => ({
      id: task.id,
      name: task.name,
      modelName: task.modelName,
      priceInDollars: this.convertDecimalToNumber(task.priceInDollars),
      timeInSeconds: task.timeInSeconds,
      log: task.log,
      createdAt: task.createdAt
    }));
  }

  /**
   * Convert Prisma Decimal to number
   */
  private static convertDecimalToNumber(value: any): number | null {
    if (value === null || value === undefined) return null;
    
    // Already a number
    if (typeof value === 'number') return value;
    
    // String representation
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? null : parsed;
    }
    
    // Prisma Decimal object (duck typing)
    if (typeof value === 'object' && value && 'toNumber' in value) {
      if (typeof (value as any).toNumber === 'function') {
        return (value as any).toNumber();
      }
    }
    
    // Last resort
    const converted = Number(value);
    return isNaN(converted) ? null : converted;
  }

  /**
   * Format document for search results
   */
  static formatSearchResult(dbDoc: any): any {
    const latestVersion = dbDoc.versions[0];
    
    return {
      id: dbDoc.id,
      title: latestVersion.title,
      author: latestVersion.authors?.[0] || 'Unknown',
      publishedDate: dbDoc.publishedDate?.toISOString() || null,
      platforms: latestVersion.platforms || [],
      createdAt: dbDoc.createdAt,
      summary: this.generateSummary(latestVersion.content),
      evaluationCount: dbDoc._count?.evaluations || 0,
      url: latestVersion.urls?.[0] || null
    };
  }

  /**
   * Generate summary from content
   */
  private static generateSummary(content: string, maxLength: number = 200): string {
    const plainText = content
      .replace(/#{1,6}\s+/g, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/```[^`]*```/gs, '')
      .replace(/\n+/g, ' ')
      .trim();

    if (plainText.length <= maxLength) {
      return plainText;
    }

    // Try to cut at a word boundary
    const truncated = plainText.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > maxLength * 0.8) {
      return truncated.substring(0, lastSpace) + '...';
    }
    
    return truncated + '...';
  }

  /**
   * Prepare document data for database creation
   */
  static prepareForCreate(data: any): any {
    return {
      title: data.title?.trim() || 'Untitled',
      content: data.content?.trim() || '',
      authors: Array.isArray(data.authors) ? data.authors : [data.authors || 'Unknown'],
      publishedDate: data.publishedDate ? new Date(data.publishedDate) : null,
      url: data.url?.trim() || null,
      platforms: Array.isArray(data.platforms) ? data.platforms : [],
      importUrl: data.importUrl?.trim() || undefined
    };
  }

  /**
   * Prepare document data for database update
   */
  static prepareForUpdate(data: any): any {
    const update: any = {};
    
    if (data.title !== undefined) {
      update.title = data.title.trim();
    }
    
    if (data.content !== undefined) {
      update.content = data.content.trim();
    }
    
    if (data.intendedAgentIds !== undefined) {
      update.intendedAgents = {
        deleteMany: {},
        create: data.intendedAgentIds.map((agentId: string) => ({ agentId }))
      };
    }
    
    return update;
  }
}