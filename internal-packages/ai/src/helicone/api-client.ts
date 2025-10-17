/**
 * Helicone API Client
 *
 * Utilities for interacting with Helicone's REST API to:
 * - Test session integration
 * - Get cost/usage statistics
 * - Query request data
 */

// Session configuration
const heliconeSessionsConfig = {
  enabled: true, // Helicone session tracking is enabled
  properties: ["userId"],
};

export interface HeliconeRequest {
  request_id?: string;
  response_id?: string;
  request_created_at?: string;
  response_created_at?: string;
  model: string;
  request_user_id?: string;
  completion_tokens?: number;
  prompt_tokens?: number;
  total_tokens?: number;
  cost?: number;
  request_properties?: Record<string, string>;
  request_path?: string;
  delay_ms?: number;
  time_to_first_token?: number;
}

export interface HeliconeQueryFilter {
  request?: {
    model?: { equals?: string; contains?: string };
    user_id?: { equals?: string };
    properties?: Record<string, { equals?: string }>;
  };
  response?: { status?: { equals?: number } };
  created_at?: {
    gte?: string; // ISO date string
    lte?: string;
  };
}

export interface HeliconeQueryOptions {
  filter: HeliconeQueryFilter | "all";
  offset?: number;
  limit?: number;
  sort?: { created_at?: "asc" | "desc"; cost?: "asc" | "desc" };
}

export interface HeliconeQueryResponse {
  data: HeliconeRequest[];
  totalCount?: number;
}

export interface HeliconeClickhouseQueryOptions {
  filter: any; // Using 'any' for flexibility as the filter structure is complex
  offset?: number;
  limit?: number;
  sort?: { created_at?: "asc" | "desc"; cost?: "asc" | "desc" };
}

export interface HeliconeSession {
  created_at: string;
  latest_request_created_at: string;
  session_id: string;
  session_name: string;
  avg_latency: number;
  total_cost: number;
  total_requests: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface HeliconeSessionQueryResponse {
  data: HeliconeSession[];
  error?: any;
}

export interface HeliconeSessionQueryOptions {
  timeFilter: { startTimeUnixMs: number; endTimeUnixMs: number };
  filter?: any;
  search?: string;
  timezoneDifference?: number;
  limit?: number;
  offset?: number;
}

export class HeliconeAPIClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.HELICONE_API_KEY || "";
    // Use EU endpoint if configured
    this.baseUrl =
      process.env.HELICONE_API_BASE_URL || "https://api.helicone.ai";

