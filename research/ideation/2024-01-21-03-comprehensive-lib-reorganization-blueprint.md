# Comprehensive /src/lib Reorganization Blueprint

## Executive Summary

This document provides an exhaustive, file-by-file blueprint for reorganizing the `/src/lib` directory from its current flat structure (40+ files) into a hierarchical, domain-driven architecture. Every import statement, every file move, and every potential breaking change is documented here.

## Current State Inventory

### Files at /src/lib Root (40 files)
```
api-middleware.ts              api-response-helpers.ts        api/
articleImport.integration.test.ts  articleImport.test.ts      articleImport.ts
auth-agent-helpers.ts          auth-api.ts                    auth-helpers.ts
auth-wrapper.ts                auth.ts                        batch-utils.ts
claude/                        constants.ts                   crypto.ts
db-queries.ts                  dev-validators.ts              document-auth.ts
documentAnalysis/              evaluation-queries.ts          fonts.ts
helicone/                      job/                           logger.ts
prisma-fragments.ts            prisma.ts                      prisma/
rate-limiter.ts                request-validation.ts          security-middleware.ts
services/                      tokenUtils.ts                  type-guards.ts
urlValidator/                  user-permissions.ts            utils.ts
__mocks__/                     __tests__/
```

## Detailed Migration Plan

### Phase 1: Authentication Consolidation

#### 1.1 Create Directory Structure
```bash
mkdir -p src/lib/auth/{permissions,middleware,__tests__,__mocks__}
```

#### 1.2 File Movements and Transformations

##### auth.ts → auth/config.ts + auth/index.ts
**Current auth.ts structure:**
```typescript
// Lines 1-50: NextAuth imports and types
// Lines 51-150: authConfig object
// Lines 151-200: auth instance and exports
// Lines 201-250: Helper functions (getAuth, getUserEmailSafe, etc.)
```

**Split into:**

**auth/config.ts:**
```typescript
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"
import type { NextAuthConfig } from "next-auth"
import { prisma } from "@/lib/database/client"  // NEW PATH

export const authConfig: NextAuthConfig = {
  // Lines 51-150 from original auth.ts
  providers: [Google, GitHub],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Existing signIn logic
    },
    async session({ session, token }) {
      // Existing session logic
    }
  }
}

export const { auth, signIn, signOut, handlers } = NextAuth(authConfig)
```

**auth/index.ts:**
```typescript
// Re-export main auth functionality
export { auth, signIn, signOut, handlers } from './config'
export { getAuth, getUserEmailSafe, isAdmin } from './helpers'
export { authenticateRequest } from './api'
export { withAuth } from './middleware'

// Type exports
export type { Session } from 'next-auth'
```

##### auth-helpers.ts + auth-agent-helpers.ts → auth/helpers.ts
**Merge and organize:**
```typescript
import { auth } from './config'
import { prisma } from '@/lib/database/client'  // NEW PATH
import { unstable_cache } from "next/cache"

// From auth-helpers.ts
export async function getAuth() {
  const session = await auth()
  return session?.user?.id ? { userId: session.user.id } : null
}

export async function getUserEmailSafe(userId: string): Promise<string | null> {
  // Existing implementation
}

export async function isAdmin(): Promise<boolean> {
  // Existing implementation
}

// From auth-agent-helpers.ts
export const getAgentsForUser = unstable_cache(
  async (userId: string) => {
    // Existing implementation with updated imports
  },
  ["agents-for-user"],
  { revalidate: 60, tags: ["agents"] }
)

export function canEditAgent(agent: any, userId: string): boolean {
  // Existing implementation
}
```

##### auth-api.ts → auth/api.ts
```typescript
import { NextRequest } from "next/server"
import { auth } from './config'
import { prisma } from '@/lib/database/client'  // NEW PATH

const API_KEY_PREFIX = "rmp_"

export async function authenticateRequest(request: NextRequest): Promise<string | null> {
  // Existing implementation unchanged
}

export async function validateApiKey(apiKey: string): Promise<string | null> {
  // Existing implementation with updated import
}
```

##### auth-wrapper.ts → auth/middleware.ts
```typescript
import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from './api'
import { prisma } from '@/lib/database/client'  // NEW PATH

export function withAuth(
  handler: (request: NextRequest, context: any, userId: string) => Promise<NextResponse>
) {
  // Existing implementation with updated imports
}

// Additional auth middleware utilities
export function requireAdmin(
  handler: (request: NextRequest, context: any, userId: string) => Promise<NextResponse>
) {
  return withAuth(async (request, context, userId) => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    })
    
    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }
    
    return handler(request, context, userId)
  })
}
```

##### document-auth.ts → auth/permissions/document.ts
```typescript
import { prisma } from '@/lib/database/client'  // NEW PATH

export async function userCanAccessDocument(
  userId: string,
  documentId: string
): Promise<boolean> {
  // Existing implementation with updated imports
}

export async function userCanEditDocument(
  userId: string,
  documentId: string
): Promise<boolean> {
  // Existing implementation
}
```

##### user-permissions.ts → auth/permissions/user.ts
```typescript
export enum UserRole {
  USER = "USER",
  ADMIN = "ADMIN"
}

export interface UserPermissions {
  canCreateAgents: boolean
  canDeleteAgents: boolean
  canViewMonitor: boolean
  maxAgents: number
  maxDocuments: number
}

export function getUserPermissions(role: UserRole): UserPermissions {
  // Existing implementation
}
```

#### 1.3 Import Updates Required

**Files that import from auth files (58 files):**
```bash
# Generate list of files to update
grep -r "from '@/lib/auth" src/ --include="*.ts" --include="*.tsx" | cut -d: -f1 | sort -u
```

