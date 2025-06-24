#!/bin/bash

# Database restore script for Roast My Post
# Usage: ./scripts/restore-database.sh <backup_file>

set -e  # Exit on error

# Configuration
DB_NAME="roast_my_post"
DB_USER="postgres"

# Check if backup file is provided
if [ -z "$1" ]; then
    echo "Error: Please provide a backup file to restore"
    echo "Usage: $0 <backup_file>"
    echo ""
    echo "Available backups:"
    ls -lh ./backups/*.gz 2>/dev/null || echo "No backups found in ./backups/"
    exit 1
fi

BACKUP_FILE="$1"

# Check if file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "⚠️  WARNING: This will completely replace the current database!"
echo "Database: $DB_NAME"
echo "Backup file: $BACKUP_FILE"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirmation

if [ "$confirmation" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

# Create a safety backup first
echo "Creating safety backup of current database..."
SAFETY_BACKUP="./backups/safety_backup_before_restore_$(date +%Y%m%d_%H%M%S).sql"
pg_dump -U "$DB_USER" -d "$DB_NAME" > "$SAFETY_BACKUP"
gzip "$SAFETY_BACKUP"
echo "Safety backup created: ${SAFETY_BACKUP}.gz"

echo "Restoring database from backup..."

# Drop and recreate database
psql -U "$DB_USER" -c "DROP DATABASE IF EXISTS ${DB_NAME};"
psql -U "$DB_USER" -c "CREATE DATABASE ${DB_NAME};"

# Restore from backup
if [[ "$BACKUP_FILE" == *.gz ]]; then
    gunzip -c "$BACKUP_FILE" | psql -U "$DB_USER" -d "$DB_NAME"
else
    psql -U "$DB_USER" -d "$DB_NAME" < "$BACKUP_FILE"
fi

echo "✅ Database restored successfully!"
echo ""
echo "Note: You may need to run 'npx prisma generate' to update Prisma Client"