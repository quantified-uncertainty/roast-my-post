#!/bin/bash

# Script to apply search indexes to the database
# Uses CONCURRENTLY to avoid locking tables during index creation

# Load environment variables if not already loaded
if [ -f .env ] && [ -z "$DATABASE_URL" ]; then
    DATABASE_URL=$(grep "^DATABASE_URL" .env | cut -d'=' -f2- | tr -d '"')
    export DATABASE_URL
fi

echo "🔍 Applying search performance indexes..."
echo "This will create indexes without locking tables (CONCURRENTLY)"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL environment variable is not set"
    echo "Please check your .env file"
    exit 1
fi

# Strip schema parameter for psql compatibility
DATABASE_URL_CLEAN=$(echo $DATABASE_URL | sed 's/?schema=public//')

# Apply the migration
echo "📊 Creating indexes..."
psql "$DATABASE_URL_CLEAN" < prisma/migrations/20250125_add_search_indexes/migration.sql

if [ $? -eq 0 ]; then
    echo "✅ Indexes created successfully!"
    echo ""
    echo "You can verify the indexes with:"
    echo "psql \$DATABASE_URL -c \"\\di+ *document*\""
else
    echo "❌ Error creating indexes"
    exit 1
fi

echo ""
echo "💡 Note: The CONCURRENTLY option means:"
echo "- Tables remain accessible during index creation"
echo "- Index creation might take longer"
echo "- Safe to run on production databases"