**Update patterns:**
```typescript
// OLD
import { auth } from "@/lib/auth"
import { getAuth, getUserEmailSafe } from "@/lib/auth-helpers"
import { authenticateRequest } from "@/lib/auth-api"
import { withAuth } from "@/lib/auth-wrapper"
import { userCanAccessDocument } from "@/lib/document-auth"

// NEW
import { auth, getAuth, getUserEmailSafe } from "@/lib/auth"
import { authenticateRequest } from "@/lib/auth"
import { withAuth } from "@/lib/auth"
import { userCanAccessDocument } from "@/lib/auth/permissions/document"
```

#### 1.4 Testing Strategy
```bash
# After moving files
npm run typecheck  # Ensure no TypeScript errors
npm run lint       # Check for import issues
npm run test:auth  # Run auth-specific tests
```

### Phase 2: API Utilities Unification

#### 2.1 Create Directory Structure
```bash
mkdir -p src/lib/api/{middleware,response,validation,utils,__tests__}
```

#### 2.2 File Movements and Transformations

##### api-middleware.ts → api/middleware/logging.ts
```typescript
import { NextRequest } from "next/server"
import { logger } from '@/lib/core/logging'  // NEW PATH

export function logRequest(request: NextRequest) {
  // Existing implementation with updated imports
}

export function withLogging(
  handler: (request: NextRequest, context: any) => Promise<Response>
) {
  // Existing wrapper implementation
}
```

##### security-middleware.ts → api/middleware/security.ts
```typescript
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authenticateRequest } from '@/lib/auth'  // NEW PATH
import { rateLimiter } from './rate-limit'

export interface SecurityOptions {
  requireAuth?: boolean
  rateLimit?: boolean
  validateBody?: z.ZodSchema
  validateQuery?: z.ZodSchema
  requireAdmin?: boolean
}

export function withSecurity(
  handler: Function,
  options: SecurityOptions = {}
) {
  // Existing implementation with reorganized imports
}
```

##### rate-limiter.ts → api/middleware/rate-limit.ts
```typescript
// In-memory rate limiter implementation
const requestCounts = new Map<string, { count: number; resetTime: number }>()

export const rateLimiter = {
  check: (identifier: string, limit: number = 10, windowMs: number = 60000) => {
    // Existing implementation
  }
}

export function withRateLimit(
  handler: Function,
  options: { limit?: number; window?: number } = {}
) {
  return async (request: NextRequest, context: any) => {
    const identifier = request.ip || 'anonymous'
    const allowed = rateLimiter.check(identifier, options.limit, options.window)
    
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      )
    }
    
    return handler(request, context)
  }
}
```

##### New file: api/middleware/index.ts
```typescript
// Compose multiple middleware
export { withLogging } from './logging'
export { withSecurity } from './security'
export { withRateLimit } from './rate-limit'
export { withAuth } from '@/lib/auth'  // Re-export for convenience

// Middleware composer utility
export function composeMiddleware(...middlewares: Function[]) {
  return (handler: Function) => {
    return middlewares.reduceRight((acc, middleware) => {
      return middleware(acc)
    }, handler)
  }
}
```

##### api-response-helpers.ts → api/response/helpers.ts
```typescript
import { NextResponse } from "next/server"

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}

export function errorResponse(message: string, status = 400, details?: any) {
  return NextResponse.json(
    { success: false, error: message, details },
    { status }
  )
}

export function paginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  limit: number
) {
  return NextResponse.json({
    success: true,
    data: items,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  })
}
```

##### New file: api/response/errors.ts
```typescript
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public details?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const ErrorTypes = {
  ValidationError: (message: string, details?: any) => 
    new ApiError(message, 400, details),
  
  UnauthorizedError: (message = "Unauthorized") => 
    new ApiError(message, 401),
  
  ForbiddenError: (message = "Forbidden") => 
    new ApiError(message, 403),
  
  NotFoundError: (resource: string) => 
    new ApiError(`${resource} not found`, 404),
  
  ConflictError: (message: string) => 
    new ApiError(message, 409),
  
  ServerError: (message = "Internal server error") => 
    new ApiError(message, 500)
}
```

##### request-validation.ts → api/validation/request.ts
```typescript
import { NextRequest } from "next/server"
import { z } from "zod"
import { ErrorTypes } from '../response/errors'

export async function validateRequestBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<T> {
  try {
    const body = await request.json()
    return schema.parse(body)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw ErrorTypes.ValidationError("Invalid request body", error.errors)
    }
    throw error
  }
}

export function validateQueryParams<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): T {
  const { searchParams } = new URL(request.url)
  const params = Object.fromEntries(searchParams.entries())
  
  try {
    return schema.parse(params)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw ErrorTypes.ValidationError("Invalid query parameters", error.errors)
    }
    throw error
  }
}
```

##### New file: api/validation/schemas.ts
```typescript
import { z } from "zod"

// Common validation schemas used across API routes
export const PaginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

export const IdParamSchema = z.object({
  id: z.string().min(1)
})

export const SearchQuerySchema = z.object({
  q: z.string().min(1),
  ...PaginationSchema.shape
})

export const DateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
})
```

##### api/RouteUtils.ts → api/utils.ts
```typescript
import { NextRequest } from "next/server"
import { headers } from "next/headers"

export function getBaseUrl(request?: NextRequest): string {
  if (request) {
    const url = new URL(request.url)
    return `${url.protocol}//${url.host}`
  }
  
  // Fallback for server components
  const host = headers().get("host") || "localhost:3000"
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http"
  return `${protocol}://${host}`
}

export function buildUrl(path: string, params?: Record<string, any>): string {
  const url = new URL(path, getBaseUrl())
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value))
      }
    })
  }
  
  return url.toString()
}

export function getCacheHeaders(maxAge: number, swr?: number) {
  const swrValue = swr || maxAge
  return {
    'Cache-Control': `public, max-age=${maxAge}, stale-while-revalidate=${swrValue}`
  }
}
```

### Phase 3: Database Layer Organization

#### 3.1 Create Directory Structure
```bash
mkdir -p src/lib/database/{queries,includes,types,utils,__tests__}
```

#### 3.2 File Movements and Transformations

##### prisma.ts → database/client.ts
```typescript
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
})

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

