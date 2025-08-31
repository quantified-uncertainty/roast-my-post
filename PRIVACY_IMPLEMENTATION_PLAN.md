# Document Privacy Implementation Plan (Simplified)

## Overview
Add PUBLIC/PRIVATE visibility to documents. Private documents are only visible to their creators.

## Phase 1: Database Changes

### 1.1 Add visibility field to Document model

**File:** `internal-packages/db/prisma/schema.prisma`

```prisma
model Document {
  // ... existing fields ...
  visibility    DocumentVisibility @default(PUBLIC)
  // ... rest of model ...
}

enum DocumentVisibility {
  PUBLIC   // Anyone can view, appears in listings
  PRIVATE  // Only owner can view
}
```

### 1.2 Create and run migration

```bash
pnpm --filter @roast/db run prisma migrate dev --name add-document-visibility
```

### 1.3 Add database indexes for performance

**File:** `internal-packages/db/prisma/migrations/[timestamp]_add_visibility_indexes/migration.sql`

```sql
CREATE INDEX "Document_visibility_idx" ON "Document"("visibility");
CREATE INDEX "Document_visibility_submittedById_idx" ON "Document"("visibility", "submittedById");
```

---

## Phase 2: Authorization Service

### 2.1 Create document access control service

**New File:** `apps/web/src/infrastructure/auth/document-access.ts`

```typescript
import { prisma } from '@roast/db';
import type { DocumentVisibility } from '@roast/db';

export class DocumentAccessControl {
  /**
   * Check if a user can view a specific document
   */
  static async canViewDocument(
    documentId: string,
    userId?: string
  ): Promise<boolean> {
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        visibility: true,
        submittedById: true
      }
    });

    if (!doc) return false;
    
    // Public documents are always viewable
    if (doc.visibility === 'PUBLIC') return true;
    
    // Private documents require auth and ownership
    if (doc.visibility === 'PRIVATE') {
      if (!userId) return false;
      return doc.submittedById === userId;
    }
    
    return false;
  }

  /**
   * Get Prisma where clause for viewable documents in listings
   */
  static getViewableDocumentsFilter(userId?: string) {
    if (!userId) {
      // Anonymous users can only see public docs
      return { visibility: 'PUBLIC' as DocumentVisibility };
    }
    
    // Authenticated users can see public docs and their own private docs
    return {
      OR: [
        { visibility: 'PUBLIC' as DocumentVisibility },
        { 
          submittedById: userId,
          visibility: 'PRIVATE' as DocumentVisibility
        }
      ]
    };
  }
}
```

---

## Phase 3: Update Document Model

**File:** `apps/web/src/models/DocumentModel.ts`

```typescript
import { DocumentAccessControl } from '@/infrastructure/auth/document-access';

export class DocumentModel {
  static async getDocumentListings(options?: {
    userId?: string;
    requestingUserId?: string; // NEW: who's requesting the documents
    searchQuery?: string;
    limit?: number;
  }) {
    const whereConditions = [];

    // CRITICAL: Add privacy filter first
    whereConditions.push(
      DocumentAccessControl.getViewableDocumentsFilter(options?.requestingUserId)
    );

    // Filter by specific user if requested
    if (options?.userId) {
      whereConditions.push({ submittedById: options.userId });
    }

    // Add search query if provided
    if (options?.searchQuery) {
      whereConditions.push({
        OR: [
          { title: { contains: options.searchQuery, mode: "insensitive" } },
          { content: { contains: options.searchQuery, mode: "insensitive" } },
        ],
      });
    }

    const where = whereConditions.length > 0
      ? { AND: whereConditions }
      : undefined;

    const documents = await prisma.document.findMany({
      where,
      select: {
        id: true,
        title: true,
        content: true,
        submittedById: true,
        visibility: true, // Include visibility
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        evaluations: {
          select: {
            id: true,
            score: true,
            agentId: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: options?.limit || 50,
    });

    return documents;
  }

  static async getDocumentWithEvaluations(
    docId: string,
    requestingUserId?: string // NEW: who's requesting
  ) {
    // Check access before fetching
    const canView = await DocumentAccessControl.canViewDocument(
      docId,
      requestingUserId
    );

    if (!canView) {
      return null;
    }

    const document = await prisma.document.findUnique({
      where: { id: docId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        evaluations: {
          include: {
            agent: true,
            evaluationRuns: {
              orderBy: { timestamp: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    return document;
  }

  static async createDocument(data: {
    title: string;
    content: string;
    submittedById: string;
    visibility?: DocumentVisibility;
  }) {
    return await prisma.document.create({
      data: {
        title: data.title,
        content: data.content,
        submittedById: data.submittedById,
        visibility: data.visibility || 'PUBLIC', // Default to PUBLIC
      },
    });
  }

  static async updateDocument(
    docId: string,
    userId: string,
    data: {
      title?: string;
      content?: string;
      visibility?: DocumentVisibility;
    }
  ) {
    // Verify ownership before update
    const doc = await prisma.document.findUnique({
      where: { id: docId },
      select: { submittedById: true },
    });

    if (!doc || doc.submittedById !== userId) {
      throw new Error('Unauthorized');
    }

    return await prisma.document.update({
      where: { id: docId },
      data,
    });
  }
}
```

