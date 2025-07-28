/**
 * Job Debug API
 * 
 * Provides detailed Helicone data for debugging job LLM interactions
 */

import { NextRequest } from 'next/server';
import { heliconeAPI } from '@/lib/helicone/api-client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId } = await params;

    // Get job details and check permissions
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        evaluation: {
          include: {
            agent: {
              include: {
                submittedBy: true
              }
            },
            document: {
              include: {
                submittedBy: true
              }
            }
          }
        }
      }
    });

    if (!job) {
      return Response.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check if user has permission to view this job
    const isJobOwner = (
      job.evaluation.agent.submittedBy?.id === session.user.id ||
      job.evaluation.document.submittedBy?.id === session.user.id
    );
    const isAdmin = session.user.role === 'ADMIN';

    if (!isJobOwner && !isAdmin) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const includeInputs = searchParams.get('includeInputs') !== 'false'; // default true
    const includeMetadata = searchParams.get('includeMetadata') !== 'false'; // default true

    try {
      // Get debug data from Helicone
      const requests = await heliconeAPI.getSessionRequests(jobId);

      if (requests.length === 0) {
        return Response.json({
          jobId,
          message: 'No Helicone data found for this job',
          jobInfo: {
            status: job.status,
            costInCents: job.costInCents,
            createdAt: job.createdAt,
            completedAt: job.completedAt
          },
          requests: []
        });
      }

      // Format debug information
      const debugInfo = requests.map((req) => {
        const baseInfo: any = {
          id: req.id,
          timestamp: req.created_at,
          model: req.model,
          cost: req.cost,
          tokens: {
            prompt: req.prompt_tokens || 0,
            completion: req.completion_tokens || 0,
            total: req.total_tokens || 0
          },
          latency_ms: req.request_path ? undefined : 'N/A', // Some fields may not be available
          sessionPath: req.properties?.['Helicone-Session-Path'] || 'unknown',
          error: req.properties?.error || null
        };

        if (includeInputs) {
          // Note: The current API client interface doesn't include prompt/response
          // This would need to be enhanced to fetch full request details
          baseInfo.prompt = 'Available in enhanced debug mode';
          baseInfo.response = 'Available in enhanced debug mode';
        }

        if (includeMetadata) {
          baseInfo.properties = req.properties;
          baseInfo.sessionInfo = req.session;
        }

        return baseInfo;
      });

      // Calculate summary statistics
      const totalCost = requests.reduce((sum, req) => sum + (req.cost || 0), 0);
      const totalTokens = requests.reduce((sum, req) => sum + (req.total_tokens || 0), 0);
      const promptTokens = requests.reduce((sum, req) => sum + (req.prompt_tokens || 0), 0);
      const completionTokens = requests.reduce((sum, req) => sum + (req.completion_tokens || 0), 0);

      // Group by model for breakdown
      const modelBreakdown = new Map<string, {
        requests: number;
        cost: number;
        tokens: number;
      }>();

      requests.forEach(req => {
        const existing = modelBreakdown.get(req.model) || {
          requests: 0,
          cost: 0,
          tokens: 0
        };
        modelBreakdown.set(req.model, {
          requests: existing.requests + 1,
          cost: existing.cost + (req.cost || 0),
          tokens: existing.tokens + (req.total_tokens || 0)
        });
      });

      const response = {
        jobId,
        jobInfo: {
          status: job.status,
          costInCents: job.costInCents,
          createdAt: job.createdAt,
          completedAt: job.completedAt,
          error: job.error
        },
        heliconeData: {
          summary: {
            requestCount: requests.length,
            totalCostUSD: Number(totalCost.toFixed(4)),
            totalTokens: {
              prompt: promptTokens,
              completion: completionTokens,
              total: totalTokens
            },
            modelBreakdown: Array.from(modelBreakdown.entries()).map(([model, stats]) => ({
              model,
              requests: stats.requests,
              costUSD: Number(stats.cost.toFixed(4)),
              tokens: stats.tokens
            }))
          },
          requests: debugInfo
        }
      };

      return Response.json(response);
    } catch (heliconeError) {
      console.error('Helicone API error for job debug:', heliconeError);
      
      // Return job info even if Helicone fails
      return Response.json({
        jobId,
        jobInfo: {
          status: job.status,
          costInCents: job.costInCents,
          createdAt: job.createdAt,
          completedAt: job.completedAt,
          error: job.error
        },
        heliconeError: 'Failed to fetch debug data from Helicone',
        message: 'Job information available, but Helicone debug data unavailable'
      }, { status: 200 }); // Still return 200 with partial data
    }
  } catch (error) {
    console.error('Job debug API error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Enhanced debug endpoint with full prompt/response data
 * Only available to admins due to potential data sensitivity
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { jobId } = await request.json();

    if (!jobId) {
      return Response.json({ error: 'jobId is required' }, { status: 400 });
    }

    try {
      // Get full request data with inputs
      const requests = await heliconeAPI.queryRequests({
        filter: {
          request: {
            properties: {
              'Helicone-Session-Id': { equals: jobId }
            }
          }
        },
        limit: 100,
        sort: { created_at: 'asc' }
      });

      // This would need enhancement to fetch full prompt/response data
      // The current API client structure doesn't include these fields
      // This endpoint serves as a placeholder for future enhancement

      const enhancedDebugInfo = requests.data.map((req: any, index: number) => ({
        index: index + 1,
        timestamp: req.created_at,
        model: req.model,
        cost: req.cost,
        tokens: {
          prompt: req.prompt_tokens || 0,
          completion: req.completion_tokens || 0
        },
        // These would need to be fetched from the actual Helicone request details
        fullPrompt: 'Would need API enhancement to fetch',
        fullResponse: 'Would need API enhancement to fetch',
        latency: req.latency_ms || 'N/A',
        path: req.properties?.['Helicone-Session-Path'],
        properties: req.properties,
        error: req.error
      }));

      return Response.json({
        jobId,
        enhancedDebug: true,
        note: 'Full prompt/response data requires API client enhancement',
        requests: enhancedDebugInfo
      });
    } catch (heliconeError) {
      console.error('Enhanced debug Helicone error:', heliconeError);
      return Response.json(
        { error: 'Failed to fetch enhanced debug data' },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error('Enhanced debug API error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}