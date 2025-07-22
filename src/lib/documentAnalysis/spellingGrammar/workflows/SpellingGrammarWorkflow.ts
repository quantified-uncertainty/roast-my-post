/**
 * Unified spelling/grammar analysis workflow
 * Supports both sequential and parallel execution strategies
 */

import type { Agent } from '../../../../types/agentSchema';
import type { Document } from '../../../../types/documents';
import type { Comment } from '../../../../types/documentSchema';
import type { TaskResult } from '../../shared/types';
import type { LLMInteraction } from '@/types/llm';

import { getDocumentFullContent } from '../../../../utils/documentContentHelpers';
import { logger } from '@/lib/logger';
import { calculateLLMCost } from '../../shared/costUtils';
import { ANALYSIS_MODEL } from '../../../../types/openai';

import {
  DocumentChunk,
  DocumentConventions,
  AnalysisContext,
  SpellingGrammarError,
  ProcessedErrorResults
} from '../domain';

import {
  buildSystemPrompt,
  buildUserPrompt,
  validateError,
  processErrors,
  calculateSmartGrade,
  getGradeDescription,
  calculateErrorStatistics,
  cleanErrorDescription
} from '../application';

import {
  SpellingGrammarLLMClient,
  DocumentProcessor
} from '../infrastructure';

import {
  EMPTY_DOCUMENT_RESPONSE,
  DEFAULT_CHUNK_SIZE,
  LOG_PREFIXES,
  API_STAGGER_DELAY_MS,
  CONCURRENT_CHUNK_LIMIT,
  SEVERITY_TO_IMPORTANCE,
  SEVERITY_TO_GRADE,
  ERROR_DENSITY_WORD_BASE
} from '../constants';

import { detectDocumentConventions } from '../detectConventions';
import { convertHighlightsToComments } from '../highlightConverter';
import { getErrorGroupEmoji, getErrorTypeLabel } from '../../shared/errorCategorization';

import type { HeliconeSessionConfig } from '../../../helicone/sessions';

export interface WorkflowOptions {
  targetHighlights?: number; // Ignored for spelling/grammar
  executionMode?: 'sequential' | 'parallel';
  maxConcurrency?: number;
  sessionConfig?: HeliconeSessionConfig;
}

export interface WorkflowResult {
  thinking: string;
  analysis: string;
  summary: string;
  grade?: number;
  selfCritique?: string;
  highlights: Comment[];
  tasks: TaskResult[];
}

/**
 * Unified spelling/grammar analysis workflow
 */
export class SpellingGrammarWorkflow {
  private llmClient: SpellingGrammarLLMClient;

  constructor() {
    this.llmClient = new SpellingGrammarLLMClient();
  }

  /**
   * Analyze a document for spelling and grammar errors
   */
  async analyze(
    document: Document,
    agentInfo: Agent,
    options: WorkflowOptions = {}
  ): Promise<WorkflowResult> {
    const {
      executionMode = 'sequential',
      maxConcurrency = CONCURRENT_CHUNK_LIMIT,
      sessionConfig
    } = options;

    const startTime = Date.now();
    const tasks: TaskResult[] = [];

    try {
      // Get document content
      const { content: fullContent } = getDocumentFullContent(document);

      // Handle empty documents
      if (!fullContent.trim()) {
        logger.info(`${LOG_PREFIXES.WORKFLOW} Document is empty, no analysis needed`);
        return EMPTY_DOCUMENT_RESPONSE;
      }

      // Create document processor
      const docProcessor = new DocumentProcessor(fullContent);
      const wordCount = docProcessor.getWordCount();

      // Stage 1: Detect conventions
      const conventions = await this.detectConventions(fullContent, tasks, startTime);

      // Stage 2: Analyze chunks
      const chunks = docProcessor.splitIntoChunks(DEFAULT_CHUNK_SIZE);
      logger.info(`${LOG_PREFIXES.WORKFLOW} Stage 2: Analyzing ${chunks.length} chunks for spelling/grammar errors`);

      const allErrors = executionMode === 'parallel'
        ? await this.analyzeChunksParallel(chunks, agentInfo, conventions, tasks, maxConcurrency, sessionConfig)
        : await this.analyzeChunksSequential(chunks, agentInfo, conventions, tasks, sessionConfig);

      // Stage 3: Process results
      const processedResults = await this.processResults(
        allErrors,
        conventions,
        docProcessor,
        tasks,
        startTime
      );

      // Generate final output
      return this.generateOutput(
        document,
        processedResults,
        conventions,
        wordCount,
        fullContent,
        docProcessor,
        tasks
      );

    } catch (error) {
      logger.error(`${LOG_PREFIXES.ERROR} Workflow failed`, { error });
      throw error;
    }
  }