---

## Phase 4: Secure API Endpoints

### 4.1 Document GET endpoint

**File:** `apps/web/src/app/api/docs/[docId]/route.ts`

```typescript
import { DocumentAccessControl } from '@/infrastructure/auth/document-access';
import { authenticateRequest } from '@/server/auth/authenticate';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ docId: string }> }
) {
  try {
    const { docId } = await context.params;
    
    // Get user ID if authenticated (optional auth)
    const userId = await authenticateRequest(req);
    
    // Check document access
    const canView = await DocumentAccessControl.canViewDocument(
      docId,
      userId
    );
    
    if (!canView) {
      return commonErrors.notFound(); // Return 404, not 403
    }
    
    const document = await DocumentModel.getDocumentWithEvaluations(
      docId,
      userId
    );
    
    if (!document) {
      return commonErrors.notFound();
    }
    
    return NextResponse.json(document);
  } catch (error) {
    return commonErrors.internalServerError(error);
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ docId: string }> }
) {
  try {
    const { docId } = await context.params;
    const userId = await requireAuth(req); // Require auth for updates
    const body = await req.json();
    
    const updated = await DocumentModel.updateDocument(
      docId,
      userId,
      {
        title: body.title,
        content: body.content,
        visibility: body.visibility,
      }
    );
    
    return NextResponse.json(updated);
  } catch (error) {
    if (error.message === 'Unauthorized') {
      return commonErrors.unauthorized();
    }
    return commonErrors.internalServerError(error);
  }
}
```

### 4.2 Search endpoint

**File:** `apps/web/src/app/api/documents/search/route.ts`

```typescript
export async function GET(req: NextRequest) {
  try {
    const userId = await authenticateRequest(req); // Optional auth
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get('q');
    
    const documents = await DocumentModel.getDocumentListings({
      searchQuery: query || undefined,
      requestingUserId: userId, // Pass requesting user for privacy filter
      limit: 20,
    });
    
    return NextResponse.json(documents);
  } catch (error) {
    return commonErrors.internalServerError(error);
  }
}
```

### 4.3 Agent documents endpoint

**File:** `apps/web/src/app/api/agents/[agentId]/documents/route.ts`

```typescript
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await context.params;
    const userId = await authenticateRequest(req); // Optional auth
    
    // Get documents evaluated by this agent
    const documents = await prisma.document.findMany({
      where: {
        AND: [
          DocumentAccessControl.getViewableDocumentsFilter(userId), // Privacy filter
          {
            evaluations: {
              some: { agentId }
            }
          }
        ]
      },
      select: {
        id: true,
        title: true,
        visibility: true,
        createdAt: true,
        user: {
          select: { name: true, image: true }
        },
        evaluations: {
          where: { agentId },
          select: { score: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    
    return NextResponse.json(documents);
  } catch (error) {
    return commonErrors.internalServerError(error);
  }
}
```

### 4.4 Additional endpoints to secure

All these endpoints need the same privacy checks:
- `GET /api/documents/[slugOrId]`
- `GET /api/docs/[docId]/evaluations`
- `GET /api/docs/[docId]/evals/[agentId]`

---

## Phase 5: Update Pages

### 5.1 Explore page (public documents only)

**File:** `apps/web/src/app/(main)/explore/page.tsx`

```typescript
export default async function ExplorePage() {
  const session = await auth();
  
  // Get public documents + user's own private documents if logged in
  const documents = await DocumentModel.getDocumentListings({
    requestingUserId: session?.user?.id,
    limit: 50,
  });
  
  return (
    <div>
      <h1>Explore Documents</h1>
      <DocumentGrid documents={documents} />
    </div>
  );
}
```

### 5.2 My Documents page

**File:** `apps/web/src/app/(main)/my-documents/page.tsx`

