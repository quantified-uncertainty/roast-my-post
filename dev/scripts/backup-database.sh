#!/bin/bash

# Database backup script for Roast My Post
# Usage: ./scripts/backup-database.sh [backup_name]

set -e  # Exit on error

# Configuration
DB_NAME="roast_my_post"
DB_USER="postgres"
BACKUP_DIR="./data/backups"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate backup filename
if [ -n "$1" ]; then
    BACKUP_NAME="$1_$(date +%Y%m%d_%H%M%S)"
else
    BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S)"
fi

BACKUP_FILE="$BACKUP_DIR/${BACKUP_NAME}.sql"

echo "Creating backup of database '$DB_NAME'..."
echo "Backup file: $BACKUP_FILE"

# Create the backup
pg_dump -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_FILE"

# Compress the backup
gzip "$BACKUP_FILE"

echo "✅ Backup completed: ${BACKUP_FILE}.gz"
echo "Size: $(ls -lh "${BACKUP_FILE}.gz" | awk '{print $5}')"

# Show recent backups
echo -e "\nRecent backups:"
ls -lht "$BACKUP_DIR" | head -6