import { NextRequest, NextResponse } from "next/server";
import * as yaml from 'js-yaml';

import { authenticateRequest } from "@/lib/auth-helpers";
import { prisma } from "@roast/db";
import { errorResponse, successResponse, commonErrors } from "@/lib/api-response-helpers";
import type { AgentExportData, EvaluationWhereConditions } from "@/types/api/agent-export";
import { estimateTokens } from "@roast/ai";

export async function GET(request: NextRequest, context: { params: Promise<{ agentId: string }> }) {
  const params = await context.params;
  const searchParams = request.nextUrl.searchParams;
  
  try {
    // Authenticate request (API key first, then session)
    const userId = await authenticateRequest(request);

    if (!userId) {
      return commonErrors.unauthorized();
    }
    const agentId = params.agentId;
    const version = searchParams.get('version') ? Number(searchParams.get('version')) : undefined;
    const startDateTime = searchParams.get('startDateTime') ? new Date(searchParams.get('startDateTime')!) : undefined;
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 50;
    const showLlmInteractions = searchParams.get('showLlmInteractions') === 'true';
    const batchId = searchParams.get('batchId');

    // First get the agent details
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        versions: {
          orderBy: { version: "desc" },
          take: 1,
        },
        submittedBy: true,
      },
    });

    if (!agent) {
      return commonErrors.notFound("Agent");
    }

    // Build the query conditions
    const whereConditions: any = {
      evaluation: {
        agentId: agentId,
      }
    };

    if (version !== undefined) {
      // Find the agentVersionId for this version number
      const agentVersion = await prisma.agentVersion.findFirst({
        where: {
          agentId: agentId,
          version: version,
        },
      });
      
      if (agentVersion) {
        whereConditions.agentVersionId = agentVersion.id;
      } else {
        return NextResponse.json({ error: `Version ${version} not found` }, { status: 404 });
      }
    }

    if (startDateTime) {
      whereConditions.createdAt = {
        gte: startDateTime,
      };
    }

    // If batchId is provided, filter evaluations by batch
    if (batchId) {
      // First get all job IDs for this batch
      const jobsInBatch = await prisma.job.findMany({
        where: { agentEvalBatchId: batchId },
        select: { evaluationVersionId: true },
      });
      
      const evaluationVersionIds = jobsInBatch
        .map(job => job.evaluationVersionId)
        .filter((id): id is string => id !== null);
      
      whereConditions.id = { in: evaluationVersionIds };
    }

    // Get evaluations with all related data
    const evaluations = await prisma.evaluationVersion.findMany({
      where: whereConditions,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        evaluation: {
          include: {
            document: {
              include: {
                versions: {
                  orderBy: { version: "desc" },
                  take: 1,
                },
                submittedBy: true,
              },
            },
          },
        },
        comments: {
          include: {
            highlight: true,
          },
        },
        job: {
          include: {
            tasks: true,
          },
        },
        agentVersion: true,
      },
    });

    // Calculate statistics
    const stats = {
      total_evaluations: evaluations.length,
      evaluations_with_grades: evaluations.filter(e => e.grade !== null).length,
      average_grade: evaluations.filter(e => e.grade !== null).length > 0
        ? evaluations.filter(e => e.grade !== null).reduce((sum, e) => sum + e.grade!, 0) / evaluations.filter(e => e.grade !== null).length
        : null,
      grade_std_dev: null as number | null,
      average_cost_cents: evaluations.filter(e => e.job?.priceInDollars).length > 0
        ? evaluations.filter(e => e.job?.priceInDollars).reduce((sum, e) => {
            const job = e.job!;
            return sum + (job.priceInDollars ? parseFloat(job.priceInDollars.toString()) * 100 : 0);
          }, 0) / evaluations.filter(e => e.job?.priceInDollars).length
        : null,
      average_duration_seconds: null as number | null,
      total_comments: evaluations.reduce((sum, e) => sum + e.comments.length, 0),
      average_comments_per_eval: evaluations.length > 0 
        ? evaluations.reduce((sum, e) => sum + e.comments.length, 0) / evaluations.length
        : 0,
      self_critique_count: evaluations.filter(e => e.selfCritique).length,
      self_critique_rate: evaluations.length > 0
        ? evaluations.filter(e => e.selfCritique).length / evaluations.length
        : 0,
      job_success_rate: evaluations.filter(e => e.job).length > 0
        ? evaluations.filter(e => e.job?.status === 'COMPLETED').length / evaluations.filter(e => e.job).length
        : 0,
      failed_jobs: evaluations.filter(e => e.job?.status === 'FAILED').length,
    };

    // Calculate grade standard deviation if we have grades
    if (stats.evaluations_with_grades > 1 && stats.average_grade !== null) {
      const grades = evaluations.filter(e => e.grade !== null).map(e => e.grade!);
      const variance = grades.reduce((sum, grade) => sum + Math.pow(grade - stats.average_grade!, 2), 0) / grades.length;
      stats.grade_std_dev = Math.sqrt(variance);
    }

    // Calculate average duration
    const durationsMs = evaluations
      .filter(e => e.job?.completedAt && e.job?.createdAt)
      .map(e => new Date(e.job!.completedAt!).getTime() - new Date(e.job!.createdAt).getTime());
    
    if (durationsMs.length > 0) {
      stats.average_duration_seconds = durationsMs.reduce((sum, d) => sum + d, 0) / durationsMs.length / 1000;
    }

    // Build the export data structure first to get accurate size
    const evaluationData = evaluations.map((evalVersion, index) => {
      const docVersion = evalVersion.evaluation.document.versions[0];
      return {
        evaluation_id: evalVersion.id,
        created_at: evalVersion.createdAt.toISOString(),
        agent_version: evalVersion.agentVersion?.version,
        
        document: {
          id: evalVersion.evaluation.document.id,
          title: docVersion?.title || "Untitled",
          author: evalVersion.evaluation.document.submittedBy.name,
          content: docVersion?.content || "",
          url: docVersion?.urls?.[0] || docVersion?.importUrl || "",
          published_date: evalVersion.evaluation.document.publishedDate?.toISOString(),
          word_count: docVersion?.content?.split(/\s+/).length || 0,
        },
        
        evaluation_result: {
          summary: evalVersion.summary,
          analysis: evalVersion.analysis,
          grade: evalVersion.grade,
          self_critique: evalVersion.selfCritique,
          comment_count: evalVersion.comments.length,
          comments: evalVersion.comments.map((comment) => ({
            description: comment.description,
            importance: comment.importance,
            grade: comment.grade,
            highlight: comment.highlight ? {
              quoted_text: comment.highlight.quotedText,
              start_offset: comment.highlight.startOffset,
              end_offset: comment.highlight.endOffset,
            } : null,
          })),
        },
        
        job: evalVersion.job ? {
          id: evalVersion.job.id,
          status: evalVersion.job.status,
          created_at: evalVersion.job.createdAt.toISOString(),
          completed_at: evalVersion.job.completedAt?.toISOString(),
          cost_in_cents: evalVersion.job.priceInDollars ? Math.round(parseFloat(evalVersion.job.priceInDollars.toString()) * 100) : null,
          attempts: evalVersion.job.attempts,
          error: evalVersion.job.error,
          tasks: evalVersion.job.tasks?.map((task) => {
            const taskData: {
              name: string;
              model: string | null;
              price_in_dollars: number | null;
              time_in_seconds: number | null;
              log: any;
              llm_interactions?: any;
            } = {
              name: task.name,
              model: task.modelName,
              price_in_dollars: Number(task.priceInDollars),
              time_in_seconds: task.timeInSeconds,
              log: task.log ? (() => {
                try {
                  return JSON.parse(task.log);
                } catch (_e) {
                  // If JSON parsing fails, return the raw string
                  return task.log;
                }
              })() : null,
            };
            
            if (showLlmInteractions) {
              // Only include LLM interactions for the first 10% of evaluations (minimum 1)
              const includeForThisEval = index < Math.max(1, Math.ceil(evaluations.length * 0.1));
              if (includeForThisEval) {
                taskData.llm_interactions = task.llmInteractions || null;
              } else if (index === Math.max(1, Math.ceil(evaluations.length * 0.1))) {
                // Add a note on the first evaluation without LLM interactions
                (taskData as any).llm_interactions_note = "LLM interactions omitted for remaining evaluations to reduce export size";
              }
            }
            
            return taskData;
          }) || [],
        } : null,
      };
    });

    // Estimate token count for context window info
    const fullContent = JSON.stringify(evaluationData);
    const charCount = fullContent.length;
    const estimatedTokens = estimateTokens(fullContent);

    // Transform to YAML-friendly structure
    const exportData = {
      export_metadata: {
        agent_id: agentId,
        agent_name: agent.versions[0].name,
        query_params: {
          version: version || "all",
          start_date_time: startDateTime?.toISOString() || "none",
          limit: limit,
          show_llm_interactions: showLlmInteractions,
        },
        export_date: new Date().toISOString(),
        total_evaluations: evaluations.length,
      },
      statistics: stats,
      export_size_info: {
        total_characters: charCount,
        estimated_tokens: estimatedTokens,
        recommended_chunk_size: Math.min(10, evaluations.length),
        warning: estimatedTokens > 100000 ? "This export may exceed typical LLM context windows" : null,
        llm_interactions_included_for: showLlmInteractions 
          ? `First ${Math.max(1, Math.ceil(evaluations.length * 0.1))} evaluations (${Math.min(100, Math.ceil(10))}% sample)`
          : "None",
      },
      agent: {
        id: agent.id,
        name: agent.versions[0].name,
        current_version: agent.versions[0].version,
        description: agent.versions[0].description,
        provides_grades: agent.versions[0].providesGrades,
        instructions: agent.versions[0].primaryInstructions,
        self_critique_instructions: agent.versions[0].selfCritiqueInstructions,
        extended_capability: agent.versions[0].extendedCapabilityId,
      },
      evaluations: evaluationData,
    };

    // Convert to YAML
    const yamlString = yaml.dump(exportData, {
      indent: 2,
      lineWidth: -1, // Don't wrap lines
      noRefs: true,
      sortKeys: false,
    });

    // Return as plain text with YAML content type
    return new NextResponse(yamlString, {
      status: 200,
      headers: {
        'Content-Type': 'text/yaml',
        'Content-Disposition': `attachment; filename="${agent.versions[0].name.toLowerCase().replace(/\s+/g, '-')}-export.yaml"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    // Return more detailed error in development
    const errorMessage = process.env.NODE_ENV === 'development' && error instanceof Error 
      ? error.message 
      : "Failed to export agent data";
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}