```typescript
export default async function MyDocumentsPage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/signin');
  }
  
  // Get only the user's documents (both public and private)
  const documents = await DocumentModel.getDocumentListings({
    userId: session.user.id,
    requestingUserId: session.user.id,
    limit: 50,
  });
  
  return (
    <div>
      <h1>My Documents</h1>
      <DocumentGrid documents={documents} showVisibility={true} />
    </div>
  );
}
```

### 5.3 Document detail page

**File:** `apps/web/src/app/(main)/docs/[docId]/page.tsx`

```typescript
export default async function DocumentPage({
  params,
}: {
  params: Promise<{ docId: string }>;
}) {
  const { docId } = await params;
  const session = await auth();
  
  const document = await DocumentModel.getDocumentWithEvaluations(
    docId,
    session?.user?.id
  );
  
  if (!document) {
    notFound(); // Show 404 page
  }
  
  const isOwner = session?.user?.id === document.submittedById;
  
  return (
    <div>
      <DocumentView 
        document={document} 
        isOwner={isOwner}
        showVisibilityControls={isOwner}
      />
    </div>
  );
}
```

---

## Phase 6: UI Components

### 6.1 Document form with visibility toggle

**File:** `apps/web/src/components/documents/DocumentForm.tsx`

```typescript
'use client';

import { useState } from 'react';
import { DocumentVisibility } from '@roast/db';

export function DocumentForm({ 
  document,
  onSubmit 
}: { 
  document?: any;
  onSubmit: (data: any) => void;
}) {
  const [title, setTitle] = useState(document?.title || '');
  const [content, setContent] = useState(document?.content || '');
  const [visibility, setVisibility] = useState<DocumentVisibility>(
    document?.visibility || 'PUBLIC'
  );
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ title, content, visibility });
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Document title"
        required
      />
      
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Document content"
        required
      />
      
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            value="PUBLIC"
            checked={visibility === 'PUBLIC'}
            onChange={(e) => setVisibility(e.target.value as DocumentVisibility)}
          />
          <span>Public</span>
          <span className="text-sm text-gray-500">
            Anyone can view this document
          </span>
        </label>
        
        <label className="flex items-center gap-2">
          <input
            type="radio"
            value="PRIVATE"
            checked={visibility === 'PRIVATE'}
            onChange={(e) => setVisibility(e.target.value as DocumentVisibility)}
          />
          <span>Private</span>
          <span className="text-sm text-gray-500">
            Only you can view this document
          </span>
        </label>
      </div>
      
      <button type="submit">
        {document ? 'Update' : 'Create'} Document
      </button>
    </form>
  );
}
```

### 6.2 Document card with visibility badge

**File:** `apps/web/src/components/documents/DocumentCard.tsx`

```typescript
import { DocumentVisibility } from '@roast/db';
import { Lock, Globe } from 'lucide-react';

export function DocumentCard({ 
  document,
  showVisibility = false 
}: { 
  document: any;
  showVisibility?: boolean;
}) {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-start justify-between">
        <h3 className="font-semibold">{document.title}</h3>
        {showVisibility && (
          <div className="flex items-center gap-1 text-sm text-gray-500">
            {document.visibility === 'PRIVATE' ? (
              <>
                <Lock className="w-4 h-4" />
                <span>Private</span>
              </>
            ) : (
              <>
                <Globe className="w-4 h-4" />
                <span>Public</span>
              </>
            )}
          </div>
        )}
      </div>
      <p className="text-gray-600 mt-2 line-clamp-3">
        {document.content}
      </p>
      <div className="mt-4 text-sm text-gray-500">
        Created {new Date(document.createdAt).toLocaleDateString()}
      </div>
    </div>
  );
}
```

### 6.3 Privacy toggle for existing documents

**File:** `apps/web/src/components/documents/PrivacyToggle.tsx`