  /**
   * Detect document conventions
   */
  private async detectConventions(
    content: string,
    tasks: TaskResult[],
    startTime: number
  ): Promise<DocumentConventions> {
    logger.info(`${LOG_PREFIXES.WORKFLOW} Stage 1: Detecting document conventions`);
    
    const conventionResult = await detectDocumentConventions(content);
    const conventions = new DocumentConventions(
      conventionResult.conventions.language,
      conventionResult.conventions.documentType,
      conventionResult.conventions.formality
    );

    logger.info(`Detected conventions: ${conventions.language} English, ${conventions.documentType} document`);

    // Calculate cost
    const conventionCost = calculateLLMCost(ANALYSIS_MODEL, conventionResult.usage);

    const docProcessor = new DocumentProcessor(content);
    tasks.push({
      name: "Detect document conventions",
      modelName: ANALYSIS_MODEL,
      priceInDollars: conventionCost,
      timeInSeconds: (Date.now() - startTime) / 1000,
      log: `Detected ${conventions.language} English, ${conventions.documentType} document type, ${conventions.formality} formality. Document has ${docProcessor.getWordCount()} words across ${docProcessor.getLineCount()} lines.`,
      llmInteractions: []
    });

    return conventions;
  }

  /**
   * Analyze chunks sequentially
   */
  private async analyzeChunksSequential(
    chunks: DocumentChunk[],
    agentInfo: Agent,
    conventions: DocumentConventions,
    tasks: TaskResult[],
    sessionConfig?: HeliconeSessionConfig
  ): Promise<SpellingGrammarError[]> {
    const allErrors: SpellingGrammarError[] = [];
    const chunkStartTime = Date.now();

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const errors = await this.analyzeChunk(chunk, i, chunks.length, agentInfo, conventions, tasks, sessionConfig);
      allErrors.push(...errors);
    }