// Add connection health check
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error("Database connection failed:", error)
    return false
  }
}
```

##### db-queries.ts → database/queries/common.ts
```typescript
import { prisma } from '../client'
import { Prisma } from '@prisma/client'

// Generic pagination helper
export interface PaginationOptions {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export function getPaginationParams(options: PaginationOptions) {
  const page = Math.max(1, options.page || 1)
  const limit = Math.min(100, Math.max(1, options.limit || 20))
  const skip = (page - 1) * limit
  
  return { skip, take: limit }
}

// Generic findMany with pagination
export async function findManyWithPagination<T, A>(
  model: any,
  args: Prisma.Args<T, 'findMany'>,
  pagination: PaginationOptions
): Promise<{ items: A[]; total: number; page: number; totalPages: number }> {
  const { skip, take } = getPaginationParams(pagination)
  
  const [items, total] = await Promise.all([
    model.findMany({
      ...args,
      skip,
      take,
      orderBy: pagination.sortBy ? {
        [pagination.sortBy]: pagination.sortOrder || 'desc'
      } : args.orderBy
    }),
    model.count({ where: args.where })
  ])
  
  return {
    items,
    total,
    page: pagination.page || 1,
    totalPages: Math.ceil(total / take)
  }
}

// Soft delete helper
export async function softDelete<T>(
  model: any,
  id: string,
  userId: string
): Promise<T> {
  return model.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      deletedBy: userId
    }
  })
}
```

##### evaluation-queries.ts → database/queries/evaluation.ts
```typescript
import { prisma } from '../client'
import { evaluationVersionIncludes } from '../includes/evaluation'
import type { Prisma } from '@prisma/client'

export async function getEvaluationWithDetails(evaluationId: string) {
  return prisma.evaluationVersion.findUnique({
    where: { id: evaluationId },
    include: evaluationVersionIncludes.full
  })
}

export async function getEvaluationsForDocument(
  documentId: string,
  options?: {
    includeStale?: boolean
    agentId?: string
    limit?: number
  }
) {
  const where: Prisma.EvaluationVersionWhereInput = {
    evaluation: { documentId },
    ...(options?.includeStale === false && { isStale: false }),
    ...(options?.agentId && { evaluation: { agentId: options.agentId } })
  }
  
  return prisma.evaluationVersion.findMany({
    where,
    include: evaluationVersionIncludes.summary,
    orderBy: { createdAt: 'desc' },
    take: options?.limit
  })
}

export async function markEvaluationsAsStale(
  documentVersionId: string,
  evaluationIdsToExclude: string[] = []
) {
  return prisma.evaluationVersion.updateMany({
    where: {
      evaluation: {
        documentVersion: {
          id: documentVersionId
        }
      },
      id: {
        notIn: evaluationIdsToExclude
      },
      isStale: false
    },
    data: {
      isStale: true
    }
  })
}

// Complex aggregation queries
export async function getEvaluationStats(agentId: string, days: number = 7) {
  const since = new Date()
  since.setDate(since.getDate() - days)
  
  const stats = await prisma.evaluationVersion.groupBy({
    by: ['status'],
    where: {
      evaluation: { agentId },
      createdAt: { gte: since }
    },
    _count: true
  })
  
  const averageScore = await prisma.evaluationVersion.aggregate({
    where: {
      evaluation: { agentId },
      createdAt: { gte: since },
      score: { not: null }
    },
    _avg: { score: true }
  })
  
  return {
    counts: Object.fromEntries(
      stats.map(s => [s.status, s._count])
    ),
    averageScore: averageScore._avg.score
  }
}
```

##### New file: database/queries/document.ts
```typescript
import { prisma } from '../client'
import { documentIncludes } from '../includes/document'
import type { Prisma } from '@prisma/client'

export async function getDocumentWithEvaluations(
  documentId: string,
  userId: string
) {
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      OR: [
        { ownerId: userId },
        { visibility: 'PUBLIC' }
      ]
    },
    include: documentIncludes.withEvaluations
  })
  
  if (!document) return null
  
  // Filter evaluations based on user permissions
  if (document.ownerId !== userId) {
    document.evaluations = document.evaluations.filter(
      e => e.visibility === 'PUBLIC'
    )
  }
  
  return document
}

export async function searchDocuments(
  query: string,
  userId: string,
  options?: {
    limit?: number
    offset?: number
    includeContent?: boolean
  }
) {
  const searchConditions: Prisma.DocumentWhereInput = {
    OR: [
      { title: { contains: query, mode: 'insensitive' } },
      { 
        AND: [
          { searchableText: { contains: query, mode: 'insensitive' } },
          options?.includeContent ? {} : { searchableText: { not: null } }
        ]
      }
    ],
    AND: [
      {
        OR: [
          { ownerId: userId },
          { visibility: 'PUBLIC' }
        ]
      }
    ]
  }
  
  return prisma.document.findMany({
    where: searchConditions,
    select: {
      id: true,
      title: true,
      excerpt: true,
      author: true,
      createdAt: true,
      _count: {
        select: { evaluations: true }
      }
    },
    take: options?.limit || 20,
    skip: options?.offset || 0,
    orderBy: { createdAt: 'desc' }
  })
}
```

##### New file: database/queries/agent.ts
```typescript
import { prisma } from '../client'
import { agentIncludes } from '../includes/agent'

export async function getAgentWithStats(agentId: string) {
  const [agent, stats] = await Promise.all([
    prisma.agent.findUnique({
      where: { id: agentId },
      include: agentIncludes.withLatestVersion
    }),
    getAgentPerformanceStats(agentId)
  ])
  
  return agent ? { ...agent, stats } : null
}

