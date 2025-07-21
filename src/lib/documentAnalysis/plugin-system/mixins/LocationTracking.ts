/**
 * Mixin for location tracking functionality
 * Provides automatic location finding and line number calculation
 */

import { TextChunk } from '../TextChunk';
import { Finding } from '../types';
import { LocationUtils } from '../../utils/LocationUtils';

export interface LocationInfo {
  lineNumber?: number;
  lineText?: string;
  startLine?: number;
  endLine?: number;
  position?: {
    start: number;
    end: number;
  };
}

export class LocationTracker {
  /**
   * Find location information for a text match within a chunk
   */
  static findLocation(
    text: string,
    chunk: TextChunk,
    startSearchFrom: number = 0
  ): LocationInfo | null {
    const chunkLocationUtils = new LocationUtils(chunk.text);
    const textPosition = chunk.text.indexOf(text, startSearchFrom);
    
    if (textPosition === -1) {
      return null;
    }

    const locationInfo = chunkLocationUtils.getLocationInfo(
      textPosition,
      textPosition + text.length
    );

    if (!locationInfo) {
      return null;
    }

    const result: LocationInfo = {
      position: {
        start: textPosition,
        end: textPosition + text.length
      }
    };

    // Calculate absolute line numbers if chunk has global line info
    if (chunk.metadata?.lineInfo) {
      result.lineNumber = chunk.metadata.lineInfo.startLine + locationInfo.start.lineNumber - 1;
      result.startLine = result.lineNumber;
      result.endLine = chunk.metadata.lineInfo.startLine + locationInfo.end.lineNumber - 1;
    } else {
      // Use chunk-relative line numbers
      result.lineNumber = locationInfo.start.lineNumber;
      result.startLine = locationInfo.start.lineNumber;
      result.endLine = locationInfo.end.lineNumber;
    }

    result.lineText = locationInfo.start.lineText;

    return result;
  }

  /**
   * Add location hint to a finding
   */
  static addLocationHint(
    finding: Finding,
    text: string,
    chunk: TextChunk,
    startSearchFrom: number = 0
  ): Finding {
    const location = this.findLocation(text, chunk, startSearchFrom);
    
    if (location && location.lineNumber && location.lineText) {
      finding.locationHint = {
        lineNumber: location.lineNumber,
        lineText: location.lineText,
        matchText: text,
        startLineNumber: location.startLine,
        endLineNumber: location.endLine
      };
    }

    if (location?.position) {
      finding.location = location.position;
    }

    return finding;
  }

  /**
   * Create a finding with automatic location tracking
   */
  static createFindingWithLocation(
    type: string,
    severity: 'low' | 'medium' | 'high' | 'info',
    message: string,
    matchText: string,
    chunk: TextChunk,
    metadata?: Record<string, any>
  ): Finding {
    const finding: Finding = {
      type,
      severity,
      message,
      metadata: {
        ...metadata,
        chunkId: chunk.id
      }
    };

    return this.addLocationHint(finding, matchText, chunk);
  }

  /**
   * Find all occurrences of a text in a chunk
   */
  static findAllLocations(
    text: string,
    chunk: TextChunk
  ): LocationInfo[] {
    const locations: LocationInfo[] = [];
    let searchFrom = 0;
    
    while (true) {
      const location = this.findLocation(text, chunk, searchFrom);
      if (!location || !location.position) break;
      
      locations.push(location);
      searchFrom = location.position.end;
    }
    
    return locations;
  }

  /**
   * Get location info for a specific character range
   */
  static getLocationForRange(
    start: number,
    end: number,
    chunk: TextChunk
  ): LocationInfo | null {
    const chunkLocationUtils = new LocationUtils(chunk.text);
    const locationInfo = chunkLocationUtils.getLocationInfo(start, end);

    if (!locationInfo) {
      return null;
    }

    const result: LocationInfo = {
      position: { start, end }
    };

    // Calculate absolute line numbers if chunk has global line info
    if (chunk.metadata?.lineInfo) {
      result.lineNumber = chunk.metadata.lineInfo.startLine + locationInfo.start.lineNumber - 1;
      result.startLine = result.lineNumber;
      result.endLine = chunk.metadata.lineInfo.startLine + locationInfo.end.lineNumber - 1;
    } else {
      // Use chunk-relative line numbers
      result.lineNumber = locationInfo.start.lineNumber;
      result.startLine = locationInfo.start.lineNumber;
      result.endLine = locationInfo.end.lineNumber;
    }

    result.lineText = locationInfo.start.lineText;

    return result;
  }
}