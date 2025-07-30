# Document Search Functionality

## Current State
- `/docs` page loads ALL documents and evaluations into memory
- Client-side fuzzy search works only on loaded documents
- No pagination or lazy loading
- Performance degrades as document count grows

## Proposed Solution: Simple Server-Side Search

### Overview
Implement a hybrid approach:
1. Load only the most recent 20-30 documents by default
2. Keep the instant client-side search for loaded documents
3. Add a "Search All" button for server-side database queries
4. Use PostgreSQL's built-in text search capabilities

### Implementation Approach

#### 1. Backend Search API
```typescript
// /api/documents/search
// Uses PostgreSQL's ILIKE for simple text matching
// Can search across:
- Document titles
- Content (with word limit for performance)
- Author names
- Platform names
- Agent names (via joins)
```

#### 2. Frontend Changes
- Modify `/docs` to load limited documents initially
- Add "Search All Documents" button next to search input
- Show loading state during server search
- Display search results with pagination
- Maintain instant search for already-loaded docs

#### 3. Search Query Strategy
```sql
-- Simple approach using ILIKE (case-insensitive)
SELECT DISTINCT d.* FROM documents d
LEFT JOIN document_versions dv ON d.id = dv.document_id
LEFT JOIN evaluations e ON d.id = e.document_id  
LEFT JOIN agents a ON e.agent_id = a.id
LEFT JOIN agent_versions av ON a.id = av.agent_id
WHERE 
  dv.title ILIKE '%query%' OR
  dv.content ILIKE '%query%' OR  -- Consider limiting to first N chars
  dv.authors::text ILIKE '%query%' OR
  dv.platforms::text ILIKE '%query%' OR
  av.name ILIKE '%query%'
ORDER BY d.published_date DESC
LIMIT 20 OFFSET 0;
```

### Benefits
1. **Simple Implementation** - No external dependencies
2. **Immediate Value** - Users can search all documents
3. **Progressive Enhancement** - Can upgrade to full-text search later
4. **Performance** - Only loads needed documents
5. **Cost Effective** - Uses existing PostgreSQL

### Limitations & Future Upgrades
1. **Basic Matching** - ILIKE is simple pattern matching
2. **No Relevance Scoring** - Results ordered by date, not relevance
3. **Limited Content Search** - May need to limit content search depth

### Future Enhancements Path
1. **Phase 1** (Current): Basic ILIKE search
2. **Phase 2**: PostgreSQL Full-Text Search (tsvector/tsquery)
3. **Phase 3**: Elasticsearch or similar for advanced features

### Implementation Steps
1. Create search API endpoint with query parameter
2. Modify DocumentModel to add search methods
3. Update `/docs` page to load limited documents
4. Add search UI components
5. Implement debounced server search
6. Add pagination for search results

### UI/UX Considerations
- Keep instant search for loaded documents
- Clear indication when searching all vs. loaded
- Loading states for server searches
- "Load More" or pagination for results
- Search history (localStorage)

### Performance Optimizations
1. Index key columns (title, content prefix)
2. Limit content search to first 1000 chars
3. Cache recent searches (Redis later)
4. Debounce search requests (500ms)

### Security Considerations
- Parameterized queries to prevent SQL injection
- Rate limiting on search endpoint
- Only search documents user has access to
- Sanitize search input

## Decision
Start with the simple ILIKE approach. It's quick to implement, requires no new infrastructure, and can be enhanced incrementally. This gives us searchability without complexity.