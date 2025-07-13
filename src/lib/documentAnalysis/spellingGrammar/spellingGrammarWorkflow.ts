import type { Agent } from "../../../types/agentSchema";
import type { Document } from "../../../types/documents";
import type { Comment } from "../../../types/documentSchema";
import type { TaskResult } from "../shared/types";
import { analyzeChunk } from "./analyzeChunk";
import { convertHighlightsToComments } from "./highlightConverter";
import type { ChunkWithLineNumbers, SpellingGrammarHighlight } from "./types";
import { getDocumentFullContent } from "../../../utils/documentContentHelpers";
import { logger } from "@/lib/logger";

/**
 * Split document content into chunks with line number tracking
 */
function splitIntoChunks(
  content: string,
  maxChunkSize: number = 3000
): ChunkWithLineNumbers[] {
  const lines = content.split('\n');
  const chunks: ChunkWithLineNumbers[] = [];
  
  let currentChunk: string[] = [];
  let currentChunkStartLine = 1;
  let currentChunkCharCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineLength = line.length + 1; // +1 for newline
    
    // If adding this line would exceed chunk size, create a new chunk
    if (currentChunkCharCount + lineLength > maxChunkSize && currentChunk.length > 0) {
      chunks.push({
        content: currentChunk.join('\n'),
        startLineNumber: currentChunkStartLine,
        lines: [...currentChunk]
      });
      
      currentChunk = [line];
      currentChunkStartLine = i + 1; // Line numbers are 1-based
      currentChunkCharCount = lineLength;
    } else {
      currentChunk.push(line);
      currentChunkCharCount += lineLength;
    }
  }
  
  // Don't forget the last chunk
  if (currentChunk.length > 0) {
    chunks.push({
      content: currentChunk.join('\n'),
      startLineNumber: currentChunkStartLine,
      lines: currentChunk
    });
  }
  
  return chunks;
}

/**
 * Calculate character offset for a given line number in the full content
 */
function getCharacterOffsetForLine(content: string, lineNumber: number): number {
  const lines = content.split('\n');
  let offset = 0;
  
  for (let i = 0; i < lineNumber - 1 && i < lines.length; i++) {
    offset += lines[i].length + 1; // +1 for newline
  }
  
  return offset;
}

/**
 * Complete spelling and grammar analysis workflow
 */
export async function analyzeSpellingGrammarDocument(
  document: Document,
  agentInfo: Agent,
  targetHighlights: number = 20
): Promise<{
  thinking: string;
  analysis: string;
  summary: string;
  grade?: number;
  selfCritique?: string;
  highlights: Comment[];
  tasks: TaskResult[];
}> {
  const tasks: TaskResult[] = [];
  const allHighlights: SpellingGrammarHighlight[] = [];
  
  try {
    // Get the full document content
    const { content: fullContent } = getDocumentFullContent(document);
    
    // Handle empty documents
    if (!fullContent.trim()) {
      logger.info("Document is empty, no analysis needed");
      return {
        thinking: "",
        analysis: "## Spelling & Grammar Analysis\n\nThe document is empty.",
        summary: "No spelling or grammar errors detected.",
        grade: 100,
        selfCritique: undefined,
        highlights: [],
        tasks: []
      };
    }
    
    // Split into chunks
    const chunks = splitIntoChunks(fullContent);
    logger.info(`Split document into ${chunks.length} chunks for spelling/grammar analysis`);
    
    // Analyze each chunk
    const startTime = Date.now();
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      logger.info(`Analyzing chunk ${i + 1}/${chunks.length} (lines ${chunk.startLineNumber}-${chunk.startLineNumber + chunk.lines.length - 1})`);
      
      const chunkHighlights = await analyzeChunk(chunk, {
        agentName: agentInfo.name,
        primaryInstructions: agentInfo.primaryInstructions || "Find all spelling, grammar, punctuation, and capitalization errors."
      });
      
      logger.info(`Found ${chunkHighlights.length} errors in chunk ${i + 1}`);
      allHighlights.push(...chunkHighlights);
      
      // Create a task result for this chunk
      tasks.push({
        taskName: `Analyze chunk ${i + 1}`,
        status: "success" as const,
        duration: Date.now() - startTime,
        metadata: {
          chunkIndex: i,
          linesAnalyzed: chunk.lines.length,
          errorsFound: chunkHighlights.length
        }
      });
    }
    
    // Convert all highlights to comments with proper character offsets
    const comments: Comment[] = [];
    for (const highlight of allHighlights) {
      // Calculate the character offset for the start of the line
      const lineStartOffset = getCharacterOffsetForLine(fullContent, highlight.lineStart);
      
      // Get the content of the lines involved in this highlight
      const lines = fullContent.split('\n');
      const highlightLines = lines.slice(highlight.lineStart - 1, highlight.lineEnd);
      const highlightContent = highlightLines.join('\n');
      
      // Convert to comments using relative line numbers (1-based within the highlight content)
      const relativeHighlight: SpellingGrammarHighlight = {
        ...highlight,
        lineStart: 1,
        lineEnd: highlight.lineEnd - highlight.lineStart + 1
      };
      
      const chunkComments = convertHighlightsToComments(
        [relativeHighlight],
        highlightContent,
        lineStartOffset
      );
      
      comments.push(...chunkComments);
    }
    
    // Sort comments by position in document
    comments.sort((a, b) => a.highlight.startOffset - b.highlight.startOffset);
    
    // Limit to target number of highlights if specified
    const finalHighlights = targetHighlights > 0 
      ? comments.slice(0, targetHighlights)
      : comments;
    
    // Generate analysis and summary
    const { analysis, summary, grade } = generateSpellingGrammarAnalysis(
      document,
      allHighlights,
      chunks.length
    );
    
    logger.info(`Spelling/grammar analysis complete: ${allHighlights.length} total errors found`);
    
    return {
      thinking: "", // No thinking step for spelling/grammar
      analysis,
      summary,
      grade,
      selfCritique: undefined, // No self-critique for spelling/grammar
      highlights: finalHighlights,
      tasks
    };
  } catch (error) {
    logger.error("Error in spelling/grammar analysis workflow:", error);
    throw error;
  }
}

