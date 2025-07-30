-- Create immutable wrapper for array_to_string (required for generated columns)
CREATE OR REPLACE FUNCTION immutable_array_to_string(text[], text) 
RETURNS text AS $$
  SELECT array_to_string($1, $2);
$$ LANGUAGE sql IMMUTABLE;

-- Add searchableText as a generated column for automatic updates
-- This combines all metadata fields for efficient substring searching
ALTER TABLE "DocumentVersion" 
ADD COLUMN "searchableText" TEXT GENERATED ALWAYS AS (
    LOWER(
        COALESCE(title, '') || ' ' || 
        COALESCE(immutable_array_to_string(authors, ' '), '') || ' ' || 
        COALESCE(immutable_array_to_string(platforms, ' '), '') || ' ' ||
        COALESCE(immutable_array_to_string(urls, ' '), '') || ' ' ||
        COALESCE("importUrl", '')
    )
) STORED;

-- Create index for fast substring searches on metadata
CREATE INDEX IF NOT EXISTS "idx_document_versions_searchable_text" 
  ON "DocumentVersion" ("searchableText");

-- Optional: Add full-text search vector for content
-- Limited to first 10k chars to keep index size reasonable
ALTER TABLE "DocumentVersion" 
ADD COLUMN content_search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', COALESCE(LEFT(content, 10000), ''))
) STORED;

-- Create GIN index for full-text content search
CREATE INDEX IF NOT EXISTS "idx_document_versions_content_fts" 
  ON "DocumentVersion" USING GIN (content_search_vector);

-- Note: Generated columns automatically compute values for existing rows