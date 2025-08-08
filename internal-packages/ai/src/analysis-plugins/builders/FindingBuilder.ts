/**
 * Fluent builder for creating findings with automatic location tracking
 */

import { Finding } from '../types';
import { TextChunk } from '../TextChunk';
import { LocationUtils } from '../../utils/LocationUtils';

export class FindingBuilder {
  private finding: Partial<Finding> = {};
  private matchText?: string;
  private chunk?: TextChunk;
  private searchFrom: number = 0;

  /**
   * Set the finding type
   */
  withType(type: string): this {
    this.finding.type = type;
    return this;
  }

  /**
   * Set the severity level
   */
  withSeverity(severity: 'low' | 'medium' | 'high' | 'info'): this {
    this.finding.severity = severity;
    return this;
  }

  /**
   * Set the finding message
   */
  withMessage(message: string): this {
    this.finding.message = message;
    return this;
  }

  /**
   * Set the text to match for location tracking
   */
  withText(text: string): this {
    this.matchText = text;
    return this;
  }

  /**
   * Set the chunk context for location tracking
   */
  inChunk(chunk: TextChunk): this {
    this.chunk = chunk;
    if (!this.finding.metadata) {
      this.finding.metadata = {};
    }
    this.finding.metadata.chunkId = chunk.id;
    return this;
  }

  /**
   * Set explicit location (overrides automatic location tracking)
   */
  atLocation(start: number, end: number): this {
    this.finding.location = { start, end };
    return this;
  }

  /**
   * Set where to start searching for the match text
   */
  startSearchAt(position: number): this {
    this.searchFrom = position;
    return this;
  }

  /**
   * Add metadata to the finding
   */
  withMetadata(metadata: Record<string, unknown>): this {
    this.finding.metadata = {
      ...this.finding.metadata,
      ...metadata
    };
    return this;
  }

  /**
   * Build the finding with automatic location tracking
   */
  build(): Finding {
    // Validate required fields
    if (!this.finding.type) {
      throw new Error('Finding type is required');
    }
    if (!this.finding.severity) {
      throw new Error('Finding severity is required');
    }
    if (!this.finding.message) {
      throw new Error('Finding message is required');
    }

    const result: Finding = {
      type: this.finding.type,
      severity: this.finding.severity,
      message: this.finding.message,
      metadata: this.finding.metadata
    };

    // Apply location tracking if we have text and chunk
    if (this.matchText && this.chunk) {
      const location = LocationUtils.findLocation(
        this.matchText,
        this.chunk,
        this.searchFrom
      );

      if (location) {
        if (location.lineNumber && location.lineText) {
          result.locationHint = {
            lineNumber: location.lineNumber,
            lineText: location.lineText,
            matchText: this.matchText,
            startLineNumber: location.startLine,
            endLineNumber: location.endLine
          };
        }

        if (location.position && !this.finding.location) {
          result.location = location.position;
        }
      }
    }

    // Use explicit location if provided
    if (this.finding.location) {
      result.location = this.finding.location;
    }

    return result;
  }

  /**
   * Static factory methods for common finding types
   */
  static error(message: string, matchText?: string): FindingBuilder {
    const builder = new FindingBuilder()
      .withType('error')
      .withSeverity('medium')
      .withMessage(message);
    
    if (matchText) {
      builder.withText(matchText);
    }
    
    return builder;
  }

  static warning(message: string, matchText?: string): FindingBuilder {
    const builder = new FindingBuilder()
      .withType('warning')
      .withSeverity('low')
      .withMessage(message);
    
    if (matchText) {
      builder.withText(matchText);
    }
    
    return builder;
  }

  static info(message: string, matchText?: string): FindingBuilder {
    const builder = new FindingBuilder()
      .withType('info')
      .withSeverity('info')
      .withMessage(message);
    
    if (matchText) {
      builder.withText(matchText);
    }
    
    return builder;
  }

  static recommendation(message: string, context?: string): FindingBuilder {
    const builder = new FindingBuilder()
      .withType('recommendation')
      .withSeverity('medium')
      .withMessage(message);
    
    if (context) {
      builder.withMetadata({ context });
    }
    
    return builder;
  }

  /**
   * Create a finding for a specific error type
   */
  static forError(
    errorType: string,
    text: string,
    description: string,
    severity: 'low' | 'medium' | 'high' = 'medium'
  ): FindingBuilder {
    return new FindingBuilder()
      .withType(`${errorType}_error`)
      .withSeverity(severity)
      .withMessage(description)
      .withText(text)
      .withMetadata({ errorType, originalText: text });
  }

  /**
   * Create a finding for a verification result
   */
  static forVerification(
    item: Record<string, unknown>,
    isValid: boolean,
    reasoning: string
  ): FindingBuilder {
    return new FindingBuilder()
      .withType(isValid ? 'verified' : 'invalid')
      .withSeverity(isValid ? 'low' : 'high')
      .withMessage(isValid ? `Verified: ${reasoning}` : `Invalid: ${reasoning}`)
      .withMetadata({ originalItem: item, category: 'verification' });
  }
}