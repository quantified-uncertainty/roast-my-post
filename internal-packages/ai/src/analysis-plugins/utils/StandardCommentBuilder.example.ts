/**
 * Example usage of StandardCommentBuilder in plugins
 */

import { StandardCommentBuilder } from './StandardCommentBuilder';
import type { DocumentLocation } from '../../shared/types';

// Example 1: Spelling Plugin
function createSpellingComment(error: any, location: DocumentLocation) {
  return StandardCommentBuilder.buildError({
    description: `✏️ [Spelling] ${error.text} → ${error.correction}`,
    location,
    source: 'spelling',
    header: StandardCommentBuilder.correctionHeader(error.text, error.correction),
    metadata: {
      errorType: error.type,
      confidence: error.confidence,
      context: error.context,
    },
    importance: StandardCommentBuilder.calculateImportance({
      baseScore: 5,
      confidence: error.confidence,
    }),
  });
}

// Example 2: Math Plugin with Success
function createMathSuccessComment(expression: any, location: DocumentLocation) {
  return StandardCommentBuilder.buildSuccess({
    description: `✅ Math expression verified as correct: ${expression.originalText}`,
    location,
    source: 'math',
    header: `✅ Verified: ${expression.originalText}`,
    metadata: {
      verificationStatus: 'verified',
      complexityScore: expression.complexityScore,
    },
    importance: StandardCommentBuilder.calculateImportance({
      baseScore: 3,
      contextScore: expression.contextImportanceScore,
    }),
  });
}

// Example 3: Fact Check with Warning
function createFactCheckWarning(fact: any, location: DocumentLocation) {
  return StandardCommentBuilder.buildWarning({
    description: `⚠️ This claim appears questionable and should be verified`,
    location,
    source: 'fact-check',
    header: StandardCommentBuilder.truncateHeader(
      `⚠️ Questionable: ${fact.originalText}`
    ),
    metadata: {
      topic: fact.topic,
      truthProbability: fact.truthProbability,
      checkabilityScore: fact.checkabilityScore,
    },
    importance: StandardCommentBuilder.calculateImportance({
      baseScore: 7,
      severity: 'medium',
    }),
  });
}

// Example 4: Forecast with Info
function createForecastComment(forecast: any, location: DocumentLocation) {
  const header = forecast.ourPrediction 
    ? `📊 Forecast (${forecast.ourPrediction}%): ${forecast.predictionText}`
    : `📊 Forecast: ${forecast.predictionText}`;
    
  return StandardCommentBuilder.buildInfo({
    description: `Forecast analysis for: ${forecast.predictionText}`,
    location,
    source: 'forecast',
    header: StandardCommentBuilder.truncateHeader(header),
    metadata: {
      predictionText: forecast.predictionText,
      resolutionDate: forecast.resolutionDate,
      ourPrediction: forecast.ourPrediction,
      scores: {
        importance: forecast.importanceScore,
        precision: forecast.precisionScore,
        verifiability: forecast.verifiabilityScore,
      },
    },
    importance: forecast.importanceScore / 10,
  });
}