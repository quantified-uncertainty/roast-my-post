-- Rollback script for search indexes
-- Run this if you need to remove the indexes

-- Remove all search optimization indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_document_versions_title_lower;
DROP INDEX CONCURRENTLY IF EXISTS idx_document_versions_content_prefix;
DROP INDEX CONCURRENTLY IF EXISTS idx_agent_versions_name_lower;
DROP INDEX CONCURRENTLY IF EXISTS idx_document_versions_authors_gin;
DROP INDEX CONCURRENTLY IF EXISTS idx_document_versions_platforms_gin;
DROP INDEX CONCURRENTLY IF EXISTS idx_document_versions_import_url;
DROP INDEX CONCURRENTLY IF EXISTS idx_document_versions_urls_gin;
DROP INDEX CONCURRENTLY IF EXISTS idx_document_versions_intended_agents_gin;
DROP INDEX CONCURRENTLY IF EXISTS idx_document_versions_lookup;
DROP INDEX CONCURRENTLY IF EXISTS idx_documents_published_date_desc;

-- Verify removal
SELECT 
    'Remaining indexes:' as message,
    COUNT(*) as index_count 
FROM pg_indexes 
WHERE indexname LIKE 'idx_%';