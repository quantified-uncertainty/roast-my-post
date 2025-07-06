import { anthropic } from "@/types/openai";
import type { Document } from "@/types/documents";
import type { Agent } from "@/types/agentSchema";
import type { Comment } from "@/types/documentSchema";
import { logger } from "@/lib/logger";
import { BudgetTracker } from "../claudeCodeAnalysis/budgetTracker";
import { withTimeout } from "@/types/openai";

interface MultiTurnAnalysisResult {
  analysis: string;
  summary: string;
  grade?: number;
  comments: Comment[];
  conversationHistory: Array<{ role: string; content: string }>;
  totalCost: number;
  turnCount: number;
  budgetUsed: number;
}

interface MultiTurnOptions {
  budget?: number;
  maxTurns?: number;
  verbose?: boolean;
  temperature?: number;
}

export async function analyzeWithMultiTurn(
  document: Document,
  agent: Agent,
  options: MultiTurnOptions = {}
): Promise<MultiTurnAnalysisResult> {
  const { 
    budget = 0.10, // Increased for longer documents
    maxTurns = 5, 
    verbose = false,
    temperature = 0.7 
  } = options;

  const tracker = new BudgetTracker(budget);
  const conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = [];
  
  // Build system prompt
  const systemPrompt = buildSystemPrompt(agent);
  
  // Initial user message
  const initialMessage = buildInitialMessage(document);
  conversationHistory.push({ role: "user", content: initialMessage });

  if (verbose) {
    logger.info("Starting multi-turn analysis", {
      agentName: agent.name,
      documentId: document.id,
      budget,
      maxTurns,
    });
  }

  let analysis = "";
  let summary = "";
  let grade: number | undefined;
  const comments: Comment[] = [];

  // Multi-turn conversation loop
  for (let turn = 0; turn < maxTurns; turn++) {
    try {
      const response = await withTimeout(
        anthropic.messages.create({
          model: "claude-4-sonnet-20250514",
          max_tokens: 4096,
          temperature,
          system: systemPrompt,
          messages: conversationHistory,
        }),
        60000, // 60 second timeout per turn
        `Turn ${turn + 1} timed out`
      );

      // Track costs
      if (response.usage) {
        const turnCost = tracker.calculateCost(
          response.usage.input_tokens,
          response.usage.output_tokens
        );
        tracker.addTurn(turnCost, response.usage);

        if (verbose) {
          logger.info(`Turn ${turn + 1} cost: $${turnCost.toFixed(4)}, total: $${tracker.getTotalCost().toFixed(4)}`);
        }

        // Check budget
        if (tracker.isOverBudget()) {
          logger.warn("Budget exceeded, ending conversation", {
            used: tracker.getTotalCost(),
            budget,
          });
          break;
        }
      }

      // Extract text content
      const assistantContent = response.content
        .filter(block => block.type === "text")
        .map(block => block.text)
        .join("\n");

      conversationHistory.push({ role: "assistant", content: assistantContent });

      // Process the response based on turn
      if (turn === 0) {
        // First turn: capture initial analysis
        analysis = assistantContent;
        summary = extractSummary(assistantContent);
      } else if (turn === maxTurns - 1) {
        // Last turn: extract final elements
        const finalComments = extractComments(assistantContent, document);
        comments.push(...finalComments);
        
        const extractedGrade = extractGrade(assistantContent);
        if (extractedGrade !== undefined) {
          grade = extractedGrade;
        }
        
        // Update summary if a better one is provided
        const newSummary = extractSummary(assistantContent);
        if (newSummary.length > summary.length) {
          summary = newSummary;
        }
      } else {
        // Middle turns: accumulate insights
        analysis += "\n\n" + assistantContent;
        
        // Extract any comments found
        const turnComments = extractComments(assistantContent, document);
        comments.push(...turnComments);
      }

      // Add continuation prompt for next turn
      if (turn < maxTurns - 1) {
        const continuationPrompt = getContinuationPrompt(turn, maxTurns, comments.length);
        conversationHistory.push({ role: "user", content: continuationPrompt });
      }

    } catch (error) {
      logger.error(`Error in turn ${turn + 1}`, error);
      break;
    }
  }

  return {
    analysis,
    summary: summary || analysis.substring(0, 300) + "...",
    grade,
    comments: comments.slice(0, 10), // Limit to 10 comments
    conversationHistory: conversationHistory.map(msg => ({ 
      role: msg.role, 
      content: msg.content 
    })),
    totalCost: tracker.getTotalCost(),
    turnCount: tracker.getTurnCount(),
    budgetUsed: tracker.getBudgetUtilization(),
  };
}

function buildSystemPrompt(agent: Agent): string {
  return `You are an AI document analysis assistant. Your goal is to provide thorough, insightful analysis of documents through careful, step-by-step evaluation.

${agent.primaryInstructions || ""}

Your analysis should:
1. Identify key arguments and claims
2. Evaluate logical coherence and evidence quality
3. Note strengths and weaknesses
4. Provide specific, actionable feedback
5. Assign a grade if appropriate

When providing comments, always include:
- The exact quote from the document
- Your specific concern or observation
- Constructive suggestions when relevant`;
}

