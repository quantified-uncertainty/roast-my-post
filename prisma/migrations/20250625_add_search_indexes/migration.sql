-- Add indexes for document search performance

-- Text search indexes (case-insensitive)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_document_versions_title_lower" 
  ON "DocumentVersion" (LOWER("title"));

-- Partial index on content prefix for performance (first 1000 chars)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_document_versions_content_prefix" 
  ON "DocumentVersion" (LOWER(SUBSTRING("content", 1, 1000)));

-- Agent name search
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_agent_versions_name_lower" 
  ON "AgentVersion" (LOWER("name"));

-- GIN indexes for array fields (PostgreSQL specific)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_document_versions_authors_gin" 
  ON "DocumentVersion" USING GIN ("authors");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_document_versions_platforms_gin" 
  ON "DocumentVersion" USING GIN ("platforms");

-- URL-based search indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_document_versions_import_url" 
  ON "DocumentVersion" ("importUrl") 
  WHERE "importUrl" IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_document_versions_urls_gin" 
  ON "DocumentVersion" USING GIN ("urls");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_document_versions_intended_agents_gin" 
  ON "DocumentVersion" USING GIN ("intendedAgents");

-- Composite indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_document_versions_lookup" 
  ON "DocumentVersion" ("documentId", "version" DESC);

-- Performance indexes for sorting and filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_documents_published_date_desc" 
  ON "Document" ("publishedDate" DESC);

-- Note: Some indexes already exist in schema
-- documents.submittedById already indexed
-- evaluations.documentId and agentId already indexed