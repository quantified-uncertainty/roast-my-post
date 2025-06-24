#!/bin/bash

# Database migration script: open_annotate -> roast_my_post
# This script safely migrates data from the old database to the new one

set -e  # Exit on error

# Configuration
OLD_DB="open_annotate"
NEW_DB="roast_my_post"
DB_USER="postgres"
BACKUP_DIR="./backups"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Database Migration: ${OLD_DB} → ${NEW_DB}${NC}"
echo "========================================"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Step 1: Check if old database exists
echo -e "\n${GREEN}Step 1: Checking databases...${NC}"
if ! psql -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$OLD_DB"; then
    echo -e "${RED}Error: Source database '$OLD_DB' does not exist${NC}"
    exit 1
fi
echo "✓ Source database '$OLD_DB' exists"

# Check if new database already exists
if psql -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$NEW_DB"; then
    echo -e "${YELLOW}Warning: Target database '$NEW_DB' already exists${NC}"
    read -p "Do you want to drop and recreate it? (yes/no): " confirmation
    if [ "$confirmation" != "yes" ]; then
        echo "Migration cancelled."
        exit 0
    fi
fi

# Step 2: Create backup of old database
echo -e "\n${GREEN}Step 2: Creating backup of source database...${NC}"
BACKUP_FILE="$BACKUP_DIR/pre_migration_${OLD_DB}_$(date +%Y%m%d_%H%M%S).sql"
pg_dump -U "$DB_USER" -d "$OLD_DB" > "$BACKUP_FILE"
gzip "$BACKUP_FILE"
echo "✓ Backup created: ${BACKUP_FILE}.gz"

# Step 3: Drop new database if it exists and create fresh
echo -e "\n${GREEN}Step 3: Preparing target database...${NC}"
psql -U "$DB_USER" -c "DROP DATABASE IF EXISTS ${NEW_DB};" 2>/dev/null || true
psql -U "$DB_USER" -c "CREATE DATABASE ${NEW_DB};"
echo "✓ Database '$NEW_DB' created"

# Step 4: Restore data to new database
echo -e "\n${GREEN}Step 4: Migrating data...${NC}"
gunzip -c "${BACKUP_FILE}.gz" | psql -U "$DB_USER" -d "$NEW_DB" -q
echo "✓ Data migrated successfully"

# Step 5: Verify migration
echo -e "\n${GREEN}Step 5: Verifying migration...${NC}"
OLD_COUNT=$(psql -U "$DB_USER" -d "$OLD_DB" -t -c "
    SELECT SUM(count) FROM (
        SELECT COUNT(*) as count FROM \"User\"
        UNION ALL SELECT COUNT(*) FROM \"Agent\"
        UNION ALL SELECT COUNT(*) FROM \"Document\"
        UNION ALL SELECT COUNT(*) FROM \"Evaluation\"
        UNION ALL SELECT COUNT(*) FROM \"Job\"
    ) counts;
" 2>/dev/null | tr -d ' ' || echo "0")

NEW_COUNT=$(psql -U "$DB_USER" -d "$NEW_DB" -t -c "
    SELECT SUM(count) FROM (
        SELECT COUNT(*) as count FROM \"User\"
        UNION ALL SELECT COUNT(*) FROM \"Agent\"
        UNION ALL SELECT COUNT(*) FROM \"Document\"
        UNION ALL SELECT COUNT(*) FROM \"Evaluation\"
        UNION ALL SELECT COUNT(*) FROM \"Job\"
    ) counts;
" 2>/dev/null | tr -d ' ' || echo "0")

echo "Old database total rows: $OLD_COUNT"
echo "New database total rows: $NEW_COUNT"

if [ "$OLD_COUNT" -eq "$NEW_COUNT" ]; then
    echo -e "${GREEN}✓ Row counts match!${NC}"
else
    echo -e "${RED}✗ Row counts don't match! Migration may have failed.${NC}"
    exit 1
fi

# Step 6: Update .env files
echo -e "\n${GREEN}Step 6: Updating configuration files...${NC}"

# Update .env if it exists
if [ -f ".env" ]; then
    cp .env .env.backup
    sed -i.bak 's|/open_annotate|/roast_my_post|g' .env
    echo "✓ Updated .env (backup: .env.backup)"
fi

# Update .env.example
if [ -f ".env.example" ]; then
    sed -i.bak 's|/open_annotate|/roast_my_post|g' .env.example
    echo "✓ Updated .env.example"
fi

# Update mcp-server/.env if it exists
if [ -f "mcp-server/.env" ]; then
    cp mcp-server/.env mcp-server/.env.backup
    sed -i.bak 's|/open_annotate|/roast_my_post|g' mcp-server/.env
    echo "✓ Updated mcp-server/.env (backup: mcp-server/.env.backup)"
fi

echo -e "\n${GREEN}Migration completed successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Run 'npm run dev' to test the application"
echo "2. Verify everything works correctly"
echo "3. Once confirmed, you can optionally remove the old database:"
echo "   ${YELLOW}dropdb -U $DB_USER $OLD_DB${NC}"
echo ""
echo "To rollback if needed:"
echo "1. Restore .env from .env.backup"
echo "2. Restore database: gunzip -c ${BACKUP_FILE}.gz | psql -U $DB_USER -d $OLD_DB"