export async function getAgentPerformanceStats(
  agentId: string,
  days: number = 30
) {
  const since = new Date()
  since.setDate(since.getDate() - days)
  
  const jobs = await prisma.job.findMany({
    where: {
      agentId,
      createdAt: { gte: since }
    },
    select: {
      status: true,
      processingTime: true,
      tokensUsed: true,
      cost: true
    }
  })
  
  const successCount = jobs.filter(j => j.status === 'completed').length
  const failureCount = jobs.filter(j => j.status === 'failed').length
  const totalJobs = jobs.length
  
  const avgProcessingTime = jobs
    .filter(j => j.processingTime)
    .reduce((sum, j) => sum + (j.processingTime || 0), 0) / (successCount || 1)
  
  const totalTokens = jobs.reduce((sum, j) => sum + (j.tokensUsed || 0), 0)
  const totalCost = jobs.reduce((sum, j) => sum + (j.cost || 0), 0)
  
  return {
    successRate: totalJobs > 0 ? (successCount / totalJobs) * 100 : 0,
    totalJobs,
    successCount,
    failureCount,
    avgProcessingTime: Math.round(avgProcessingTime),
    totalTokens,
    totalCost,
    period: { days, since }
  }
}

export async function getPublicAgents(limit: number = 50) {
  return prisma.agent.findMany({
    where: {
      isPublic: true,
      isArchived: false
    },
    include: agentIncludes.summary,
    orderBy: [
      { evaluationCount: 'desc' },
      { createdAt: 'desc' }
    ],
    take: limit
  })
}
```

##### prisma-fragments.ts + prisma/evaluation-includes.ts → database/includes/index.ts
```typescript
// Central export point for all Prisma includes
export * from './evaluation'
export * from './document'
export * from './agent'
export * from './job'

// Re-export common patterns
export const timestampFields = {
  createdAt: true,
  updatedAt: true
} as const

export const ownerFields = {
  ownerId: true,
  owner: {
    select: {
      id: true,
      name: true,
      email: true
    }
  }
} as const
```

##### New file: database/includes/evaluation.ts
```typescript
import { Prisma } from '@prisma/client'

export const evaluationVersionIncludes = {
  // Minimal data for lists
  summary: {
    id: true,
    status: true,
    score: true,
    isStale: true,
    createdAt: true,
    evaluation: {
      select: {
        id: true,
        agent: {
          select: {
            id: true,
            name: true
          }
        }
      }
    }
  },
  
  // Full data for detail views
  full: {
    id: true,
    status: true,
    score: true,
    summary: true,
    thinking: true,
    tasks: true,
    isStale: true,
    createdAt: true,
    updatedAt: true,
    evaluation: {
      include: {
        agent: true,
        documentVersion: {
          include: {
            document: {
              select: {
                id: true,
                title: true,
                author: true
              }
            }
          }
        }
      }
    },
    comments: {
      orderBy: { createdAt: 'asc' as const }
    },
    llmInteractions: {
      orderBy: { timestamp: 'asc' as const }
    }
  }
} satisfies Record<string, Prisma.EvaluationVersionInclude>
```

##### New file: database/includes/document.ts
```typescript
import { Prisma } from '@prisma/client'

export const documentIncludes = {
  // Basic document info
  summary: {
    id: true,
    title: true,
    excerpt: true,
    author: true,
    createdAt: true,
    visibility: true,
    _count: {
      select: {
        evaluations: true,
        versions: true
      }
    }
  },
  
  // Document with evaluations
  withEvaluations: {
    id: true,
    title: true,
    excerpt: true,
    author: true,
    content: true,
    metadata: true,
    createdAt: true,
    updatedAt: true,
    visibility: true,
    currentVersion: {
      include: {
        evaluationVersions: {
          where: { isStale: false },
          include: {
            evaluation: {
              include: {
                agent: true
              }
            },
            comments: true
          },
          orderBy: { createdAt: 'desc' as const }
        }
      }
    },
    evaluations: {
      include: {
        agent: true,
        versions: {
          orderBy: { createdAt: 'desc' as const },
          take: 1
        }
      }
    }
  }
} satisfies Record<string, Prisma.DocumentInclude>
```

##### New file: database/includes/agent.ts
```typescript
import { Prisma } from '@prisma/client'

export const agentIncludes = {
  // Minimal agent data
  summary: {
    id: true,
    name: true,
    description: true,
    isPublic: true,
    isArchived: true,
    _count: {
      select: {
        evaluations: true,
        versions: true
      }
    }
  },
  
  // Agent with latest version
  withLatestVersion: {
    id: true,
    name: true,
    description: true,
    isPublic: true,
    isArchived: true,
    createdAt: true,
    versions: {
      orderBy: { version: 'desc' as const },
      take: 1
    }
  },
  
  // Full agent data
  full: {
    id: true,
    name: true,
    description: true,
    isPublic: true,
    isArchived: true,
    createdAt: true,
    updatedAt: true,
    owner: {
      select: {
        id: true,
        name: true,
        email: true
      }
    },
    versions: {
      orderBy: { version: 'desc' as const }
    },
    _count: {
      select: {
        evaluations: true
      }
    }
  }
} satisfies Record<string, Prisma.AgentInclude>
```

##### New file: database/types.ts
```typescript
import { Prisma } from '@prisma/client'
import { evaluationVersionIncludes, documentIncludes, agentIncludes } from './includes'

// Inferred types from includes
export type EvaluationWithDetails = Prisma.EvaluationVersionGetPayload<{
  include: typeof evaluationVersionIncludes.full
}>

export type DocumentWithEvaluations = Prisma.DocumentGetPayload<{
  include: typeof documentIncludes.withEvaluations
}>

export type AgentWithLatestVersion = Prisma.AgentGetPayload<{
  include: typeof agentIncludes.withLatestVersion
}>

// Common database operation results
export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