/**
 * Generate analysis and summary from spelling/grammar results
 */
function generateSpellingGrammarAnalysis(
  document: Document,
  highlights: SpellingGrammarHighlight[],
  chunkCount: number
): { analysis: string; summary: string; grade: number } {
  // Categorize errors
  const errorTypes = {
    spelling: 0,
    grammar: 0,
    punctuation: 0,
    capitalization: 0
  };
  
  highlights.forEach(highlight => {
    const desc = highlight.description.toLowerCase();
    if (desc.includes('spelling') || desc.includes('misspell')) {
      errorTypes.spelling++;
    } else if (desc.includes('punctuation') || desc.includes('comma') || desc.includes('period')) {
      errorTypes.punctuation++;
    } else if (desc.includes('capital')) {
      errorTypes.capitalization++;
    } else {
      errorTypes.grammar++;
    }
  });
  
  // Calculate grade based on error density
  const { content } = getDocumentFullContent(document);
  const wordCount = content.split(/\s+/).length;
  const errorDensity = highlights.length / wordCount;
  
  // Grade calculation: Start at 100 and subtract based on error density
  // 1 error per 100 words = -10 points
  const grade = Math.max(0, Math.round(100 - (errorDensity * 1000)));
  
  const analysis = `## Spelling & Grammar Analysis

This document was analyzed for spelling, grammar, punctuation, and capitalization errors.

### Error Summary
- **Total Errors Found:** ${highlights.length}
- **Document Length:** ~${Math.round(wordCount / 10) * 10} words
- **Error Rate:** ${(errorDensity * 100).toFixed(2)} errors per 100 words

### Error Breakdown
${errorTypes.spelling > 0 ? `- **Spelling Errors:** ${errorTypes.spelling}\n` : ''}${errorTypes.grammar > 0 ? `- **Grammar Errors:** ${errorTypes.grammar}\n` : ''}${errorTypes.punctuation > 0 ? `- **Punctuation Errors:** ${errorTypes.punctuation}\n` : ''}${errorTypes.capitalization > 0 ? `- **Capitalization Errors:** ${errorTypes.capitalization}\n` : ''}
### Document Quality Score

Based on the error density, this document receives a **${grade}%** quality score for spelling and grammar.

${highlights.length === 0 ? '**✅ Excellent!** No spelling or grammar errors were detected.' : 
  highlights.length < 5 ? '**Good job!** Only a few minor errors were found.' :
  highlights.length < 15 ? '**Needs improvement.** Several errors affect readability.' :
  '**Significant issues.** Many errors detract from the document\'s professionalism.'}`;

  const summary = highlights.length === 0 
    ? "No spelling or grammar errors detected."
    : `Found ${highlights.length} spelling/grammar error${highlights.length === 1 ? '' : 's'} across ${chunkCount} chunk${chunkCount === 1 ? '' : 's'}.`;

  return { analysis, summary, grade };
}