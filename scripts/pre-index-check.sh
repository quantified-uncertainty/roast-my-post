#!/bin/bash

# Pre-flight safety check before index migration

# Load environment variables if not already loaded
if [ -f .env ] && [ -z "$DATABASE_URL" ]; then
    DATABASE_URL=$(grep "^DATABASE_URL" .env | cut -d'=' -f2- | tr -d '"')
    export DATABASE_URL
fi

echo "🔍 Pre-Migration Safety Check"
echo "============================"
echo ""

# Strip schema parameter from DATABASE_URL for psql compatibility
DATABASE_URL_CLEAN=$(echo $DATABASE_URL | sed 's/?schema=public//')

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check flags
ALL_GOOD=true

# 1. Check PostgreSQL version
echo "1️⃣  Checking PostgreSQL version..."
PG_VERSION=$(psql "$DATABASE_URL_CLEAN" -t -c "SELECT version();" 2>/dev/null | grep -oE 'PostgreSQL [0-9]+\.[0-9]+' | cut -d' ' -f2)
if [ -z "$PG_VERSION" ]; then
    echo -e "${RED}❌ Could not determine PostgreSQL version${NC}"
    ALL_GOOD=false
else
    MAJOR_VERSION=$(echo $PG_VERSION | cut -d. -f1)
    if [ "$MAJOR_VERSION" -ge 10 ]; then
        echo -e "${GREEN}✅ PostgreSQL $PG_VERSION (Good - 10+ recommended)${NC}"
    else
        echo -e "${YELLOW}⚠️  PostgreSQL $PG_VERSION (Will work, but 10+ recommended)${NC}"
    fi
fi

# 2. Check disk space
echo ""
echo "2️⃣  Checking disk space..."
DB_SIZE=$(psql "$DATABASE_URL_CLEAN" -t -c "SELECT pg_size_pretty(pg_database_size(current_database()));" 2>/dev/null | xargs)
echo "   Current database size: $DB_SIZE"

# 3. Check array column types
echo ""
echo "3️⃣  Checking array column types..."
# Try different table name variations
for TABLE_NAME in 'DocumentVersion' 'document_versions' 'documentversion' 'document_version'; do
    ARRAY_CHECK=$(psql "$DATABASE_URL_CLEAN" -t -c "
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE lower(table_name) = lower('$TABLE_NAME')
    AND column_name IN ('authors', 'platforms')
    AND (data_type = 'ARRAY' OR udt_name LIKE '_%');" 2>/dev/null | xargs)
    
    if [ ! -z "$ARRAY_CHECK" ] && [ "$ARRAY_CHECK" != "0" ]; then
        break
    fi
done

if [ "$ARRAY_CHECK" = "2" ]; then
    echo -e "${GREEN}✅ Array columns are properly typed${NC}"
else
    echo -e "${RED}❌ Array columns might not be ARRAY type (found $ARRAY_CHECK/2)${NC}"
    ALL_GOOD=false
fi

# 4. Check for existing indexes
echo ""
echo "4️⃣  Checking for existing indexes..."
EXISTING=$(psql "$DATABASE_URL_CLEAN" -t -c "
SELECT COUNT(*) 
FROM pg_indexes 
WHERE indexname LIKE 'idx_%'
AND schemaname = 'public';" 2>/dev/null | xargs)

if [ "$EXISTING" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found $EXISTING existing indexes with 'idx_' prefix${NC}"
    echo "   They won't be affected (IF NOT EXISTS protection)"
else
    echo -e "${GREEN}✅ No conflicting indexes found${NC}"
fi

# 5. Check table sizes
echo ""
echo "5️⃣  Checking table sizes..."
psql "$DATABASE_URL_CLEAN" -c "
SELECT 
    tablename,
    to_char(n_live_tup, 'FM999,999,999') as row_count,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_stat_user_tables
WHERE schemaname = 'public' 
AND tablename IN ('Document', 'DocumentVersion', 'AgentVersion')
ORDER BY n_live_tup DESC;" 2>/dev/null

# 6. Estimate index creation time
echo ""
echo "6️⃣  Estimated index creation time..."
DOC_VERSION_COUNT=$(psql "$DATABASE_URL_CLEAN" -t -c "SELECT COUNT(*) FROM \"DocumentVersion\";" 2>/dev/null | xargs)
if [ -n "$DOC_VERSION_COUNT" ]; then
    # Rough estimate: 1000 rows per second for index creation
    EST_SECONDS=$((DOC_VERSION_COUNT / 1000 + 10))
    EST_MINUTES=$((EST_SECONDS / 60 + 1))
    echo "   With $DOC_VERSION_COUNT document versions: ~$EST_MINUTES minutes"
    echo "   (CONCURRENTLY makes it slower but safer)"
fi

# 7. Check current load
echo ""
echo "7️⃣  Checking current database load..."
ACTIVE_CONNECTIONS=$(psql "$DATABASE_URL_CLEAN" -t -c "SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active';" 2>/dev/null | xargs)
echo "   Active connections: $ACTIVE_CONNECTIONS"

# Summary
echo ""
echo "📊 Summary"
echo "========="
if [ "$ALL_GOOD" = true ]; then
    echo -e "${GREEN}✅ All checks passed! Safe to proceed.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Run: ./scripts/backup-before-indexes.sh"
    echo "2. Run: ./scripts/apply-search-indexes.sh"
else
    echo -e "${RED}❌ Some checks failed. Review issues above.${NC}"
    echo ""
    echo "Fix the issues or proceed with caution."
fi

# Performance baseline
echo ""
echo "💡 Tip: Save this performance baseline for comparison:"
echo ""
echo "psql \$DATABASE_URL -c \"EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM document_versions WHERE LOWER(title) LIKE '%test%' LIMIT 10;\""