export interface BatchOperationResult {
  succeeded: number
  failed: number
  errors: Array<{ id: string; error: string }>
}
```

### Phase 4: Core Utilities Structure

#### 4.1 Create Directory Structure
```bash
mkdir -p src/lib/core/{config,crypto,logging,utils,validation,types,__tests__}
```

#### 4.2 File Movements and Transformations

##### constants.ts → core/config/constants.ts
```typescript
// Environment detection
export const IS_PRODUCTION = process.env.NODE_ENV === 'production'
export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development'
export const IS_TEST = process.env.NODE_ENV === 'test'

// Application constants
export const APP_NAME = 'RoastMyPost'
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'

// API constants
export const API_VERSION = 'v1'
export const API_KEY_PREFIX = 'rmp_'
export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

// Time constants
export const MINUTE = 60 * 1000
export const HOUR = 60 * MINUTE
export const DAY = 24 * HOUR
export const WEEK = 7 * DAY

// Cache TTLs
export const CACHE_TTL = {
  SHORT: 5 * MINUTE,
  MEDIUM: 30 * MINUTE,
  LONG: 2 * HOUR,
  VERY_LONG: 24 * HOUR
} as const

// Feature flags
export const FEATURES = {
  EPHEMERAL_EXPERIMENTS: process.env.NEXT_PUBLIC_ENABLE_EPHEMERAL === 'true',
  PUBLIC_API: process.env.NEXT_PUBLIC_ENABLE_API === 'true',
  MONITORING_DASHBOARD: process.env.NEXT_PUBLIC_ENABLE_MONITORING === 'true'
} as const

// Limits
export const LIMITS = {
  MAX_DOCUMENT_SIZE: 500_000, // 500KB
  MAX_COMMENT_LENGTH: 5_000,
  MAX_TITLE_LENGTH: 200,
  MAX_AGENTS_PER_USER: 50,
  MAX_EVALUATIONS_PER_DOCUMENT: 100
} as const
```

##### fonts.ts → core/config/fonts.ts
```typescript
import { Inter, JetBrains_Mono } from 'next/font/google'

export const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
})

export const fontVariables = `${inter.variable} ${jetbrainsMono.variable}`

// Font utility classes
export const fontClasses = {
  sans: 'font-sans',
  mono: 'font-mono',
  display: 'font-sans font-semibold',
  body: 'font-sans font-normal',
  code: 'font-mono text-sm'
} as const
```

##### crypto.ts → core/crypto/index.ts
```typescript
import { createHash, randomBytes } from 'crypto'

/**
 * Generate a secure random token
 */
export function generateToken(length: number = 32): string {
  return randomBytes(length).toString('hex')
}

/**
 * Generate an API key with prefix
 */
export function generateApiKey(prefix: string = 'rmp_'): string {
  const token = generateToken(24)
  return `${prefix}${token}`
}

/**
 * Hash a string using SHA-256
 */
export function hashString(input: string): string {
  return createHash('sha256').update(input).digest('hex')
}

/**
 * Create a deterministic ID from multiple inputs
 */
export function createDeterministicId(...inputs: string[]): string {
  const combined = inputs.join(':')
  return hashString(combined).substring(0, 16)
}

/**
 * Mask sensitive data for logging
 */
export function maskSensitive(value: string, visibleChars: number = 4): string {
  if (value.length <= visibleChars * 2) {
    return '*'.repeat(value.length)
  }
  
  const start = value.substring(0, visibleChars)
  const end = value.substring(value.length - visibleChars)
  const masked = '*'.repeat(Math.max(4, value.length - visibleChars * 2))
  
  return `${start}${masked}${end}`
}
```

##### logger.ts → core/logging/index.ts
```typescript
import winston from 'winston'
import { IS_PRODUCTION, IS_TEST } from '../config/constants'

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
}

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
}

winston.addColors(colors)

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: !IS_PRODUCTION }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
)

// Define transports
const transports = [
  new winston.transports.Console({
    silent: IS_TEST,
  }),
]

if (IS_PRODUCTION) {
  // Add file transport in production
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
    })
  )
}

// Create logger instance
export const logger = winston.createLogger({
  level: IS_PRODUCTION ? 'warn' : 'debug',
  levels,
  format,
  transports,
})

// Structured logging helpers
export function logError(error: Error, context?: Record<string, any>) {
  logger.error(error.message, {
    stack: error.stack,
    ...context
  })
}

export function logInfo(message: string, data?: Record<string, any>) {
  logger.info(message, data)
}

export function logDebug(message: string, data?: Record<string, any>) {
  logger.debug(message, data)
}

export function logWarning(message: string, data?: Record<string, any>) {
  logger.warn(message, data)
}

// Performance logging
export function logPerformance(
  operation: string,
  duration: number,
  metadata?: Record<string, any>
) {
  logger.info(`Performance: ${operation}`, {
    duration_ms: duration,
    ...metadata
  })
}
```

##### utils.ts → Split into multiple files in core/utils/

###### core/utils/common.ts
```typescript
/**
 * Sleep for specified milliseconds
 */
export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Retry an async function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number
    initialDelay?: number
    maxDelay?: number
    backoffFactor?: number
    onRetry?: (error: Error, attempt: number) => void
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffFactor = 2,
    onRetry
  } = options
  
  let lastError: Error
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      
      if (attempt === maxRetries) {
        throw lastError
      }
      
      if (onRetry) {
        onRetry(lastError, attempt)
      }
      
      const delay = Math.min(
        initialDelay * Math.pow(backoffFactor, attempt - 1),
        maxDelay
      )
      
      await sleep(delay)
    }
  }
  
  throw lastError!
}

/**
 * Debounce a function
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

/**
 * Throttle a function
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

/**
 * Create chunks from an array
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  
  return chunks
}

/**
 * Remove duplicate objects from array based on key
 */
export function uniqueBy<T>(array: T[], key: keyof T): T[] {
  const seen = new Set()
  
  return array.filter(item => {
    const value = item[key]
    if (seen.has(value)) {
      return false
    }
    seen.add(value)
    return true
  })
}
```

###### core/utils/strings.ts
```typescript
/**
 * Truncate string to specified length
 */
