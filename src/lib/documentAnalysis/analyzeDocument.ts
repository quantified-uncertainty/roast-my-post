import type { Agent } from "../../types/agentSchema";
import type { Document } from "../../types/documents";
import type { Comment } from "../../types/documentSchema";
import { extractCommentsFromAnalysis } from "./commentExtraction";
import { generateComprehensiveAnalysis } from "./comprehensiveAnalysis";
import { generateSelfCritique } from "./selfCritique";
import { analyzeLinkDocument } from "./linkAnalysis/linkAnalysisWorkflow";
import type { TaskResult } from "./shared/types";

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
  selfCritique?: string;
  comments: Comment[];
  tasks: TaskResult[];
}> {
  // Choose workflow based on agent's extended capability
  if (agentInfo.extendedCapabilityId === "simple-link-verifier") {
    console.log(`🔗 Using link analysis workflow for agent ${agentInfo.name}`);
    return await analyzeLinkDocument(document, agentInfo, targetComments);
  }

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

    // Step 3: Generate self-critique if instructions are provided and randomly selected (10% chance)
    let selfCritique: string | undefined;
    if (agentInfo.selfCritiqueInstructions && Math.random() < 0.1) {
      console.log(`🔍 Generating self-critique...`);
      const critiqueResult = await generateSelfCritique(
        {
          summary: analysisResult.outputs.summary,
          analysis: analysisResult.outputs.analysis,
          grade: analysisResult.outputs.grade,
          comments: commentResult.outputs.comments.map(c => ({
            title: c.highlight?.text || "Comment",
            text: c.text
          }))
        },
        agentInfo
      );
      console.log(`✅ Generated self-critique`);
      selfCritique = critiqueResult.outputs.selfCritique;
      tasks.push(critiqueResult.task);
    }

    return {
      thinking: "", // Keep thinking empty when using comprehensive analysis
      analysis: analysisResult.outputs.analysis,
      summary: analysisResult.outputs.summary,
      grade: analysisResult.outputs.grade,
      selfCritique,
      comments: commentResult.outputs.comments,
      tasks,
    };
  } catch (error) {
    console.error(`❌ Error in comprehensive analysis workflow:`, error);
    throw error;
  }
}
