import { NextRequest, NextResponse } from "next/server";
import * as yaml from 'js-yaml';

import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, context: any) {
  const { params } = context;
  const searchParams = request.nextUrl.searchParams;
  
  try {
    const agentId = params.agentId;
    const version = searchParams.get('version') ? Number(searchParams.get('version')) : undefined;
    const startDateTime = searchParams.get('startDateTime') ? new Date(searchParams.get('startDateTime')!) : undefined;
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 50;

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
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Build the query conditions
    const whereConditions: any = {
      agentId: agentId,
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

    // Transform to YAML-friendly structure
    const exportData = {
      export_metadata: {
        agent_id: agentId,
        agent_name: agent.versions[0].name,
        query_params: {
          version: version || "all",
          start_date_time: startDateTime?.toISOString() || "none",
          limit: limit,
        },
        export_date: new Date().toISOString(),
        total_evaluations: evaluations.length,
      },
      agent: {
        id: agent.id,
        name: agent.versions[0].name,
        type: agent.versions[0].agentType,
        current_version: agent.versions[0].version,
        description: agent.versions[0].description,
        generic_instructions: agent.versions[0].genericInstructions,
        summary_instructions: agent.versions[0].summaryInstructions,
        analysis_instructions: agent.versions[0].analysisInstructions,
        comment_instructions: agent.versions[0].commentInstructions,
        grade_instructions: agent.versions[0].gradeInstructions,
        self_critique_instructions: agent.versions[0].selfCritiqueInstructions,
        extended_capability: agent.versions[0].extendedCapabilityId,
      },
      evaluations: evaluations.map((evalVersion) => {
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
            url: evalVersion.evaluation.document.url,
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
              text: comment.text,
              importance: comment.importance,
              highlight: comment.highlight ? {
                text: comment.highlight.text,
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
            cost_in_cents: evalVersion.job.costInCents,
            attempts: evalVersion.job.attempts,
            error: evalVersion.job.error,
            tasks: evalVersion.job.tasks.map((task) => ({
              name: task.name,
              model: task.modelName,
              price_in_cents: task.priceInCents,
              time_in_seconds: task.timeInSeconds,
            })),
          } : null,
        };
      }),
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
    console.error("Error exporting agent data:", error);
    return NextResponse.json(
      { error: "Failed to export agent data" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}