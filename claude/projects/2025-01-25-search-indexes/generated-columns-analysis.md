# Generated Columns vs Triggers for searchableText

## Generated Column Approach (PostgreSQL 12+)

### For searchableText (Metadata)
```sql
ALTER TABLE "DocumentVersion" 
ADD COLUMN "searchableText" TEXT GENERATED ALWAYS AS (
    LOWER(
        COALESCE(title, '') || ' ' || 
        COALESCE(array_to_string(authors, ' '), '') || ' ' || 
        COALESCE(array_to_string(platforms, ' '), '') || ' ' ||
        COALESCE(array_to_string(urls, ' '), '') || ' ' ||
        COALESCE("importUrl", '')
    )
) STORED;
```

### For Full-Text Search Vectors
```sql
-- Metadata vector for fast word-based search
ALTER TABLE "DocumentVersion" 
ADD COLUMN metadata_search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', 
        COALESCE(title, '') || ' ' || 
        COALESCE(array_to_string(authors, ' '), '') || ' ' || 
        COALESCE(array_to_string(platforms, ' '), '')
    )
) STORED;

-- Content vector (separate for performance)
ALTER TABLE "DocumentVersion" 
ADD COLUMN content_search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', COALESCE(LEFT(content, 50000), ''))
) STORED;
```

## Comparison

### Generated Columns
**Pros:**
- **Automatic**: Updates on any change to source columns
- **Declarative**: Schema shows exactly how it's computed
- **Consistent**: Can't forget to update it
- **Performance**: Computed at write time, stored on disk
- **No maintenance**: No triggers to debug or maintain

**Cons:**
- **PostgreSQL 12+ only**: Not available in older versions
- **Storage**: Takes disk space (but so does trigger approach)
- **Can't customize**: Formula is fixed in schema

### Trigger Approach
**Pros:**
- **Works on any PostgreSQL version**
- **More flexible**: Can add complex logic
- **Can be modified**: Without schema changes

**Cons:**
- **Hidden logic**: Not obvious from schema
- **Can be disabled/dropped accidentally**
- **Harder to maintain**: Separate object to manage
- **Performance**: Slight overhead on each insert/update

## Recommendation

### Use Generated Columns IF:
1. You're on PostgreSQL 12+ (check with `SELECT version()`)
2. You want the cleanest, most maintainable solution
3. The computation is straightforward

### Implementation Plan with Generated Columns:

```sql
-- 1. Add searchableText as generated column
ALTER TABLE "DocumentVersion" 
ADD COLUMN "searchableText" TEXT GENERATED ALWAYS AS (
    LOWER(
        COALESCE(title, '') || ' ' || 
        COALESCE(array_to_string(authors, ' '), '') || ' ' || 
        COALESCE(array_to_string(platforms, ' '), '') || ' ' ||
        COALESCE(array_to_string(urls, ' '), '') || ' ' ||
        COALESCE("importUrl", '')
    )
) STORED;

-- 2. Add index for substring matching
CREATE INDEX CONCURRENTLY idx_document_searchable_text 
ON "DocumentVersion" ("searchableText");

-- 3. Optional: Add tsvector for full-text search
ALTER TABLE "DocumentVersion" 
ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', 
        COALESCE(title, '') || ' ' || 
        COALESCE(array_to_string(authors, ' '), '') || ' ' || 
        COALESCE(array_to_string(platforms, ' '), '')
    )
) STORED;

-- 4. Add GIN index for full-text search
CREATE INDEX CONCURRENTLY idx_document_search_vector 
ON "DocumentVersion" USING GIN (search_vector);
```

## Hybrid Approach (Best of Both)

```sql
-- 1. Simple searchableText for substring matching
ALTER TABLE "DocumentVersion" 
ADD COLUMN "searchableText" TEXT GENERATED ALWAYS AS (
    LOWER(
        COALESCE(title, '') || ' ' || 
        COALESCE(array_to_string(authors, ' '), '') || ' ' || 
        COALESCE(array_to_string(platforms, ' '), '') || ' ' ||
        COALESCE(array_to_string(urls, ' '), '') || ' ' ||
        COALESCE("importUrl", '')
    )
) STORED;

-- 2. Separate tsvector for content (first 10k chars to keep it reasonable)
ALTER TABLE "DocumentVersion" 
ADD COLUMN content_search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', COALESCE(LEFT(content, 10000), ''))
) STORED;

-- 3. Indexes
CREATE INDEX CONCURRENTLY idx_searchable_text ON "DocumentVersion" ("searchableText");
CREATE INDEX CONCURRENTLY idx_content_fts ON "DocumentVersion" USING GIN (content_search_vector);
```

## Search Queries

### Simple substring search (default)
```sql
-- Fast metadata search
WHERE "searchableText" LIKE '%query%'
```

### Full-text content search (optional)
```sql
-- Uses tsvector for word matching
WHERE content_search_vector @@ plainto_tsquery('english', 'query')
```

### Combined search
```sql
WHERE "searchableText" LIKE '%query%' 
   OR content_search_vector @@ plainto_tsquery('english', 'query')
```

## Migration Consideration

Need to check PostgreSQL version first:
```sql
SELECT version();
-- Need 12.0 or higher for generated columns
```

If < 12, fall back to trigger approach. Otherwise, generated columns are cleaner!