export function truncate(str: string, maxLength: number, suffix = '...'): string {
  if (str.length <= maxLength) return str
  return str.substring(0, maxLength - suffix.length) + suffix
}

/**
 * Convert string to slug
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Capitalize first letter
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Convert camelCase to snake_case
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
}

/**
 * Parse a string as boolean
 */
export function parseBoolean(value: string | undefined, defaultValue = false): boolean {
  if (!value) return defaultValue
  return value.toLowerCase() === 'true' || value === '1'
}

/**
 * Extract excerpt from content
 */
export function extractExcerpt(
  content: string,
  maxLength: number = 200,
  stripHtml: boolean = true
): string {
  let text = content
  
  if (stripHtml) {
    // Basic HTML stripping
    text = text.replace(/<[^>]*>/g, '')
  }
  
  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim()
  
  // Try to cut at sentence boundary
  if (text.length > maxLength) {
    const truncated = text.substring(0, maxLength)
    const lastPeriod = truncated.lastIndexOf('.')
    const lastSpace = truncated.lastIndexOf(' ')
    
    if (lastPeriod > maxLength * 0.8) {
      return truncated.substring(0, lastPeriod + 1)
    } else if (lastSpace > -1) {
      return truncated.substring(0, lastSpace) + '...'
    }
  }
  
  return truncate(text, maxLength)
}
```

###### core/utils/dates.ts
```typescript
import { DAY, HOUR, MINUTE } from '../config/constants'

/**
 * Format date to relative time
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const then = new Date(date)
  const diff = now.getTime() - then.getTime()
  
  if (diff < MINUTE) {
    return 'just now'
  } else if (diff < HOUR) {
    const minutes = Math.floor(diff / MINUTE)
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  } else if (diff < DAY) {
    const hours = Math.floor(diff / HOUR)
    return `${hours} hour${hours > 1 ? 's' : ''} ago`
  } else if (diff < WEEK) {
    const days = Math.floor(diff / DAY)
    return `${days} day${days > 1 ? 's' : ''} ago`
  } else {
    return then.toLocaleDateString()
  }
}

/**
 * Format date for display
 */
export function formatDate(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }
): string {
  return new Date(date).toLocaleDateString('en-US', options)
}

/**
 * Parse date range from query params
 */
export function parseDateRange(
  startDate?: string,
  endDate?: string
): { start: Date; end: Date } {
  const end = endDate ? new Date(endDate) : new Date()
  const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * DAY)
  
  // Ensure end of day for end date
  end.setHours(23, 59, 59, 999)
  
  // Ensure start of day for start date
  start.setHours(0, 0, 0, 0)
  
  return { start, end }
}
```

##### batch-utils.ts → core/utils/batch.ts
```typescript
import { chunk } from './common'
import { logDebug, logWarning } from '../logging'

export interface BatchProcessOptions<T, R> {
  batchSize?: number
  concurrency?: number
  onProgress?: (processed: number, total: number) => void
  onError?: (item: T, error: Error) => void
  stopOnError?: boolean
}

/**
 * Process items in batches with controlled concurrency
 */
export async function processBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  options: BatchProcessOptions<T, R> = {}
): Promise<{ results: R[]; errors: Array<{ item: T; error: Error }> }> {
  const {
    batchSize = 10,
    concurrency = 5,
    onProgress,
    onError,
    stopOnError = false
  } = options
  
  const results: R[] = []
  const errors: Array<{ item: T; error: Error }> = []
  let processed = 0
  
  const batches = chunk(items, batchSize)
  
  for (const batch of batches) {
    const batchPromises = batch.map(async (item) => {
      try {
        const result = await processor(item)
        results.push(result)
        processed++
        
        if (onProgress) {
          onProgress(processed, items.length)
        }
        
        return { success: true, result }
      } catch (error) {
        const err = error as Error
        errors.push({ item, error: err })
        
        if (onError) {
          onError(item, err)
        }
        
        if (stopOnError) {
          throw err
        }
        
        logWarning('Batch processing error', {
          error: err.message,
          item
        })
        
        return { success: false, error: err }
      }
    })
    
    // Process batch with concurrency limit
    const batchChunks = chunk(batchPromises, concurrency)
    
    for (const promiseChunk of batchChunks) {
      await Promise.all(promiseChunk)
    }
  }
  
  logDebug('Batch processing complete', {
    total: items.length,
    succeeded: results.length,
    failed: errors.length
  })
  
  return { results, errors }
}

/**
 * Execute promises with concurrency limit
 */
export async function promisePool<T>(
  promises: (() => Promise<T>)[],
  concurrency: number
): Promise<T[]> {
  const results: T[] = []
  const executing: Promise<void>[] = []
  
  for (const promise of promises) {
    const p = Promise.resolve().then(() => promise()).then(
      result => { results.push(result) }
    )
    
    executing.push(p)
    
    if (executing.length >= concurrency) {
      await Promise.race(executing)
      executing.splice(executing.findIndex(p => p), 1)
    }
  }
  
  await Promise.all(executing)
  return results
}

/**
 * Batch database operations
 */
export async function batchDatabaseOperation<T>(
  operation: (ids: string[]) => Promise<T>,
  ids: string[],
  batchSize: number = 100
): Promise<T[]> {
  const batches = chunk(ids, batchSize)
  const results: T[] = []
  
  for (const batch of batches) {
    const batchResult = await operation(batch)
    results.push(batchResult)
  }
  
  return results
}
```

##### tokenUtils.ts → core/utils/tokens.ts
```typescript
import { encoding_for_model, type TiktokenModel } from 'tiktoken'

// Cache encoders for performance
const encoderCache = new Map()

/**
 * Get encoder for a specific model
 */