```typescript
'use client';

import { useState } from 'react';
import { DocumentVisibility } from '@roast/db';
import { Lock, Globe } from 'lucide-react';

export function PrivacyToggle({ 
  documentId,
  currentVisibility,
  onUpdate
}: { 
  documentId: string;
  currentVisibility: DocumentVisibility;
  onUpdate?: (visibility: DocumentVisibility) => void;
}) {
  const [visibility, setVisibility] = useState(currentVisibility);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const handleToggle = async () => {
    const newVisibility = visibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC';
    setIsUpdating(true);
    
    try {
      const response = await fetch(`/api/docs/${documentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility: newVisibility }),
      });
      
      if (response.ok) {
        setVisibility(newVisibility);
        onUpdate?.(newVisibility);
      }
    } catch (error) {
      console.error('Failed to update visibility:', error);
    } finally {
      setIsUpdating(false);
    }
  };
  
  return (
    <button
      onClick={handleToggle}
      disabled={isUpdating}
      className="flex items-center gap-2 px-3 py-1 rounded border"
    >
      {visibility === 'PRIVATE' ? (
        <>
          <Lock className="w-4 h-4" />
          <span>Private</span>
        </>
      ) : (
        <>
          <Globe className="w-4 h-4" />
          <span>Public</span>
        </>
      )}
    </button>
  );
}
```

---

## Testing

**File:** `apps/web/src/tests/privacy.test.ts`

```typescript
import { describe, test, expect } from 'vitest';
import { DocumentAccessControl } from '@/infrastructure/auth/document-access';

describe('Document Privacy', () => {
  test('public documents are viewable by anyone', async () => {
    const canView = await DocumentAccessControl.canViewDocument(
      'public-doc-id',
      undefined
    );
    expect(canView).toBe(true);
  });
  
  test('private documents require authentication', async () => {
    const canView = await DocumentAccessControl.canViewDocument(
      'private-doc-id',
      undefined
    );
    expect(canView).toBe(false);
  });
  
  test('private documents are viewable by owner', async () => {
    const canView = await DocumentAccessControl.canViewDocument(
      'private-doc-id',
      'owner-user-id'
    );
    expect(canView).toBe(true);
  });
  
  test('private documents are not viewable by other users', async () => {
    const canView = await DocumentAccessControl.canViewDocument(
      'private-doc-id',
      'other-user-id'
    );
    expect(canView).toBe(false);
  });
});
```

---

## Implementation Checklist

### Database
- [ ] Add visibility enum to schema.prisma
- [ ] Run migration to add visibility field
- [ ] Add database indexes
- [ ] Regenerate Prisma client

### Core Services
- [ ] Create DocumentAccessControl service
- [ ] Update DocumentModel with privacy filters
- [ ] Add requestingUserId parameter to all document queries

### API Endpoints (ALL must be secured)
- [ ] GET /api/docs/[docId]
- [ ] PUT /api/docs/[docId]
- [ ] GET /api/documents/[slugOrId]
- [ ] GET /api/documents/search
- [ ] GET /api/docs/[docId]/evaluations
- [ ] GET /api/docs/[docId]/evals/[agentId]
- [ ] GET /api/agents/[agentId]/documents

### Pages
- [ ] Update /explore page (public docs only)
- [ ] Update /my-documents page (user's docs)
- [ ] Update /docs/[docId] page (check access)

### UI Components
- [ ] Add visibility toggle to document forms
- [ ] Add privacy badges to document cards
- [ ] Create PrivacyToggle component for existing docs

### Testing
- [ ] Unit tests for DocumentAccessControl
- [ ] Integration tests for API endpoints
- [ ] E2E test for privacy flows

---

## Deployment Steps

1. **Deploy database migration**
   ```bash
   pnpm --filter @roast/db run prisma migrate deploy
   ```

2. **Deploy backend changes**
   - Deploy DocumentAccessControl service
   - Deploy updated DocumentModel
   - Deploy all API endpoint updates

3. **Deploy frontend changes**
   - Deploy updated pages
   - Deploy UI components with privacy controls

4. **Verify**
   - Create a private document
   - Verify it's not visible when logged out
   - Verify it's not visible to other users
   - Verify owner can still see and edit it

---

## Rollback Plan

If issues arise:

1. **Quick fix**: Set all documents to PUBLIC
   ```sql
   UPDATE "Document" SET visibility = 'PUBLIC';
   ```

2. **Full rollback**: Revert migration
   ```bash
   pnpm --filter @roast/db run prisma migrate revert
   ```

---

## Security Considerations

1. **Always return 404** (not 403) for unauthorized access to avoid leaking document existence
2. **Default to PUBLIC** for safety - existing documents remain accessible
3. **No caching** of private documents on CDN
4. **Exclude private docs** from sitemaps and search engine indexing
5. **Audit critical paths** - ensure no API endpoint leaks private documents

---

## Future Enhancements (Not in MVP)

If users request share links later, implement properly:
- Separate ShareToken table with cryptographically secure tokens
- Rate limiting on token access
- Token expiration and usage limits
- Proper analytics without privacy violation

For now, focus on shipping PUBLIC/PRIVATE quickly and learning from user feedback.