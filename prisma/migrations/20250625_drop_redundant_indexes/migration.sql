-- Drop indexes that are now redundant with searchableText
-- These searches are now handled by the searchableText field

-- Title search - replaced by searchableText
DROP INDEX IF EXISTS "idx_document_versions_title_lower";

-- Array searches - replaced by searchableText  
DROP INDEX IF EXISTS "idx_document_versions_authors_gin";
DROP INDEX IF EXISTS "idx_document_versions_platforms_gin";
DROP INDEX IF EXISTS "idx_document_versions_urls_gin";

-- Rarely used - intended agents aren't commonly searched
DROP INDEX IF EXISTS "idx_document_versions_intended_agents_gin";

-- Content prefix - replaced by new content prefix index with better approach
DROP INDEX IF EXISTS "idx_document_versions_content_prefix";

-- Note: Keeping these indexes as they serve different purposes:
-- idx_documents_published_date_desc - for sorting
-- idx_document_versions_lookup - for version queries
-- idx_document_versions_import_url - for exact duplicate checking
-- idx_agent_versions_name_lower - for agent searches