function getEncoder(model: string) {
  if (!encoderCache.has(model)) {
    try {
      encoderCache.set(model, encoding_for_model(model as TiktokenModel))
    } catch (error) {
      // Fallback to cl100k_base for unknown models
      encoderCache.set(model, encoding_for_model('gpt-4'))
    }
  }
  return encoderCache.get(model)
}

/**
 * Count tokens in text for a specific model
 */
export function countTokens(text: string, model: string = 'gpt-4'): number {
  try {
    const encoder = getEncoder(model)
    const tokens = encoder.encode(text)
    return tokens.length
  } catch (error) {
    // Rough estimate as fallback: ~4 chars per token
    return Math.ceil(text.length / 4)
  }
}

/**
 * Estimate token count for messages
 */
export function countMessageTokens(
  messages: Array<{ role: string; content: string }>,
  model: string = 'gpt-4'
): number {
  // Token overhead per message
  const overheadPerMessage = 3
  const baseOverhead = 3
  
  let tokenCount = baseOverhead
  
  for (const message of messages) {
    tokenCount += overheadPerMessage
    tokenCount += countTokens(message.role, model)
    tokenCount += countTokens(message.content, model)
  }
  
  return tokenCount
}

/**
 * Calculate estimated cost for tokens
 */
export function calculateTokenCost(
  inputTokens: number,
  outputTokens: number,
  model: string
): number {
  // Prices per 1M tokens (as of 2024)
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4-turbo': { input: 10, output: 30 },
    'gpt-4': { input: 30, output: 60 },
    'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
    'claude-3-sonnet': { input: 3, output: 15 },
    'claude-3-opus': { input: 15, output: 75 },
    'claude-3-haiku': { input: 0.25, output: 1.25 }
  }
  
  const modelPricing = pricing[model] || pricing['gpt-4']
  
  const inputCost = (inputTokens / 1_000_000) * modelPricing.input
  const outputCost = (outputTokens / 1_000_000) * modelPricing.output
  
  return inputCost + outputCost
}

/**
 * Truncate text to fit within token limit
 */
export function truncateToTokenLimit(
  text: string,
  maxTokens: number,
  model: string = 'gpt-4'
): string {
  const tokens = countTokens(text, model)
  
  if (tokens <= maxTokens) {
    return text
  }
  
  // Binary search for the right length
  let low = 0
  let high = text.length
  let result = ''
  
  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const substring = text.substring(0, mid)
    const substringTokens = countTokens(substring, model)
    
    if (substringTokens <= maxTokens) {
      result = substring
      low = mid + 1
    } else {
      high = mid - 1
    }
  }
  
  // Try to cut at word boundary
  const lastSpace = result.lastIndexOf(' ')
  if (lastSpace > result.length * 0.8) {
    return result.substring(0, lastSpace) + '...'
  }
  
  return result + '...'
}
```

##### type-guards.ts → core/types/guards.ts
```typescript
/**
 * Type guard to check if value is defined
 */
export function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null
}

/**
 * Type guard to check if value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string'
}

/**
 * Type guard to check if value is a number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value)
}

/**
 * Type guard to check if value is an object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Type guard to check if value is an array
 */
export function isArray<T = unknown>(value: unknown): value is T[] {
  return Array.isArray(value)
}

/**
 * Type guard to check if object has property
 */
export function hasProperty<T extends object, K extends PropertyKey>(
  obj: T,
  prop: K
): obj is T & Record<K, unknown> {
  return prop in obj
}

/**
 * Type guard for error objects
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error
}

/**
 * Type guard for Prisma errors
 */
export function isPrismaError(error: unknown): error is { code: string; meta?: any } {
  return isObject(error) && 'code' in error && isString(error.code)
}

/**
 * Narrow type based on discriminated union
 */
export function hasType<T extends { type: string }, K extends T['type']>(
  obj: T,
  type: K
): obj is Extract<T, { type: K }> {
  return obj.type === type
}

/**
 * Assert that value is never (exhaustive check)
 */
export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`)
}
```

##### dev-validators.ts → core/validation/dev.ts
```typescript
import { z } from 'zod'
import { IS_DEVELOPMENT } from '../config/constants'

/**
 * Development-only validation schemas
 */
export const DevSchemas = {
  // Validate environment variables
  envVars: z.object({
    DATABASE_URL: z.string().url(),
    NEXTAUTH_URL: z.string().url(),
    NEXTAUTH_SECRET: z.string().min(32),
    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),
    ANTHROPIC_API_KEY: z.string().startsWith('sk-'),
    OPENAI_API_KEY: z.string().startsWith('sk-').optional(),
    HELICONE_API_KEY: z.string().optional()
  }),
  
  // Validate API responses in dev
  apiResponse: z.object({
    success: z.boolean(),
    data: z.any().optional(),
    error: z.string().optional(),
    details: z.any().optional()
  })
}

/**
 * Validate environment configuration
 */
export function validateEnvironment() {
  if (!IS_DEVELOPMENT) return
  
  try {
    DevSchemas.envVars.parse(process.env)
  } catch (error) {
    console.error('❌ Invalid environment configuration:', error)
    if (IS_DEVELOPMENT) {
      throw new Error('Invalid environment configuration. Check your .env file.')
    }
  }
}

/**
 * Development assertions
 */
export function devAssert(
  condition: boolean,
  message: string,
  data?: any
): asserts condition {
  if (!IS_DEVELOPMENT) return
  
  if (!condition) {
    console.error(`❌ DEV ASSERTION FAILED: ${message}`, data)
    throw new Error(`Dev assertion failed: ${message}`)
  }
}

/**
 * Log development warnings
 */
export function devWarn(message: string, data?: any) {
  if (!IS_DEVELOPMENT) return
  console.warn(`⚠️  DEV WARNING: ${message}`, data)
}

/**
 * Validate data shape in development
 */
export function validateShape<T>(
  data: unknown,
  schema: z.ZodSchema<T>,
  context: string
): T {
  if (!IS_DEVELOPMENT) return data as T
  
  try {
    return schema.parse(data)
  } catch (error) {
    console.error(`❌ Shape validation failed in ${context}:`, error)
    throw error
  }
}
```

