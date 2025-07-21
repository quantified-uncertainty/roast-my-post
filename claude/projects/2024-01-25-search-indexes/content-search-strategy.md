# Content Search Strategy

## The Challenge
- Document content can be HUGE (up to 50,000 words / ~250KB)
- Including full content in searchableText would:
  - Make the field massive
  - Slow down every search (scanning 250KB per document)
  - Bloat the index size dramatically
  - Make metadata searches (author, platform) less relevant

## Options for Content Search

### Option 1: Two Separate Fields (Recommended)
```sql
WHERE searchableText LIKE '%query%'  -- Fast metadata search
   OR content LIKE '%query%'         -- Slower content search
```

**Pros:**
- Keeps metadata search fast
- Can optimize differently (e.g., only search content if needed)
- Can add different indexes for each
- User can choose search scope

**Cons:**
- Two conditions in WHERE clause
- Content search still slow without special index

### Option 2: Include Content Prefix in searchableText
```typescript
searchableText = metadata + ' ' + content.substring(0, 1000)
```

**Pros:**
- Single field to search
- Catches documents where keyword appears early
- Reasonable size increase

**Cons:**
- Misses keywords that appear later in content
- Arbitrary cutoff point
- Still need separate content search for thorough results

### Option 3: Full-Text Search Index on Content
```sql
CREATE INDEX idx_content_fts ON "DocumentVersion" 
USING GIN (to_tsvector('english', content));

-- Search with:
WHERE to_tsquery('english', 'query') @@ to_tsvector('english', content)
```

**Pros:**
- Very fast full-text search
- Handles word variations (run, running, ran)
- Can rank by relevance

**Cons:**
- Different syntax from substring search
- Doesn't support partial word matching
- Large index size

### Option 4: Separate Search Modes
- **Quick Search**: searchableText only (metadata)
- **Deep Search**: searchableText OR content
- **Full-Text**: PostgreSQL FTS on content

## Recommended Implementation

### 1. Update searchableText to include ALL metadata:
```typescript
searchableText = [
  title,
  ...authors,
  ...platforms,
  ...urls,        // Added
  importUrl,      // Added
].join(' ').toLowerCase()
```

### 2. Search Implementation:
```typescript
// Quick search (default)
const quickSearch = await prisma.document.findMany({
  where: {
    versions: {
      some: {
        searchableText: { contains: query.toLowerCase() }
      }
    }
  }
});

// Deep search (on demand - "Search in content" checkbox)
const deepSearch = await prisma.document.findMany({
  where: {
    versions: {
      some: {
        OR: [
          { searchableText: { contains: query.toLowerCase() } },
          { content: { contains: query, mode: 'insensitive' } }
        ]
      }
    }
  }
});
```

### 3. UI Changes:
```tsx
<input placeholder="Search titles, authors, platforms, URLs..." />
<label>
  <input type="checkbox" name="searchContent" />
  Also search in document content (slower)
</label>
```

### 4. Index Strategy:
```sql
-- Fast metadata search
CREATE INDEX idx_searchable_text ON "DocumentVersion" ("searchableText");

-- Optional: First 1000 chars of content for common cases
CREATE INDEX idx_content_prefix ON "DocumentVersion" (LEFT(LOWER(content), 1000));

-- Optional: Full-text search for advanced users
CREATE INDEX idx_content_fts ON "DocumentVersion" 
USING GIN (to_tsvector('english', content));
```

## Why Separate Fields?

1. **Performance**: Metadata searches stay fast (milliseconds)
2. **Flexibility**: Users can choose search depth
3. **Predictability**: Clear what's being searched
4. **Scalability**: Can optimize each type differently
5. **User Experience**: Fast default, thorough when needed

## Migration SQL

```sql
-- Add searchableText with ALL metadata
ALTER TABLE "DocumentVersion" ADD COLUMN "searchableText" TEXT;

-- Trigger for automatic updates
CREATE OR REPLACE FUNCTION update_searchable_text()
RETURNS TRIGGER AS $$
BEGIN
  NEW."searchableText" = LOWER(
    COALESCE(NEW.title, '') || ' ' || 
    COALESCE(array_to_string(NEW.authors, ' '), '') || ' ' || 
    COALESCE(array_to_string(NEW.platforms, ' '), '') || ' ' ||
    COALESCE(array_to_string(NEW.urls, ' '), '') || ' ' ||
    COALESCE(NEW."importUrl", '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER document_version_searchable_text
BEFORE INSERT OR UPDATE ON "DocumentVersion"
FOR EACH ROW EXECUTE FUNCTION update_searchable_text();

-- Populate existing
UPDATE "DocumentVersion" 
SET "searchableText" = LOWER(
  COALESCE(title, '') || ' ' || 
  COALESCE(array_to_string(authors, ' '), '') || ' ' || 
  COALESCE(array_to_string(platforms, ' '), '') || ' ' ||
  COALESCE(array_to_string(urls, ' '), '') || ' ' ||
  COALESCE("importUrl", '')
);

-- Indexes
CREATE INDEX CONCURRENTLY idx_document_searchable_text 
ON "DocumentVersion" ("searchableText");

-- Optional content prefix index
CREATE INDEX CONCURRENTLY idx_document_content_prefix 
ON "DocumentVersion" (LEFT(LOWER(content), 1000));
```

## Summary

**Keep content search separate** because:
- Content is 100-1000x larger than metadata
- Most searches are for metadata (author, title, platform)
- Users can opt-in to slower content search when needed
- Keeps the system fast by default, thorough when required