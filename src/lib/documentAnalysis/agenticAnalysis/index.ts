import { anthropic } from "@/types/openai";
import type { Document } from "@/types/documents";
import type { Agent } from "@/types/agentSchema";
import type { Comment } from "@/types/documentSchema";
import { logger } from "@/lib/logger";
import { z } from "zod";

// The living document that the agent iteratively improves
interface AnalysisDocument {
  summary: string;
  analysis: string;
  comments: Comment[];
  grade?: number;
  metadata: {
    completeness: number; // 0-100
    confidence: number; // 0-100
    areasNeedingWork: string[];
    sectionsAnalyzed: string[];
  };
}

// Tool definitions
const toolSchemas = {
  examine_section: z.object({
    sectionName: z.string().describe("Name of the section to examine"),
    focusArea: z.string().describe("What to focus on in this section"),
  }),
  
  revise_analysis: z.object({
    section: z.string().describe("Which part of the analysis to update"),
    content: z.string().describe("New content to add or replace"),
    operation: z.enum(["append", "replace", "insert"]).describe("How to modify the content"),
  }),
  
  add_comment: z.object({
    quotedText: z.string().describe("Exact quote from the document"),
    comment: z.string().describe("Analysis or critique of this quote"),
    importance: z.number().min(1).max(10).describe("Importance score 1-10"),
  }),
  
  update_summary: z.object({
    summary: z.string().describe("New or updated summary"),
  }),
  
  assign_grade: z.object({
    grade: z.number().min(0).max(100).describe("Grade from 0-100"),
    justification: z.string().describe("Explanation for this grade"),
  }),
  
  check_completeness: z.object({
    aspect: z.string().describe("What aspect to check for completeness"),
  }),
  
  finish_analysis: z.object({
    reason: z.string().describe("Why the analysis is complete"),
  }),
};

const tools = [
  {
    name: "examine_section",
    description: "Deep dive into a specific part of the document to understand it better",
    input_schema: {
      type: "object",
      properties: {
        sectionName: { type: "string", description: "Name of the section to examine" },
        focusArea: { type: "string", description: "What to focus on in this section" },
      },
      required: ["sectionName", "focusArea"],
    },
  },
  {
    name: "revise_analysis",
    description: "Update or expand the main analysis text",
    input_schema: {
      type: "object",
      properties: {
        section: { type: "string", description: "Which part of the analysis to update" },
        content: { type: "string", description: "New content to add or replace" },
        operation: { type: "string", enum: ["append", "replace", "insert"], description: "How to modify the content" },
      },
      required: ["section", "content", "operation"],
    },
  },
  {
    name: "add_comment",
    description: "Add a specific comment about a quote from the document",
    input_schema: {
      type: "object", 
      properties: {
        quotedText: { type: "string", description: "Exact quote from the document" },
        comment: { type: "string", description: "Analysis or critique of this quote" },
        importance: { type: "number", minimum: 1, maximum: 10, description: "Importance score 1-10" },
      },
      required: ["quotedText", "comment", "importance"],
    },
  },
  {
    name: "update_summary",
    description: "Create or update the summary of the analysis",
    input_schema: {
      type: "object",
      properties: {
        summary: { type: "string", description: "New or updated summary" },
      },
      required: ["summary"],
    },
  },
  {
    name: "assign_grade",
    description: "Assign or update the grade for the document",
    input_schema: {
      type: "object",
      properties: {
        grade: { type: "number", minimum: 0, maximum: 100, description: "Grade from 0-100" },
        justification: { type: "string", description: "Explanation for this grade" },
      },
      required: ["grade", "justification"],
    },
  },
  {
    name: "check_completeness",
    description: "Self-evaluate what aspects of the analysis still need work",
    input_schema: {
      type: "object",
      properties: {
        aspect: { type: "string", description: "What aspect to check for completeness" },
      },
      required: ["aspect"],
    },
  },
  {
    name: "finish_analysis",
    description: "Indicate that the analysis is complete and ready",
    input_schema: {
      type: "object",
      properties: {
        reason: { type: "string", description: "Why the analysis is complete" },
      },
      required: ["reason"],
    },
  },
];

interface AgenticAnalysisOptions {
  maxTurns?: number;
  budget?: number;
  verbose?: boolean;
}

interface AgenticAnalysisResult {
  summary: string;
  analysis: string;
  comments: Comment[];
  grade?: number;
  totalCost: number;
  turnsUsed: number;
  toolCalls: Array<{
    turn: number;
    tool: string;
    input: any;
    result: string;
  }>;
}