    if (!this.apiKey) {
      throw new Error(
        "Helicone API key is required. Set HELICONE_API_KEY environment variable."
      );
    }
  }

  /**
   * Query requests from Helicone
   */
  async queryRequests(
    options: HeliconeQueryOptions
  ): Promise<HeliconeQueryResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/request/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(options),
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      if (!response.ok) {
        let errorMessage: string;
        try {
          const errorData = await response.text();
          errorMessage = errorData || response.statusText;
        } catch {
          errorMessage = response.statusText;
        }

        // Handle specific error cases
        if (response.status === 429) {
          throw new Error(
            `Helicone API rate limit exceeded (${response.status}): ${errorMessage}`
          );
        } else if (response.status >= 500) {
          throw new Error(
            `Helicone API server error (${response.status}): ${errorMessage}`
          );
        } else if (response.status === 401) {
          throw new Error(
            `Helicone API authentication failed (${response.status}): Invalid API key`
          );
        } else {
          throw new Error(
            `Helicone API error (${response.status}): ${errorMessage}`
          );
        }
      }

      return await response.json();
    } catch (error) {
      // Handle network errors and timeouts
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new Error(
          `Network error connecting to Helicone API: ${error.message}`
        );
      } else if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Helicone API request timeout (30s exceeded)");
      }
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Get all requests for a specific session
   */
  async getSessionRequests(sessionId: string): Promise<HeliconeRequest[]> {
    const response = await this.queryRequestsClickhouse({
      filter: {
        request_response_rmt: {
          properties: { "Helicone-Session-Id": { equals: sessionId } },
        },
      },
      limit: 1000, // High limit to get all requests in a session
      sort: { created_at: "asc" },
    });
    return response.data || [];
  }

  /**
   * Get cost statistics for a session
   */
  async getSessionCosts(sessionId: string): Promise<{
    totalCost: number;
    totalTokens: number;
    requestCount: number;
    breakdown: Array<{
      model: string;
      cost: number;
      tokens: number;
      count: number;
    }>;
  }> {
    const requests = await this.getSessionRequests(sessionId);

    const totalCost = requests.reduce(
      (sum, req) => sum + (req.costUSD || 0),
      0
    );
    const totalTokens = requests.reduce(
      (sum, req) => sum + (req.total_tokens || 0),
      0
    );

    // Group by model
    const modelStats = new Map<
      string,
      { cost: number; tokens: number; count: number }
    >();

    requests.forEach((req) => {
      const existing = modelStats.get(req.model) || {
        cost: 0,
        tokens: 0,
        count: 0,
      };
      modelStats.set(req.model, {
        cost: existing.cost + (req.costUSD || 0),
        tokens: existing.tokens + (req.total_tokens || 0),
        count: existing.count + 1,
      });
    });

    const breakdown = Array.from(modelStats.entries()).map(
      ([model, stats]) => ({ model, ...stats })
    );

    return { totalCost, totalTokens, requestCount: requests.length, breakdown };
  }

  /**
   * Get recent job sessions
   */
  async getRecentJobSessions(limit: number = 10): Promise<
    Array<{
      sessionId: string;
      sessionName: string;
      jobId: string;
      agentName: string;
      documentTitle: string;
      createdAt: string;
      requestCount: number;
      totalCost: number;
    }>
  > {
    // Get recent requests and filter for job sessions
    const result = await this.queryRequests({
      filter: "all",
      sort: { created_at: "desc" },
      limit: 500, // Get recent requests
    });

    // Group by session and extract metadata
    const sessionMap = new Map<string, any>();

    result.data.forEach((req) => {
      const sessionId = req.request_properties?.["Helicone-Session-Id"];
      if (!sessionId) return;

      if (!sessionMap.has(sessionId)) {
        sessionMap.set(sessionId, {
          sessionId,
          sessionName: req.request_properties?.["Helicone-Session-Name"] || "",
          jobId: req.request_properties?.["JobId"] || "",
          agentName: req.request_properties?.["AgentName"] || "",
          documentTitle: req.request_properties?.["DocumentTitle"] || "",
          createdAt: req.request_created_at || req.response_created_at || "",
          requests: [],
          totalCost: 0,
        });
      }

      const session = sessionMap.get(sessionId);
      session.requests.push(req);
      session.totalCost += req.costUSD || 0;
    });

    // Convert to array and sort by creation date
    return Array.from(sessionMap.values())
      .filter((s) => s.jobId) // Only job sessions
      .map((s) => ({
        sessionId: s.sessionId,
        sessionName: s.sessionName,
        jobId: s.jobId,
        agentName: s.agentName,
        documentTitle: s.documentTitle,
        createdAt: s.createdAt,
        requestCount: s.requests.length,
        totalCost: s.totalCost,
      }))
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, limit);
  }

  /**
   * Test if sessions are working by checking recent requests
   */
  async testSessionIntegration(): Promise<{
    isWorking: boolean;
    sessionsFound: number;
    recentSessions: Array<{
      id: string;
      name: string;
      path: string;
      requestCount: number;
    }>;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      // Get recent requests
      const result = await this.queryRequests({
        filter: "all",
        sort: { created_at: "desc" },
        limit: 100,
      });

      // Check for sessions
      const sessionsMap = new Map<
        string,
        { name: string; paths: Set<string>; count: number }
      >();

      result.data.forEach((req) => {
        const sessionId = req.request_properties?.["Helicone-Session-Id"];
        const sessionName =
          req.request_properties?.["Helicone-Session-Name"] || "";
        const sessionPath =
          req.request_properties?.["Helicone-Session-Path"] || "";

        if (sessionId) {
          if (!sessionsMap.has(sessionId)) {
            sessionsMap.set(sessionId, {
              name: sessionName,
              paths: new Set(),
              count: 0,
            });
          }
          const session = sessionsMap.get(sessionId)!;
          session.count++;
          if (sessionPath) session.paths.add(sessionPath);
        }
      });

      const recentSessions = Array.from(sessionsMap.entries())
        .map(([id, data]) => ({
          id,
          name: data.name,
          path: Array.from(data.paths).join(", "),
          requestCount: data.count,
        }))
        .slice(0, 5);

      // Check for any issues
      if (sessionsMap.size === 0) {
        issues.push("No sessions found in recent requests");
      }

      // Check if session features are enabled
      if (!heliconeSessionsConfig.enabled) {
        issues.push("Helicone sessions are disabled in configuration");
      }

      return {
        isWorking: sessionsMap.size > 0 && issues.length === 0,
        sessionsFound: sessionsMap.size,
        recentSessions,
        issues,
      };
    } catch (error) {
      issues.push(
        `API error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      return { isWorking: false, sessionsFound: 0, recentSessions: [], issues };
    }
  }

  /**
   * Get usage statistics for a time period
   */
  async getUsageStats(
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalRequests: number;
    totalCost: number;
    totalTokens: number;
    byModel: Map<string, { requests: number; cost: number; tokens: number }>;
    byDay: Array<{ date: string; requests: number; cost: number }>;
  }> {
    const result = await this.queryRequests({
      filter: {
        created_at: {
          gte: startDate.toISOString(),
          lte: endDate.toISOString(),
        },
      },
      sort: { created_at: "asc" },
      limit: 1000, // Adjust as needed
    });

    const byModel = new Map<
      string,
      { requests: number; cost: number; tokens: number }
    >();
    const byDayMap = new Map<string, { requests: number; cost: number }>();

    let totalCost = 0;
    let totalTokens = 0;

    result.data.forEach((req) => {
      // Update totals
      totalCost += req.costUSD || 0;
      totalTokens += req.total_tokens || 0;

      // Update by model
      const modelStats = byModel.get(req.model) || {
        requests: 0,
        cost: 0,
        tokens: 0,
      };
      modelStats.requests++;
      modelStats.cost += req.costUSD || 0;
      modelStats.tokens += req.total_tokens || 0;
      byModel.set(req.model, modelStats);

      // Update by day
      const day = (
        req.request_created_at ||
        req.response_created_at ||
        ""
      ).split("T")[0];
      const dayStats = byDayMap.get(day) || { requests: 0, cost: 0 };
      dayStats.requests++;
      dayStats.cost += req.costUSD || 0;
      byDayMap.set(day, dayStats);
    });

    const byDay = Array.from(byDayMap.entries())
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalRequests: result.data.length,
      totalCost,
      totalTokens,
      byModel,
      byDay,
    };
  }

  /**
   * Query requests from Helicone using the Clickhouse endpoint (for large datasets)
   */
  async queryRequestsClickhouse(
    options: HeliconeClickhouseQueryOptions
  ): Promise<HeliconeQueryResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/v1/request/query-clickhouse`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(options),
          signal: AbortSignal.timeout(60000), // 60 second timeout for potentially large queries
        }
      );

      if (!response.ok) {
        let errorMessage: string;
        try {
          const errorData = await response.text();
          errorMessage = errorData || response.statusText;
        } catch {
          errorMessage = response.statusText;
        }

        // Handle specific error cases
        if (response.status === 429) {
          throw new Error(
            `Helicone API rate limit exceeded (${response.status}): ${errorMessage}`
          );
        } else if (response.status >= 500) {
          throw new Error(
            `Helicone API server error (${response.status}): ${errorMessage}`
          );
        } else if (response.status === 401) {
          throw new Error(
            `Helicone API authentication failed (${response.status}): Invalid API key`
          );
        } else {
          throw new Error(
            `Helicone API error (${response.status}): ${errorMessage}`
          );
        }
      }

      return await response.json();
    } catch (error) {
      // Handle network errors and timeouts
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new Error(
          `Network error connecting to Helicone API: ${error.message}`
        );
      } else if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Helicone API request timeout (60s exceeded)");
      }
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Query sessions from Helicone
   */
  async querySessions(
    options: HeliconeSessionQueryOptions
  ): Promise<HeliconeSessionQueryResponse> {
    try {
      const body = {
        ...options,
        search: options.search ?? "",
        timezoneDifference: options.timezoneDifference ?? 0,
        filter: options.filter ?? {},
      };

      const response = await fetch(`${this.baseUrl}/v1/session/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60000), // 60 second timeout
      });

      if (!response.ok) {
        let errorMessage: string;
        try {
          const errorData = await response.text();
          errorMessage = errorData || response.statusText;
        } catch {
          errorMessage = response.statusText;
        }

        // Handle specific error cases
        if (response.status === 429) {
          throw new Error(
            `Helicone API rate limit exceeded (${response.status}): ${errorMessage}`
          );
        } else if (response.status >= 500) {
          throw new Error(
            `Helicone API server error (${response.status}): ${errorMessage}`
          );
        } else if (response.status === 401) {
          throw new Error(
            `Helicone API authentication failed (${response.status}): Invalid API key`
          );
        } else {
          throw new Error(
            `Helicone API error (${response.status}): ${errorMessage}`
          );
        }
      }

      return await response.json();
    } catch (error) {
      // Handle network errors and timeouts
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new Error(
          `Network error connecting to Helicone API: ${error.message}`
        );
      } else if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Helicone API request timeout (60s exceeded)");
      }
      // Re-throw other errors
      throw error;
    }
  }
}

// Export singleton instance for convenience (lazy initialization)
let _heliconeAPI: HeliconeAPIClient | null = null;

export const heliconeAPI = {
  get instance(): HeliconeAPIClient {
    if (!_heliconeAPI) {
      _heliconeAPI = new HeliconeAPIClient();
    }
    return _heliconeAPI;
  },

  // Proxy methods to the instance
  queryRequests: (options: HeliconeQueryOptions) =>
    heliconeAPI.instance.queryRequests(options),
  getSessionRequests: (sessionId: string) =>
    heliconeAPI.instance.getSessionRequests(sessionId),
  getSessionCosts: (sessionId: string) =>
    heliconeAPI.instance.getSessionCosts(sessionId),
  getRecentJobSessions: (limit?: number) =>
    heliconeAPI.instance.getRecentJobSessions(limit),
  testSessionIntegration: () => heliconeAPI.instance.testSessionIntegration(),
  getUsageStats: (startDate: Date, endDate: Date) =>
    heliconeAPI.instance.getUsageStats(startDate, endDate),
  queryRequestsClickhouse: (options: HeliconeClickhouseQueryOptions) =>
    heliconeAPI.instance.queryRequestsClickhouse(options),
  querySessions: (options: HeliconeSessionQueryOptions) =>
    heliconeAPI.instance.querySessions(options),
};