    return allErrors;
  }

  /**
   * Analyze chunks in parallel
   */
  private async analyzeChunksParallel(
    chunks: DocumentChunk[],
    agentInfo: Agent,
    conventions: DocumentConventions,
    tasks: TaskResult[],
    maxConcurrency: number,
    sessionConfig?: HeliconeSessionConfig
  ): Promise<SpellingGrammarError[]> {
    const allErrors: SpellingGrammarError[] = [];

    // Process in batches
    for (let i = 0; i < chunks.length; i += maxConcurrency) {
      const batch = chunks.slice(i, Math.min(i + maxConcurrency, chunks.length));
      const batchStartTime = Date.now();

      const batchPromises = batch.map(async (chunk, batchIndex) => {
        const chunkIndex = i + batchIndex;

        // Stagger API calls
        if (batchIndex > 0) {
          await this.delay(batchIndex * API_STAGGER_DELAY_MS);
        }

        return this.analyzeChunk(chunk, chunkIndex, chunks.length, agentInfo, conventions, tasks, sessionConfig);
      });

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(errors => allErrors.push(...errors));

      logger.info(`${LOG_PREFIXES.WORKFLOW} Batch ${Math.floor(i / maxConcurrency) + 1}/${Math.ceil(chunks.length / maxConcurrency)} complete`, {
        durationMs: Date.now() - batchStartTime,
        chunksProcessed: batch.length
      });
    }

    return allErrors;
  }

  /**
   * Analyze a single chunk
   */
  private async analyzeChunk(
    chunk: DocumentChunk,
    index: number,
    totalChunks: number,
    agentInfo: Agent,
    conventions: DocumentConventions,
    tasks: TaskResult[],
    sessionConfig?: HeliconeSessionConfig
  ): Promise<SpellingGrammarError[]> {
    const chunkStartTime = Date.now();

    logger.info(`${LOG_PREFIXES.CHUNK_ANALYSIS} Analyzing chunk ${index + 1}/${totalChunks}`, {
      index: index + 1,
      totalChunks,
      lineRange: `${chunk.startLineNumber}-${chunk.endLineNumber}`,
      characters: chunk.characterCount,
      preview: chunk.getPreview()
    });

    const context = new AnalysisContext(
      agentInfo.name,
      agentInfo.primaryInstructions || "Find all spelling, grammar, punctuation, and capitalization errors.",
      conventions
    );

    const systemPrompt = buildSystemPrompt(context);
    const userPrompt = buildUserPrompt(chunk);

    try {
      // Create session config with chunk-specific path if provided
      const chunkSessionConfig = sessionConfig ? {
        ...sessionConfig,
        sessionPath: `${sessionConfig.sessionPath}/chunk-${index}`,
        customProperties: {
          ...sessionConfig.customProperties,
          ChunkIndex: index.toString(),
          ChunkLines: `${chunk.startLineNumber}-${chunk.endLineNumber}`,
          ChunkChars: chunk.characterCount.toString()
        }
      } : undefined;
      
      const response = await this.llmClient.analyzeText(systemPrompt, userPrompt, chunkSessionConfig);

      // Validate errors
      const validErrors = response.errors.filter(error => {
        const validation = validateError(error, chunk);
        if (!validation.isValid) {
          logger.warn(`${LOG_PREFIXES.CHUNK_ANALYSIS} ${validation.reason}`, {
            error,
            chunkIndex: chunk.startLineNumber
          });
        }
        return validation.isValid;
      });

      // Log results
      logger.info(`${LOG_PREFIXES.CHUNK_ANALYSIS} Chunk ${index + 1} completed`, {
        index: index + 1,
        lineRange: `${chunk.startLineNumber}-${chunk.endLineNumber}`,
        charactersProcessed: chunk.characterCount,
        errorsFound: validErrors.length,
        tokenUsage: response.usage
      });

      // Calculate cost
      const chunkCost = calculateLLMCost(ANALYSIS_MODEL, response.usage);

      // Create task
      tasks.push({
        name: `Analyze chunk ${index + 1}`,
        modelName: ANALYSIS_MODEL,
        priceInDollars: chunkCost,
        timeInSeconds: (Date.now() - chunkStartTime) / 1000,
        log: `Analyzed chunk ${index + 1} (lines ${chunk.startLineNumber}-${chunk.endLineNumber}): ${validErrors.length} errors found`,
        llmInteractions: response.llmInteraction ? [response.llmInteraction] : []
      });

      return validErrors;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      logger.error(`${LOG_PREFIXES.ERROR} Chunk ${index + 1} failed`, { 
        error: errorMessage,
        chunkInfo: {
          index: index + 1,
          totalChunks,
          lineRange: `${chunk.startLineNumber}-${chunk.endLineNumber}`,
          characters: chunk.characterCount
        }
      });
      
      // Create failed task with detailed error information
      tasks.push({
        name: `Analyze chunk ${index + 1}`,
        modelName: ANALYSIS_MODEL,
        priceInDollars: 0,
        timeInSeconds: (Date.now() - chunkStartTime) / 1000,
        log: `FAILED to analyze chunk ${index + 1} (lines ${chunk.startLineNumber}-${chunk.endLineNumber}): ${errorMessage}. This chunk was skipped and may contain undetected errors.`,
        llmInteractions: []
      });

      return [];
    }
  }

  /**
   * Process and deduplicate results
   */
  private async processResults(
    errors: SpellingGrammarError[],
    conventions: DocumentConventions,
    docProcessor: DocumentProcessor,
    tasks: TaskResult[],
    startTime: number
  ): Promise<ProcessedErrorResults> {
    const postProcessingStartTime = Date.now();

    logger.info(`${LOG_PREFIXES.POST_PROCESSING} Stage 3: Post-processing and deduplicating errors`, {
      totalHighlightsBeforeProcessing: errors.length,
      uniqueErrors: new Set(errors.map(e => e.highlightedText)).size
    });

    const processedResults = processErrors(errors, conventions);

    logger.info(`${LOG_PREFIXES.POST_PROCESSING} Complete`, {
      uniqueErrorsFound: processedResults.uniqueErrorCount,
      totalOccurrences: processedResults.totalErrorCount,
      consolidatedGroups: processedResults.errorGroups.length,
      hasConventionIssues: !!processedResults.conventionIssues,
      durationMs: Date.now() - postProcessingStartTime
    });

    tasks.push({
      name: "Post-process and deduplicate errors",
      modelName: ANALYSIS_MODEL,
      priceInDollars: 0,
      timeInSeconds: (Date.now() - postProcessingStartTime) / 1000,
      log: `Consolidated ${errors.length} errors into ${processedResults.uniqueErrorCount} unique groups`,
      llmInteractions: []
    });

    return processedResults;
  }

  /**
   * Generate final output
   */
  private generateOutput(
    document: Document,
    processedResults: ProcessedErrorResults,
    conventions: DocumentConventions,
    wordCount: number,
    fullContent: string,
    docProcessor: DocumentProcessor,
    tasks: TaskResult[]
  ): WorkflowResult {
    // Convert to comments
    const comments = this.convertToComments(processedResults, fullContent, docProcessor);

    // Calculate grade
    const grade = calculateSmartGrade(processedResults, wordCount);

    // Generate analysis
    const analysis = this.generateAnalysis(
      processedResults,
      conventions,
      wordCount,
      grade
    );

    // Generate summary
    const summary = processedResults.uniqueErrorCount === 0
      ? "No spelling or grammar errors detected."
      : `Found ${processedResults.uniqueErrorCount} unique error${processedResults.uniqueErrorCount === 1 ? '' : 's'} (${processedResults.totalErrorCount} total occurrence${processedResults.totalErrorCount === 1 ? '' : 's'}).`;

    // Log final results
    const stats = calculateErrorStatistics(processedResults, wordCount);
    logger.info("Spelling/grammar analysis complete", {
      document: {
        id: document.id,
        title: document.title || "Untitled",
        wordCount,
        characterCount: fullContent.length,
        language: conventions.language,
        formality: conventions.formality,
        documentType: conventions.documentType
      },
      results: stats
    });

    return {
      thinking: "", // No thinking step for spelling/grammar
      analysis,
      summary,
      grade,
      selfCritique: undefined, // No self-critique for spelling/grammar
      highlights: comments,
      tasks
    };
  }

  /**
   * Convert processed errors to comments
   */
  private convertToComments(
    processedResults: ProcessedErrorResults,
    fullContent: string,
    docProcessor: DocumentProcessor
  ): Comment[] {
    const comments: Comment[] = [];

    // Add convention warning if needed
    if (processedResults.conventionIssues) {
      comments.push({
        description: `🔄 Consistency: ${processedResults.conventionIssues.description}`,
        importance: 9,
        grade: 10,
        highlight: {
          startOffset: 0,
          endOffset: 50, // Just highlight the beginning
          quotedText: fullContent.slice(0, 50) + "...",
          isValid: true
        },
        isValid: true
      });
    }

    // Convert error groups to comments
    for (const errorGroup of processedResults.errorGroups) {
      // Limit examples shown
      const exampleCount = errorGroup.count > 2 ? 1 : errorGroup.count;

      for (const error of errorGroup.examples.slice(0, exampleCount)) {
        // Get line content
        const lineStartOffset = docProcessor.getCharacterOffsetForLine(error.lineStart);
        const highlightContent = docProcessor.getContentForLineRange(error.lineStart, error.lineEnd);

        // Convert to comment
        const relativeHighlight = {
          lineStart: 1,
          lineEnd: error.lineEnd - error.lineStart + 1,
          highlightedText: error.highlightedText,
          description: errorGroup.count > 2
            ? `${error.description} (Found ${errorGroup.count} times throughout document)`
            : error.description
        };

        const chunkComments = convertHighlightsToComments(
          [relativeHighlight],
          highlightContent,
          lineStartOffset
        );

        // Adjust importance and grade
        chunkComments.forEach(comment => {
          comment.importance = SEVERITY_TO_IMPORTANCE[errorGroup.severity];
          comment.grade = SEVERITY_TO_GRADE[errorGroup.severity];

          // Add emoji and clean description
          const emoji = getErrorGroupEmoji(errorGroup);
          const typeLabel = getErrorTypeLabel(errorGroup.errorType);
          const cleanedDescription = cleanErrorDescription(comment.description, errorGroup.errorType);
          comment.description = `${emoji} ${typeLabel}: ${cleanedDescription}`;
        });

        comments.push(...chunkComments);
      }
    }

    // Sort by position
    comments.sort((a, b) => a.highlight.startOffset - b.highlight.startOffset);

    return comments;
  }

  /**
   * Generate analysis text
   */
  private generateAnalysis(
    processedResults: ProcessedErrorResults,
    conventions: DocumentConventions,
    wordCount: number,
    grade: number
  ): string {
    const errorsByType = processedResults.errorGroups.reduce((acc, group) => {
      acc[group.errorType] = (acc[group.errorType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const errorDensity = processedResults.uniqueErrorCount / (wordCount / ERROR_DENSITY_WORD_BASE);

    return `## Spelling & Grammar Analysis

This document was analyzed for spelling, grammar, punctuation, and capitalization errors.

### Document Profile
- **Document Type:** ${conventions.documentType}
- **Language Convention:** ${conventions.language} English
- **Formality Level:** ${conventions.formality}

### Error Summary
- **Unique Errors Found:** ${processedResults.uniqueErrorCount}
- **Total Occurrences:** ${processedResults.totalErrorCount}
- **Document Length:** ~${Math.round(wordCount / 10) * 10} words
- **Error Density:** ${errorDensity.toFixed(2)} unique errors per ${ERROR_DENSITY_WORD_BASE} words

### Error Breakdown by Type
${Object.entries(errorsByType)
  .sort(([, a], [, b]) => b - a)
  .map(([type, count]) => `- **${type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}:** ${count} unique error${count === 1 ? '' : 's'}`)
  .join('\n')}

${processedResults.conventionIssues ? `### Convention Issues
⚠️ ${processedResults.conventionIssues.description}
Examples: ${processedResults.conventionIssues.examples.join(', ')}

` : ''}### Document Quality Score

Based on the unique error density and severity, this document receives a **${grade}%** quality score for spelling and grammar.

${getGradeDescription(grade)}

### Most Common Issues
${processedResults.errorGroups.slice(0, 3).map((group, i) => {
  const emoji = getErrorGroupEmoji(group);
  return `${i + 1}. ${emoji} **${group.baseError}** - ${group.count} occurrence${group.count === 1 ? '' : 's'}`;
}).join('\n')}

### Error Severity Legend
- 🔴 **Critical spelling errors** - Must be fixed
- ❌ **Grammar errors** - Affect sentence structure
- ⚠️ **Wrong word choice** - Incorrect word usage
- 🔤 **Capitalization** - Case errors
- 📍 **Punctuation placement** - Missing or misplaced
- 🔄 **Consistency issues** - Mixed conventions
- 💭 **Minor spacing** - Low priority formatting
- 💡 **Style suggestions** - Optional improvements`;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}