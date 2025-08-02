import type { Comment } from '../../shared/types';
import type { DocumentLocation } from '../../shared/types';

export interface StandardCommentOptions {
  // Required fields
  description: string;
  location: DocumentLocation;
  source: string;
  
  // Standardized fields
  header?: string;
  level?: 'error' | 'warning' | 'info' | 'success';
  metadata?: Record<string, any>;
  
  // Optional traditional fields
  importance?: number;
  grade?: number;
  title?: string;
  observation?: string;
  significance?: string;
}

/**
 * Utility class for building standardized comments across all plugins
 */
export class StandardCommentBuilder {
  /**
   * Build a standardized comment with all required fields
   */
  static build(options: StandardCommentOptions): Comment {
    const {
      description,
      location,
      source,
      header,
      level,
      metadata,
      importance,
      grade,
      title,
      observation,
      significance,
    } = options;
    
    return {
      // Core fields
      description,
      isValid: true,
      highlight: {
        startOffset: location.startOffset,
        endOffset: location.endOffset,
        quotedText: location.quotedText,
        isValid: true,
        prefix: (location as any).prefix,
      },
      
      // Standardized fields
      header,
      level,
      source,
      metadata,
      
      // Optional fields
      importance,
      grade,
      title,
      observation,
      significance,
    };
  }
  
  /**
   * Build an error comment
   */
  static buildError(options: Omit<StandardCommentOptions, 'level'>): Comment {
    return StandardCommentBuilder.build({
      ...options,
      level: 'error',
    });
  }
  
  /**
   * Build a warning comment
   */
  static buildWarning(options: Omit<StandardCommentOptions, 'level'>): Comment {
    return StandardCommentBuilder.build({
      ...options,
      level: 'warning',
    });
  }
  
  /**
   * Build an info comment
   */
  static buildInfo(options: Omit<StandardCommentOptions, 'level'>): Comment {
    return StandardCommentBuilder.build({
      ...options,
      level: 'info',
    });
  }
  
  /**
   * Build a success comment
   */
  static buildSuccess(options: Omit<StandardCommentOptions, 'level'>): Comment {
    return StandardCommentBuilder.build({
      ...options,
      level: 'success',
    });
  }
  
  /**
   * Helper to generate a concise header from a correction
   */
  static correctionHeader(original: string, corrected: string): string {
    return `${original} → ${corrected}`;
  }
  
  /**
   * Helper to truncate text for headers
   */
  static truncateHeader(text: string, maxLength: number = 60): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }
  
  /**
   * Calculate importance score based on various factors
   */
  static calculateImportance(factors: {
    baseScore: number;
    severity?: 'critical' | 'high' | 'medium' | 'low';
    confidence?: number;
    contextScore?: number;
  }): number {
    let score = factors.baseScore;
    
    // Adjust for severity
    if (factors.severity) {
      const severityMultipliers = {
        critical: 2.0,
        high: 1.5,
        medium: 1.0,
        low: 0.7,
      };
      score *= severityMultipliers[factors.severity];
    }
    
    // Adjust for confidence (0-100)
    if (factors.confidence !== undefined) {
      score *= (factors.confidence / 100);
    }
    
    // Add context score
    if (factors.contextScore !== undefined) {
      score += factors.contextScore / 20;
    }
    
    // Clamp to 0-10 range
    return Math.max(0, Math.min(10, score));
  }
}