export async function analyzeWithAgent(
  document: Document,
  agent: Agent,
  options: AgenticAnalysisOptions = {}
): Promise<AgenticAnalysisResult> {
  const { maxTurns = 15, budget = 0.15, verbose = false } = options;

  // Initialize the living document
  const analysisDoc: AnalysisDocument = {
    summary: "",
    analysis: "",
    comments: [],
    grade: undefined,
    metadata: {
      completeness: 0,
      confidence: 0,
      areasNeedingWork: ["initial analysis", "summary", "comments", "grade"],
      sectionsAnalyzed: [],
    },
  };

  const toolCalls: AgenticAnalysisResult["toolCalls"] = [];
  let totalCost = 0;
  let finished = false;

  // Build system prompt
  const systemPrompt = `You are an AI document analysis agent. Your goal is to thoroughly analyze the provided document according to these instructions:

${agent.primaryInstructions || "Provide a comprehensive analysis."}

You have access to tools that let you iteratively build up a complete analysis. Start by examining the document, then progressively build your analysis, add specific comments, and assign a grade.

Important guidelines:
- Build the analysis iteratively - don't try to do everything at once
- Add specific comments with exact quotes from the document
- Be thorough but efficient - use tools purposefully
- Self-reflect on completeness and improve weak areas
- Finish when you're confident the analysis is complete

Current document length: ${document.content?.length || 0} characters`;

  // Conversation history
  const messages: any[] = [
    {
      role: "user",
      content: `Please analyze this document titled "${document.title}":

${document.content}

Start by examining the document structure and key points, then build a comprehensive analysis with specific comments.`,
    },
  ];

  // Main agent loop
  for (let turn = 0; turn < maxTurns && !finished; turn++) {
    if (verbose) {
      logger.info(`Agent turn ${turn + 1}`, {
        completeness: analysisDoc.metadata.completeness,
        confidence: analysisDoc.metadata.confidence,
        areasNeedingWork: analysisDoc.metadata.areasNeedingWork,
      });
    }

    try {
      // Add current state to prompt
      const stateMessage = `Current analysis state:
- Summary length: ${analysisDoc.summary.length} chars
- Analysis length: ${analysisDoc.analysis.length} chars  
- Comments: ${analysisDoc.comments.length}
- Grade: ${analysisDoc.grade || "Not assigned"}
- Completeness: ${analysisDoc.metadata.completeness}%
- Areas needing work: ${analysisDoc.metadata.areasNeedingWork.join(", ")}`;

      const response = await anthropic.messages.create({
        model: "claude-4-sonnet-20250514",
        max_tokens: 4096,
        temperature: 0.7,
        system: systemPrompt,
        messages: [
          ...messages,
          { role: "user", content: stateMessage },
        ],
        tools: tools as any,
        tool_choice: { type: "any" },
      });

      // Track costs
      if (response.usage) {
        const turnCost =
          (response.usage.input_tokens * 3) / 1_000_000 +
          (response.usage.output_tokens * 15) / 1_000_000;
        totalCost += turnCost;

        if (verbose) {
          logger.info(`Turn ${turn + 1} cost: $${turnCost.toFixed(4)}`);
        }

        if (totalCost > budget) {
          logger.warn("Budget exceeded, finishing analysis");
          break;
        }
      }

      // Process the response
      messages.push({ role: "assistant", content: response.content });

      // Handle tool calls
      for (const content of response.content) {
        if (content.type === "tool_use") {
          const toolName = content.name;
          const toolInput = content.input;
          const toolCallId = content.id;

          if (verbose) {
            logger.info(`Tool call: ${toolName}`, toolInput);
          }

          // Execute the tool
          const result = await executeAgentTool(
            toolName,
            toolInput,
            analysisDoc,
            document
          );

          toolCalls.push({
            turn: turn + 1,
            tool: toolName,
            input: toolInput,
            result,
          });

          // Add tool result to messages
          messages.push({
            role: "user",
            content: [
              {
                type: "tool_result",
                tool_use_id: toolCallId,
                content: result,
              },
            ],
          });

          // Check if analysis is finished
          if (toolName === "finish_analysis") {
            finished = true;
            break;
          }
        }
      }
    } catch (error) {
      logger.error(`Error in agent turn ${turn + 1}`, error);
      break;
    }
  }

  // Convert to standard result format
  return {
    summary: analysisDoc.summary,
    analysis: analysisDoc.analysis,
    comments: analysisDoc.comments,
    grade: analysisDoc.grade,
    totalCost,
    turnsUsed: toolCalls.length,
    toolCalls,
  };
}

