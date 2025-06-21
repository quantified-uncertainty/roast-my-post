import type { Agent } from "../../types/agentSchema";
import type { Document } from "../../types/documents";
import type { Comment } from "../../types/documentSchema";
import { generateAnalysis } from "./analysis";
import { extractCommentsFromAnalysis } from "./commentExtraction";
import { getCommentData } from "./commentGeneration";
import { generateComprehensiveAnalysis } from "./comprehensiveAnalysis";
import { analyzeLinkDocument } from "./linkAnalysis/linkAnalysisWorkflow";
import type { TaskResult } from "./shared/types";
import { generateThinking } from "./thinking";

export async function analyzeDocument(
  document: Document,
  agentInfo: Agent,
  targetWordCount: number = 500,
  targetComments: number = 5,
  anthropicApiKey?: string
): Promise<{
  thinking: string;
  analysis: string;
  summary: string;
  grade?: number;
  comments: Comment[];
  tasks: TaskResult[];
}> {
  // Choose workflow based on agent's extended capability
  if (agentInfo.extendedCapabilityId === "simple-link-verifier") {
    console.log(`🔗 Using link analysis workflow for agent ${agentInfo.name}`);
    return await analyzeLinkDocument(document, agentInfo, targetComments);
  }

  // Check if we should use comprehensive analysis (can be controlled via env var or agent config)
  const useComprehensiveAnalysis = true; //process.env.USE_COMPREHENSIVE_ANALYSIS === 'true';
  
  console.log(`🔍 DEBUG: analyzeDocument called with:`, {
    documentTitle: document.title,
    agentName: agentInfo.name,
    targetWordCount,
    targetComments,
    useComprehensiveAnalysis
  });

  if (useComprehensiveAnalysis) {
    console.log(
      `📝 Using comprehensive analysis workflow for agent ${agentInfo.name}`
    );

    const tasks: TaskResult[] = [];

    try {
      // Step 1: Generate comprehensive analysis (includes everything)
      console.log(`🚀 Starting comprehensive analysis generation...`);
      const analysisResult = await generateComprehensiveAnalysis(
        document,
        agentInfo,
        targetWordCount,
        targetComments
      );
      console.log(`✅ Comprehensive analysis generated, length: ${analysisResult.outputs.analysis.length}, insights: ${analysisResult.outputs.commentInsights.length}`);
      tasks.push(analysisResult.task);

      // Step 2: Extract and format comments from the analysis
      console.log(`🔍 Extracting comments from analysis...`);
      const commentResult = await extractCommentsFromAnalysis(
        document,
        agentInfo,
        analysisResult.outputs,
        targetComments
      );
      console.log(`✅ Extracted ${commentResult.outputs.comments.length} comments`);
      tasks.push(commentResult.task);

      return {
        thinking: "", // Keep thinking empty when using comprehensive analysis
        analysis: analysisResult.outputs.analysis,
        summary: analysisResult.outputs.summary,
        grade: analysisResult.outputs.grade,
        comments: commentResult.outputs.comments,
        tasks,
      };
    } catch (error) {
      console.error(`❌ Error in comprehensive analysis workflow:`, error);
      throw error;
    }
  } else {
    console.log(
      `📝 Using standard analysis workflow for agent ${agentInfo.name}`
    );

    // Standard workflow
    const tasks: TaskResult[] = [];

    // Step 1: Generate comprehensive thinking
    const thinkingResult = await generateThinking(document, agentInfo);
    tasks.push(thinkingResult.task);

    // Step 2: Generate analysis based on thinking
    const analysisResult = await generateAnalysis(
      document,
      agentInfo,
      thinkingResult.outputs,
      targetWordCount
    );
    tasks.push(analysisResult.task);

    // Step 3: Generate comments based on thinking
    const commentResult = await getCommentData(
      document,
      agentInfo,
      thinkingResult.outputs,
      targetComments
    );
    tasks.push(commentResult.task);

    return {
      thinking: thinkingResult.outputs.thinking,
      analysis: analysisResult.outputs.analysis,
      summary: analysisResult.outputs.summary,
      grade: analysisResult.outputs.grade,
      comments: commentResult.outputs.comments,
      tasks,
    };
  }
}