function buildInitialMessage(document: Document): string {
  // Truncate very long documents to avoid token limits
  const maxContentLength = 15000; // ~3750 tokens
  let content = document.content || "";
  let truncated = false;
  
  if (content.length > maxContentLength) {
    content = content.substring(0, maxContentLength);
    truncated = true;
    // Try to cut at a paragraph boundary
    const lastParagraph = content.lastIndexOf("\n\n");
    if (lastParagraph > maxContentLength * 0.8) {
      content = content.substring(0, lastParagraph);
    }
    content += "\n\n[Document truncated for analysis - focusing on first portion]";
  }
  
  return `Please analyze this document titled "${document.title}":

${content}

Begin with a concise overview of the document's main thesis and key arguments.`;
}

function getContinuationPrompt(turn: number, maxTurns: number, commentCount: number): string {
  const prompts = [
    "Now identify 2-3 key arguments and evaluate their evidence quality.",
    "Examine the logical structure. What are 2-3 specific strengths or weaknesses?",
    `Generate ${Math.max(5 - commentCount, 3)} specific comments. For each:
- Quote the exact text (20-50 words)
- Explain your concern or observation
- Keep each comment focused on one issue

Example format:
"The author claims that AI intellectuals are 'neglected' without data" - This assertion lacks supporting evidence from research funding or publication metrics.`,
  ];

  if (turn === maxTurns - 2) {
    return `This is your final turn. Please provide:

1. SPECIFIC COMMENTS (3-5 total):
"exact quote from the document" - Your analysis of this quote

2. OVERALL ASSESSMENT (2-3 sentences)

3. GRADE: XX/100 - Brief justification`;
  }

  return prompts[turn] || "Continue analysis, focus on specific examples.";
}

function extractSummary(content: string): string {
  // Look for summary sections
  const summaryMatch = content.match(/(?:summary|overview|in summary)[::\s]*\n?([\s\S]{100,800}?)(?=\n\n|\n[A-Z]|$)/i);
  if (summaryMatch) {
    return summaryMatch[1].trim();
  }
  
  // Fallback: use first substantial paragraph
  const paragraphs = content.split("\n\n").filter(p => p.length > 100);
  return paragraphs[0] || "";
}

function extractGrade(content: string): number | undefined {
  // Look for various grade patterns
  const patterns = [
    /grade[:\s]+(\d+)\s*(?:\/\s*100)?/i,
    /score[:\s]+(\d+)\s*(?:\/\s*100)?/i,
    /rating[:\s]+(\d+)\s*(?:\/\s*100)?/i,
    /(\d+)\s*\/\s*100/,
  ];
  
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      const grade = parseInt(match[1], 10);
      if (grade >= 0 && grade <= 100) {
        return grade;
      }
    }
  }
  
  return undefined;
}

function extractComments(content: string, document: Document): Comment[] {
  const comments: Comment[] = [];
  const lines = document.content?.split('\n') || [];
  
  // Primary pattern: "quote" - explanation
  const primaryPattern = /[""]([^""]{15,300})["''"]\s*[-–—]\s*([^.!?\n]{10,400})[.!?]?/gi;
  
  let match;
  const seenQuotes = new Set<string>();
  
  while ((match = primaryPattern.exec(content)) !== null) {
    const quote = match[1].trim();
    const explanation = match[2].trim();
    
    if (seenQuotes.has(quote)) continue;
    seenQuotes.add(quote);
    
    // Find the line number in the original document
    const lineIndex = lines.findIndex(line => line.includes(quote.substring(0, 30)));
    const lineNumber = lineIndex >= 0 ? lineIndex + 1 : 1;
    
    comments.push({
      description: explanation,
      highlight: {
        startOffset: 0,
        endOffset: quote.length,
        quotedText: quote,
        isValid: true,
        prefix: `Line ${lineNumber}: `,
      },
      isValid: true,
      importance: 5,
    });
  }
  
  // Secondary pattern: bullet points with quotes
  const bulletPattern = /^[\s-•*]+["']([^""'']{15,300})["'']\s*[:：]?\s*([^.!?\n]{10,400})/gim;
  
  while ((match = bulletPattern.exec(content)) !== null) {
    const quote = match[1].trim();
    const explanation = match[2].trim();
    
    if (seenQuotes.has(quote)) continue;
    seenQuotes.add(quote);
    
    const lineIndex = lines.findIndex(line => line.includes(quote.substring(0, 30)));
    const lineNumber = lineIndex >= 0 ? lineIndex + 1 : 1;
    
    comments.push({
      description: explanation,
      highlight: {
        startOffset: 0,
        endOffset: quote.length,
        quotedText: quote,
        isValid: true,
        prefix: `Line ${lineNumber}: `,
      },
      isValid: true,
      importance: 5,
    });
  }
  
  // Fallback: numbered comments
  const numberedPattern = /\d+\.\s*["']([^""'']{15,300})["'']\s*[-–—:：]?\s*([^.!?\n]{10,400})/gi;
  
  while ((match = numberedPattern.exec(content)) !== null) {
    const quote = match[1].trim();
    const explanation = match[2].trim();
    
    if (seenQuotes.has(quote)) continue;
    seenQuotes.add(quote);
    
    const lineIndex = lines.findIndex(line => line.includes(quote.substring(0, 30)));
    const lineNumber = lineIndex >= 0 ? lineIndex + 1 : 1;
    
    comments.push({
      description: explanation,
      highlight: {
        startOffset: 0,
        endOffset: quote.length,
        quotedText: quote,
        isValid: true,
        prefix: `Line ${lineNumber}: `,
      },
      isValid: true,
      importance: 5,
    });
  }
  
  return comments.slice(0, 15); // Return up to 15 comments
}