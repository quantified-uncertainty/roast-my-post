/**
 * User Cost Aggregation API
 * 
 * Provides cost and usage summaries for users via Helicone API
 */

import { NextRequest } from 'next/server';
import { heliconeAPI } from '@/lib/helicone/api-client';
import { auth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Users can only view their own costs (unless admin)
    const requestedUserId = params.userId;
    const currentUserId = session.user.id;
    
    if (requestedUserId !== currentUserId && session.user.role !== 'ADMIN') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const includeBreakdown = searchParams.get('breakdown') === 'true';

    // Validate days parameter
    if (days < 1 || days > 365) {
      return Response.json(
        { error: 'Days parameter must be between 1 and 365' },
        { status: 400 }
      );
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    try {
      // Get usage statistics from Helicone
      const usageStats = await heliconeAPI.getUsageStats(startDate, endDate);

      // Filter requests by user ID using Helicone properties
      // Note: This requires that user ID is being set in Helicone properties
      const userRequests = await heliconeAPI.queryRequests({
        filter: {
          created_at: {
            gte: startDate.toISOString(),
            lte: endDate.toISOString()
          },
          request: {
            // Filter by user ID in properties if available
            properties: requestedUserId ? {
              'UserId': { equals: requestedUserId }
            } : undefined
          }
        },
        limit: 1000,
        sort: { created_at: 'desc' }
      });

      // Calculate user-specific totals
      let totalCostUSD = 0;
      let totalTokens = {
        prompt: 0,
        completion: 0,
        total: 0
      };
      let requestCount = 0;

      const modelBreakdown = new Map<string, {
        requests: number;
        cost: number;
        tokens: number;
      }>();

      userRequests.data.forEach(req => {
        // Verify this request belongs to the user
        const reqUserId = req.properties?.['UserId'] || req.user_id;
        if (reqUserId !== requestedUserId) return;

        totalCostUSD += req.cost || 0;
        totalTokens.prompt += req.prompt_tokens || 0;
        totalTokens.completion += req.completion_tokens || 0;
        totalTokens.total += req.total_tokens || 0;
        requestCount++;

        // Update model breakdown
        if (includeBreakdown) {
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
        }
      });

      const response: any = {
        userId: requestedUserId,
        period: `${days} days`,
        dateRange: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        },
        totalCostUSD: Number(totalCostUSD.toFixed(4)),
        totalTokens,
        requestCount
      };

      if (includeBreakdown) {
        response.breakdown = {
          byModel: Array.from(modelBreakdown.entries()).map(([model, stats]) => ({
            model,
            requests: stats.requests,
            costUSD: Number(stats.cost.toFixed(4)),
            tokens: stats.tokens
          })).sort((a, b) => b.costUSD - a.costUSD)
        };
      }

      return Response.json(response);
    } catch (heliconeError) {
      console.error('Helicone API error:', heliconeError);
      return Response.json(
        { error: 'Failed to fetch cost data from Helicone' },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error('User costs API error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get cost summary for multiple users (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { userIds, days = 30 } = body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return Response.json(
        { error: 'userIds array is required' },
        { status: 400 }
      );
    }

    if (userIds.length > 100) {
      return Response.json(
        { error: 'Cannot query more than 100 users at once' },
        { status: 400 }
      );
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    try {
      // Get all requests in the time period
      const allRequests = await heliconeAPI.queryRequests({
        filter: {
          created_at: {
            gte: startDate.toISOString(),
            lte: endDate.toISOString()
          }
        },
        limit: 10000,
        sort: { created_at: 'desc' }
      });

      // Group by user
      const userStats = new Map<string, {
        requests: number;
        cost: number;
        tokens: number;
      }>();

      allRequests.data.forEach(req => {
        const userId = req.properties?.['UserId'] || req.user_id;
        if (!userId || !userIds.includes(userId)) return;

        const existing = userStats.get(userId) || {
          requests: 0,
          cost: 0,
          tokens: 0
        };

        userStats.set(userId, {
          requests: existing.requests + 1,
          cost: existing.cost + (req.cost || 0),
          tokens: existing.tokens + (req.total_tokens || 0)
        });
      });

      // Format response
      const results = userIds.map(userId => {
        const stats = userStats.get(userId) || {
          requests: 0,
          cost: 0,
          tokens: 0
        };

        return {
          userId,
          requests: stats.requests,
          costUSD: Number(stats.cost.toFixed(4)),
          tokens: stats.tokens
        };
      });

      return Response.json({
        period: `${days} days`,
        dateRange: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        },
        users: results,
        totalCostUSD: Number(results.reduce((sum, user) => sum + user.costUSD, 0).toFixed(4)),
        totalRequests: results.reduce((sum, user) => sum + user.requests, 0)
      });
    } catch (heliconeError) {
      console.error('Helicone API error:', heliconeError);
      return Response.json(
        { error: 'Failed to fetch cost data from Helicone' },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error('Multi-user costs API error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}