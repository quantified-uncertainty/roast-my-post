#!/bin/bash

# Backup script before applying search indexes
# Creates timestamped backup with verification

set -e  # Exit on error

# Load environment variables if not already loaded
if [ -f .env ] && [ -z "$DATABASE_URL" ]; then
    DATABASE_URL=$(grep "^DATABASE_URL" .env | cut -d'=' -f2- | tr -d '"')
    export DATABASE_URL
fi

echo "🔒 Database Backup Before Index Migration"
echo "========================================"
echo ""

# Check requirements
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL not set"
    echo "Please check your .env file"
    exit 1
fi

if ! command -v pg_dump &> /dev/null; then
    echo "❌ Error: pg_dump not found. Please install PostgreSQL client tools"
    exit 1
fi

# Create backup directory
BACKUP_DIR="./backups"
mkdir -p "$BACKUP_DIR"

# Generate timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/pre_index_migration_${TIMESTAMP}.sql"

# Strip schema parameter for psql compatibility
DATABASE_URL_CLEAN=$(echo $DATABASE_URL | sed 's/?schema=public//')

echo "📊 Database info:"
psql "$DATABASE_URL_CLEAN" -c "SELECT current_database(), version();" 2>/dev/null || echo "Could not get DB info"

echo ""
echo "📈 Current database size:"
psql "$DATABASE_URL_CLEAN" -c "SELECT pg_size_pretty(pg_database_size(current_database()));" 2>/dev/null || echo "Could not get size"

echo ""
echo "📋 Table row counts:"
psql "$DATABASE_URL_CLEAN" -c "
SELECT 
    'Document' as table_name, COUNT(*) as row_count FROM \"Document\"
UNION ALL
SELECT 'DocumentVersion', COUNT(*) FROM \"DocumentVersion\"
UNION ALL
SELECT 'Agent', COUNT(*) FROM \"Agent\"
UNION ALL
SELECT 'AgentVersion', COUNT(*) FROM \"AgentVersion\"
UNION ALL
SELECT 'Evaluation', COUNT(*) FROM \"Evaluation\"
ORDER BY table_name;" 2>/dev/null || echo "Could not get counts"

echo ""
echo "💾 Creating backup to: $BACKUP_FILE"
echo "This may take a few minutes for large databases..."

# Create backup with progress
pg_dump "$DATABASE_URL_CLEAN" \
    --verbose \
    --no-owner \
    --no-acl \
    --format=plain \
    --file="$BACKUP_FILE" 2>&1 | while read line; do
        echo -n "."
    done

echo ""
echo ""

# Verify backup
if [ -f "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
    echo "✅ Backup created successfully!"
    echo "📁 File: $BACKUP_FILE"
    echo "📏 Size: $BACKUP_SIZE"
    
    # Quick integrity check
    echo ""
    echo "🔍 Verifying backup integrity..."
    if head -n 1 "$BACKUP_FILE" | grep -q "PostgreSQL database dump"; then
        echo "✅ Backup file header looks valid"
    else
        echo "⚠️  Warning: Backup file header doesn't look right"
    fi
    
    # Compress if large
    if [ $(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE") -gt 104857600 ]; then
        echo ""
        echo "🗜️  Compressing backup (>100MB)..."
        gzip -c "$BACKUP_FILE" > "${BACKUP_FILE}.gz"
        echo "✅ Compressed to: ${BACKUP_FILE}.gz"
    fi
else
    echo "❌ Backup failed!"
    exit 1
fi

echo ""
echo "📌 Backup complete! Next steps:"
echo "1. Review the pre-migration analysis"
echo "2. Run: ./scripts/apply-search-indexes.sh"
echo ""
echo "🔧 To restore if needed:"
echo "psql \$DATABASE_URL_CLEAN < $BACKUP_FILE"