async function executeAgentTool(
  toolName: string,
  input: any,
  analysisDoc: AnalysisDocument,
  document: Document
): Promise<string> {
  switch (toolName) {
    case "examine_section": {
      const { sectionName, focusArea } = toolSchemas.examine_section.parse(input);
      analysisDoc.metadata.sectionsAnalyzed.push(sectionName);
      return `Examined section "${sectionName}" with focus on "${focusArea}". You can now add analysis or comments based on your findings.`;
    }

    case "revise_analysis": {
      const { section, content, operation } = toolSchemas.revise_analysis.parse(input);
      
      if (operation === "replace") {
        analysisDoc.analysis = content;
      } else if (operation === "append") {
        analysisDoc.analysis += "\n\n" + content;
      } else {
        // Insert operation - simplified for now
        analysisDoc.analysis = content + "\n\n" + analysisDoc.analysis;
      }
      
      analysisDoc.metadata.completeness = Math.min(100, analysisDoc.metadata.completeness + 15);
      analysisDoc.metadata.areasNeedingWork = analysisDoc.metadata.areasNeedingWork.filter(
        area => area !== "initial analysis"
      );
      
      return `Analysis ${operation}d successfully. New length: ${analysisDoc.analysis.length} chars`;
    }

    case "add_comment": {
      const { quotedText, comment, importance } = toolSchemas.add_comment.parse(input);
      
      // Find the quoted text in the document
      const lines = document.content?.split('\n') || [];
      const lineIndex = lines.findIndex(line => line.includes(quotedText.substring(0, 30)));
      const lineNumber = lineIndex >= 0 ? lineIndex + 1 : 1;
      
      analysisDoc.comments.push({
        description: comment,
        highlight: {
          startOffset: 0,
          endOffset: quotedText.length,
          quotedText,
          isValid: true,
          prefix: `Line ${lineNumber}: `,
        },
        isValid: true,
        importance,
      });
      
      analysisDoc.metadata.completeness = Math.min(100, analysisDoc.metadata.completeness + 5);
      if (analysisDoc.comments.length >= 3) {
        analysisDoc.metadata.areasNeedingWork = analysisDoc.metadata.areasNeedingWork.filter(
          area => area !== "comments"
        );
      }
      
      return `Added comment #${analysisDoc.comments.length} with importance ${importance}/10`;
    }

    case "update_summary": {
      const { summary } = toolSchemas.update_summary.parse(input);
      analysisDoc.summary = summary;
      analysisDoc.metadata.completeness = Math.min(100, analysisDoc.metadata.completeness + 10);
      analysisDoc.metadata.areasNeedingWork = analysisDoc.metadata.areasNeedingWork.filter(
        area => area !== "summary"
      );
      return `Summary updated. Length: ${summary.length} chars`;
    }

    case "assign_grade": {
      const { grade, justification } = toolSchemas.assign_grade.parse(input);
      analysisDoc.grade = grade;
      analysisDoc.analysis += `\n\n**Grade Justification**: ${justification}`;
      analysisDoc.metadata.completeness = Math.min(100, analysisDoc.metadata.completeness + 10);
      analysisDoc.metadata.areasNeedingWork = analysisDoc.metadata.areasNeedingWork.filter(
        area => area !== "grade"
      );
      return `Grade assigned: ${grade}/100 with justification`;
    }

    case "check_completeness": {
      const { aspect } = toolSchemas.check_completeness.parse(input);
      
      // Update metadata based on current state
      const areas: string[] = [];
      if (analysisDoc.analysis.length < 500) areas.push("analysis depth");
      if (analysisDoc.comments.length < 3) areas.push("more comments");
      if (!analysisDoc.grade) areas.push("grade assignment");
      if (analysisDoc.summary.length < 100) areas.push("summary");
      
      analysisDoc.metadata.areasNeedingWork = areas;
      analysisDoc.metadata.confidence = 
        analysisDoc.analysis.length > 500 && 
        analysisDoc.comments.length >= 3 && 
        analysisDoc.grade !== undefined 
          ? 90 
          : 50;
      
      return `Completeness check for "${aspect}". Areas still needing work: ${areas.join(", ") || "none"}. Confidence: ${analysisDoc.metadata.confidence}%`;
    }

    case "finish_analysis": {
      const { reason } = toolSchemas.finish_analysis.parse(input);
      analysisDoc.metadata.completeness = 100;
      analysisDoc.metadata.confidence = 95;
      return `Analysis marked as complete. Reason: ${reason}`;
    }

    default:
      return `Unknown tool: ${toolName}`;
  }
}