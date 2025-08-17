import { describe, it, expect } from 'vitest';
import {
  getScoreColor,
  getScoreBackgroundColor,
  getScoreIcon,
  getSeverityColor,
  getStatusColor,
  getStatusIcon,
  getResultColor,
  getConventionColor,
  getConsensusColor,
  formatPercentage,
  formatConfidence,
  severityConfig,
  relevanceColors
} from '../resultFormatting';
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

describe('resultFormatting utilities', () => {
  describe('getScoreColor', () => {
    it('should return correct colors for different score ranges', () => {
      expect(getScoreColor(90)).toBe('text-green-600');
      expect(getScoreColor(80)).toBe('text-green-600');
      expect(getScoreColor(70)).toBe('text-yellow-600');
      expect(getScoreColor(60)).toBe('text-yellow-600');
      expect(getScoreColor(50)).toBe('text-orange-600');
      expect(getScoreColor(40)).toBe('text-orange-600');
      expect(getScoreColor(30)).toBe('text-red-600');
      expect(getScoreColor(0)).toBe('text-red-600');
    });
  });

  describe('getScoreBackgroundColor', () => {
    it('should return correct background colors for different score ranges', () => {
      expect(getScoreBackgroundColor(90)).toBe('bg-green-50');
      expect(getScoreBackgroundColor(70)).toBe('bg-yellow-50');
      expect(getScoreBackgroundColor(50)).toBe('bg-orange-50');
      expect(getScoreBackgroundColor(30)).toBe('bg-red-50');
    });
  });

  describe('getScoreIcon', () => {
    it('should return correct icons for different score ranges', () => {
      expect(getScoreIcon(80)).toBe(CheckCircleIcon);
      expect(getScoreIcon(70)).toBe(CheckCircleIcon);
      expect(getScoreIcon(50)).toBe(ExclamationTriangleIcon);
      expect(getScoreIcon(40)).toBe(ExclamationTriangleIcon);
      expect(getScoreIcon(30)).toBe(XCircleIcon);
      expect(getScoreIcon(0)).toBe(XCircleIcon);
    });
  });

  describe('getSeverityColor', () => {
    it('should return correct colors for severity levels', () => {
      expect(getSeverityColor('critical')).toBe('bg-red-100 text-red-800');
      expect(getSeverityColor('major')).toBe('bg-orange-100 text-orange-800');
      expect(getSeverityColor('minor')).toBe('bg-yellow-100 text-yellow-800');
      expect(getSeverityColor('info')).toBe('bg-blue-100 text-blue-800');
      expect(getSeverityColor(undefined)).toBe('bg-gray-100 text-gray-800');
      expect(getSeverityColor('unknown')).toBe('bg-gray-100 text-gray-800');
    });
  });

  describe('getStatusColor', () => {
    it('should return correct colors for status values', () => {
      expect(getStatusColor('valid')).toBe('bg-green-50 border-green-200');
      expect(getStatusColor('success')).toBe('bg-green-50 border-green-200');
      expect(getStatusColor('correct')).toBe('bg-green-50 border-green-200');
      expect(getStatusColor('invalid')).toBe('bg-red-50 border-red-200');
      expect(getStatusColor('error')).toBe('bg-red-50 border-red-200');
      expect(getStatusColor('incorrect')).toBe('bg-red-50 border-red-200');
      expect(getStatusColor('warning')).toBe('bg-yellow-50 border-yellow-200');
      expect(getStatusColor('partial')).toBe('bg-yellow-50 border-yellow-200');
      expect(getStatusColor('unknown')).toBe('bg-gray-50 border-gray-200');
    });
  });

  describe('getResultColor', () => {
    it('should return correct colors for result values', () => {
      expect(getResultColor('pass')).toBe('text-green-600');
      expect(getResultColor('PASS')).toBe('text-green-600');
      expect(getResultColor('fail')).toBe('text-red-600');
      expect(getResultColor('FAIL')).toBe('text-red-600');
      expect(getResultColor('partial')).toBe('text-yellow-600');
      expect(getResultColor('warning')).toBe('text-yellow-600');
      expect(getResultColor('unknown')).toBe('text-gray-600');
    });
  });

  describe('getConventionColor', () => {
    it('should return correct colors for language conventions', () => {
      expect(getConventionColor('american')).toBe('bg-blue-100 text-blue-800');
      expect(getConventionColor('US')).toBe('bg-blue-50 border-blue-200 text-blue-800');
      expect(getConventionColor('british')).toBe('bg-purple-100 text-purple-800');
      expect(getConventionColor('UK')).toBe('bg-red-50 border-red-200 text-red-800');
      expect(getConventionColor('mixed')).toBe('bg-yellow-100 text-yellow-800');
      expect(getConventionColor('unknown')).toBe('bg-gray-100 text-gray-800');
    });
  });

  describe('getConsensusColor', () => {
    it('should return correct colors for consensus levels', () => {
      expect(getConsensusColor('strong agreement')).toBe('text-green-600');
      expect(getConsensusColor('moderate agreement')).toBe('text-yellow-600');
      expect(getConsensusColor('disagreement')).toBe('text-red-600');
      expect(getConsensusColor('unknown')).toBe('text-gray-600');
    });
  });

  describe('formatPercentage', () => {
    it('should format percentage with correct color', () => {
      expect(formatPercentage(95)).toEqual({ text: '95%', color: 'text-green-600' });
      expect(formatPercentage(75)).toEqual({ text: '75%', color: 'text-yellow-600' });
      expect(formatPercentage(25)).toEqual({ text: '25%', color: 'text-red-600' });
    });

    it('should handle inverse percentages correctly', () => {
      expect(formatPercentage(25, true)).toEqual({ text: '25%', color: 'text-yellow-600' }); // 100-25=75
      expect(formatPercentage(10, true)).toEqual({ text: '10%', color: 'text-green-600' }); // 100-10=90
      expect(formatPercentage(90, true)).toEqual({ text: '90%', color: 'text-red-600' }); // 100-90=10
    });
  });

  describe('formatConfidence', () => {
    it('should format confidence scores correctly', () => {
      expect(formatConfidence(0.95)).toEqual({
        text: '95%',
        label: 'Very High',
        color: 'text-green-600'
      });
      expect(formatConfidence(0.75)).toEqual({
        text: '75%',
        label: 'High',
        color: 'text-yellow-600'
      });
      expect(formatConfidence(0.55)).toEqual({
        text: '55%',
        label: 'Moderate',
        color: 'text-orange-600'
      });
      expect(formatConfidence(0.35)).toEqual({
        text: '35%',
        label: 'Low',
        color: 'text-red-600'
      });
      expect(formatConfidence(0.15)).toEqual({
        text: '15%',
        label: 'Very Low',
        color: 'text-red-600'
      });
    });
  });

  describe('severityConfig', () => {
    it('should have correct configuration for each severity level', () => {
      expect(severityConfig.critical.icon).toBe(XCircleIcon);
      expect(severityConfig.critical.color).toBe('text-red-600');
      expect(severityConfig.major.icon).toBe(ExclamationTriangleIcon);
      expect(severityConfig.minor.icon).toBe(ExclamationTriangleIcon);
    });
  });

  describe('relevanceColors', () => {
    it('should have correct colors for relevance levels', () => {
      expect(relevanceColors.high).toBe('bg-green-100 text-green-800 border-green-200');
      expect(relevanceColors.medium).toBe('bg-yellow-100 text-yellow-800 border-yellow-200');
      expect(relevanceColors.low).toBe('bg-gray-100 text-gray-800 border-gray-200');
    });
  });
});