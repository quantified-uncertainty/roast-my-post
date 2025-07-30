# Minimal Helicone Integration for Cost Tracking & Debugging

## Overview

Based on the requirement to track costs for users and provide basic debugging capabilities, here's a simplified approach that doesn't require replacing the entire llmInteraction system.

## Core Requirements

1. **Cost Tracking**: Accurate cost per job/evaluation
2. **User Attribution**: Costs broken down by user/agent
3. **Basic Debugging**: Access to prompts/responses when needed
4. **Minimal Changes**: Don't rewrite the entire system

## Proposed Solution

### 1. Keep Existing llmInteraction System

- Continue storing llmInteractions in the database as-is
- This provides immediate debug access without API calls
- No breaking changes to existing code

### 2. Add Helicone Cost Fetching

Create a simple utility to fetch accurate costs from Helicone after job completion:

```typescript
// lib/helicone/costFetcher.ts
export async function fetchJobCostFromHelicone(jobId: string): Promise<{
  totalCostUSD: number;
  tokenCounts: {
    prompt: number;
    completion: number;
    total: number;
  };
  breakdown?: Array<{
    model: string;
    costUSD: number;
    tokens: number;
  }>;
}> {
  const response = await fetch('https://api.helicone.ai/v1/request/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.HELICONE_API_KEY}`
    },
    body: JSON.stringify({
      filter: {
        request: {
          properties: {
            'Helicone-Session-Id': { equals: jobId }
          }
        }
      },
      limit: 1000,
      includeInputs: false  // Don't need full data for costs
    })
  });
  
  const data = await response.json();
  
  // Sum up costs from all requests
  const totalCostUSD = data.reduce((sum: number, req: any) => 
    sum + (req.cost_usd || 0), 0
  );
  
  const tokenCounts = data.reduce((acc: any, req: any) => ({
    prompt: acc.prompt + (req.prompt_tokens || 0),
    completion: acc.completion + (req.completion_tokens || 0),
    total: acc.total + (req.total_tokens || 0)
  }), { prompt: 0, completion: 0, total: 0 });
  
  return { totalCostUSD, tokenCounts };
}
```

### 3. Update Job Completion

Modify JobModel to fetch accurate costs from Helicone:

```typescript
// In JobModel.processJob()
async processJob(job: PrismaJob) {
  // ... existing analysis logic ...
  
  // Get accurate cost from Helicone
  let heliconeData;
  try {
    heliconeData = await fetchJobCostFromHelicone(job.id);
  } catch (error) {
    logger.warn('Failed to fetch Helicone cost data:', error);
    // Fall back to manual calculation
  }
  
  const costInCents = heliconeData 
    ? Math.round(heliconeData.totalCostUSD * 100)
    : calculateApiCost(/* existing logic */);
  
  await this.markJobAsCompleted(job.id, {
    llmThinking: evaluationOutputs.thinking,
    costInCents,
    heliconeVerified: !!heliconeData,  // Track if cost is from Helicone
    durationInSeconds: (Date.now() - startTime) / 1000,
    logs: logContent,
  });
}
```

### 4. Add User Cost Aggregation

Create an endpoint for user cost summaries:

```typescript
// api/users/[userId]/costs/route.ts
export async function GET(request: Request, { params }: { params: { userId: string } }) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '30');
  
  const startTime = Math.floor(Date.now() / 1000) - (days * 24 * 60 * 60);
  
  const response = await fetch('https://api.helicone.ai/v1/user/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.HELICONE_API_KEY}`
    },
    body: JSON.stringify({
      userIds: [params.userId],
      timeFilter: {
        startTimeUnixSeconds: startTime,
        endTimeUnixSeconds: Math.floor(Date.now() / 1000)
      }
    })
  });
  
  const data = await response.json();
  
  return Response.json({
    userId: params.userId,
    period: `${days} days`,
    totalCostUSD: data[0]?.cost_usd || 0,
    totalTokens: {
      prompt: data[0]?.prompt_tokens || 0,
      completion: data[0]?.completion_tokens || 0
    },
    requestCount: data[0]?.count || 0
  });
}
```

### 5. Debug Endpoint (On-Demand)

For debugging, fetch full request data only when needed:

```typescript
// api/jobs/[jobId]/debug/route.ts
export async function GET(request: Request, { params }: { params: { jobId: string } }) {
  // Check auth - only job owner or admin
  
  const response = await fetch('https://api.helicone.ai/v1/request/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.HELICONE_API_KEY}`
    },
    body: JSON.stringify({
      filter: {
        request: {
          properties: {
            'Helicone-Session-Id': { equals: params.jobId }
          }
        }
      },
      limit: 100,
      includeInputs: true,  // Include full prompts/responses for debugging
      sort: { created_at: 'asc' }
    })
  });
  
  const data = await response.json();
  
  // Format for easy debugging
  const debugInfo = data.map((req: any) => ({
    timestamp: req.created_at,
    model: req.model,
    cost: req.cost_usd,
    tokens: {
      prompt: req.prompt_tokens,
      completion: req.completion_tokens
    },
    prompt: req.prompt,
    response: req.response,
    latency: req.latency_ms,
    path: req.properties?.['Helicone-Session-Path'],
    error: req.error
  }));
  
  return Response.json({ jobId: params.jobId, requests: debugInfo });
}
```

## Implementation Benefits

1. **Minimal Code Changes**: Only add new utilities, don't modify existing interfaces
2. **Accurate Costs**: Get real costs from Helicone including latest pricing
3. **Backward Compatible**: Existing data and code continue to work
4. **Performance**: Only fetch from Helicone when needed
5. **Debugging**: Rich debug data available on-demand

## Database Schema Addition

Add one field to track Helicone verification:

```prisma
model Job {
  // ... existing fields ...
  heliconeVerified Boolean @default(false)  // Track if cost came from Helicone
}
```

## Migration Path

### Phase 1: Add Cost Fetching (1 day)
- Implement `fetchJobCostFromHelicone()`
- Update job completion to use Helicone costs
- Add `heliconeVerified` field

### Phase 2: User Dashboards (1 day)
- Add user cost aggregation endpoint
- Create simple cost display in UI
- Add cost trends chart

### Phase 3: Debug Tools (Optional)
- Add debug endpoint for job details
- Create debug UI for viewing full prompts/responses
- Add error tracking dashboard

## Cost Tracking UI Example

```tsx
// components/UserCostDashboard.tsx
export function UserCostDashboard({ userId }: { userId: string }) {
  const { data } = useSWR(`/api/users/${userId}/costs?days=30`);
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">Usage & Costs (Last 30 Days)</h2>
      
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-sm text-gray-600">Total Cost</p>
          <p className="text-2xl font-bold">${data?.totalCostUSD.toFixed(2)}</p>
        </div>
        
        <div>
          <p className="text-sm text-gray-600">Requests</p>
          <p className="text-2xl font-bold">{data?.requestCount}</p>
        </div>
        
        <div>
          <p className="text-sm text-gray-600">Tokens Used</p>
          <p className="text-2xl font-bold">
            {((data?.totalTokens.total || 0) / 1000).toFixed(1)}k
          </p>
        </div>
      </div>
    </div>
  );
}
```

## Conclusion

This approach provides accurate cost tracking and debugging capabilities with minimal changes to the existing codebase. It leverages Helicone for what it does best (accurate cost calculation) while maintaining the existing system for immediate data access.

The total implementation time would be approximately 2-3 days, with immediate benefits in cost accuracy and user visibility.