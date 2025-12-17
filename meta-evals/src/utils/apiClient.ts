/**
 * API Client for calling the web app endpoints
 *
 * Uses the same database session to authenticate requests.
 */

import { prisma } from "@roast/db";

const API_BASE = process.env.API_BASE_URL || "http://localhost:3000";

interface ApiClientOptions {
  userId?: string;
}

interface SessionInfo {
  sessionToken: string;
  userId: string;
}

export class ApiClient {
  private sessionInfo: SessionInfo | null = null;

  constructor(private options: ApiClientOptions = {}) {}

  /**
   * Get or create a session token for API calls
   * Uses an existing user's session from the database
   */
  async getSessionInfo(): Promise<SessionInfo> {
    if (this.sessionInfo) {
      return this.sessionInfo;
    }

    // Find a user to act as (preferably specified, otherwise first admin-ish user)
    const userId = this.options.userId;

    let session;
    if (userId) {
      session = await prisma.session.findFirst({
        where: { userId },
        orderBy: { expires: "desc" },
      });
    }

    if (!session) {
      // Find any valid session
      session = await prisma.session.findFirst({
        where: { expires: { gt: new Date() } },
        orderBy: { expires: "desc" },
      });
    }

    if (!session) {
      throw new Error(
        "No valid session found in database. Please log in to the web app first."
      );
    }

    this.sessionInfo = {
      sessionToken: session.sessionToken,
      userId: session.userId,
    };
    return this.sessionInfo;
  }

  /**
   * Get the current user ID
   */
  async getUserId(): Promise<string> {
    const info = await this.getSessionInfo();
    return info.userId;
  }

  /**
   * Make an authenticated API request
   */
  async fetch<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<{ data: T; status: number }> {
    const { sessionToken } = await this.getSessionInfo();

    const url = `${API_BASE}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Cookie: `authjs.session-token=${sessionToken}`,
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(response.status, data.error || "API request failed", data);
    }

    return { data: data as T, status: response.status };
  }

  /**
   * GET request
   */
  async get<T>(path: string): Promise<T> {
    const { data } = await this.fetch<T>(path);
    return data;
  }

  /**
   * POST request
   */
  async post<T>(path: string, body: unknown): Promise<T> {
    const { data } = await this.fetch<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return data;
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Default client instance
export const apiClient = new ApiClient();