### Phase 5: Test Consolidation

#### 5.1 Identify and Move Test Files

```bash
# Find all test files in lib root
find src/lib -maxdepth 1 -name "*.test.ts" -o -name "*.test.tsx"
```

**Files to move:**
- `articleImport.test.ts` → `services/article/__tests__/import.test.ts`
- `articleImport.integration.test.ts` → `services/article/__tests__/import.integration.test.ts`

#### 5.2 Update Test Imports

After moving files, update all test imports to use the new paths.

### Phase 6: Service Layer Enhancement

#### 6.1 Create Enhanced Service Structure

```bash
mkdir -p src/lib/services/{document,evaluation,article,agent,job}/__tests__
```

#### 6.2 Reorganize Services

##### Current services/documentImport.ts → services/document/import.ts
```typescript
import { prisma } from '@/lib/database/client'
import { importArticle } from '../article/import'
// Rest of the implementation with updated imports
```

##### New service files to create:

###### services/evaluation/create.ts
```typescript
import { prisma } from '@/lib/database/client'
import { callClaude } from '@/lib/claude/wrapper'
import { JobModel } from '@/lib/job/model'

export async function createEvaluation(
  documentId: string,
  agentId: string,
  userId: string
) {
  // Implementation extracted from current job processing
}
```

###### services/evaluation/export.ts
```typescript
import { getEvaluationWithDetails } from '@/lib/database/queries/evaluation'

export async function exportEvaluationAsMarkdown(evaluationId: string): Promise<string> {
  // Implementation
}

export async function exportEvaluationAsJSON(evaluationId: string): Promise<object> {
  // Implementation
}
```

## Import Update Script

Create a script to automatically update imports:

```bash
#!/bin/bash
# update-imports.sh

# Phase 1: Auth imports
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e 's|from "@/lib/auth"|from "@/lib/auth"|g' \
  -e 's|from "@/lib/auth-helpers"|from "@/lib/auth"|g' \
  -e 's|from "@/lib/auth-api"|from "@/lib/auth"|g' \
  -e 's|from "@/lib/auth-wrapper"|from "@/lib/auth"|g' \
  -e 's|from "@/lib/document-auth"|from "@/lib/auth/permissions/document"|g' \
  -e 's|from "@/lib/user-permissions"|from "@/lib/auth/permissions/user"|g' \
  {} \;

# Phase 2: API imports
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e 's|from "@/lib/api-middleware"|from "@/lib/api/middleware/logging"|g' \
  -e 's|from "@/lib/security-middleware"|from "@/lib/api/middleware/security"|g' \
  -e 's|from "@/lib/rate-limiter"|from "@/lib/api/middleware/rate-limit"|g' \
  -e 's|from "@/lib/api-response-helpers"|from "@/lib/api/response/helpers"|g' \
  -e 's|from "@/lib/request-validation"|from "@/lib/api/validation/request"|g' \
  {} \;

# Phase 3: Database imports
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e 's|from "@/lib/prisma"|from "@/lib/database/client"|g' \
  -e 's|from "@/lib/db-queries"|from "@/lib/database/queries/common"|g' \
  -e 's|from "@/lib/evaluation-queries"|from "@/lib/database/queries/evaluation"|g' \
  -e 's|from "@/lib/prisma-fragments"|from "@/lib/database/includes"|g' \
  {} \;

# Phase 4: Core utilities imports
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e 's|from "@/lib/constants"|from "@/lib/core/config/constants"|g' \
  -e 's|from "@/lib/fonts"|from "@/lib/core/config/fonts"|g' \
  -e 's|from "@/lib/crypto"|from "@/lib/core/crypto"|g' \
  -e 's|from "@/lib/logger"|from "@/lib/core/logging"|g' \
  -e 's|from "@/lib/batch-utils"|from "@/lib/core/utils/batch"|g' \
  -e 's|from "@/lib/tokenUtils"|from "@/lib/core/utils/tokens"|g' \
  -e 's|from "@/lib/type-guards"|from "@/lib/core/types/guards"|g' \
  -e 's|from "@/lib/dev-validators"|from "@/lib/core/validation/dev"|g' \
  {} \;
```

## Rollback Strategy

If any phase causes issues:

```bash
# Create backup branch before each phase
git checkout -b backup/pre-phase-1

# If rollback needed
git checkout main
git reset --hard backup/pre-phase-1

# Or use compatibility exports temporarily
# src/lib/auth.ts
export * from './auth/config'
export * from './auth/helpers'
```

## Success Metrics

### Quantitative Metrics
- **File count at /src/lib root**: From 40+ → <10 (only directories)
- **Average import depth**: ≤ 3 levels (e.g., `@/lib/auth/permissions/document`)
- **Circular dependencies**: 0 (verified by madge)
- **Test co-location**: 100% of tests with their modules
- **Type errors**: 0 after reorganization
- **Broken imports**: 0 after update script

### Qualitative Metrics
- Clear separation of concerns
- Intuitive file locations
- Consistent naming patterns
- Reduced cognitive load
- Easier onboarding

## Long-term Governance

### Rules
1. **No files at lib root**: Only directories allowed
2. **Clear domain boundaries**: Auth, API, Database, Core, Services
3. **Index exports**: Each directory has index.ts with public API
4. **Co-located tests**: __tests__ directories in each module
5. **Type exports**: Dedicated types.ts files where appropriate

### Review Checklist
- [ ] File in appropriate domain directory?
- [ ] Clear, descriptive filename?
- [ ] Proper index exports?
- [ ] Tests co-located?
- [ ] No circular dependencies?
- [ ] Documentation updated?

This reorganization transforms 40+ scattered files into a clean, hierarchical structure that scales with the project and makes the codebase significantly more maintainable.