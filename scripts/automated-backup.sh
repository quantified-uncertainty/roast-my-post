#!/bin/bash

# Automated backup script for Roast My Post database
# This script is designed to be run by cron for daily backups

set -e  # Exit on error

# Configuration
DB_NAME="roast_my_post"
DB_USER="postgres"
BACKUP_DIR="$HOME/roast-my-post-backups"
BACKUP_RETENTION_DAYS=7  # Keep backups for 7 days
LOG_FILE="$BACKUP_DIR/backup.log"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Function to log messages
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Start backup process
log_message "Starting automated backup of database '$DB_NAME'"

# Generate backup filename with date
BACKUP_NAME="automated_backup_$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="$BACKUP_DIR/${BACKUP_NAME}.sql"

# Check if database exists and has data
TOTAL_ROWS=$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT SUM(count) FROM (
        SELECT COUNT(*) as count FROM \"Agent\"
        UNION ALL SELECT COUNT(*) FROM \"Document\"
        UNION ALL SELECT COUNT(*) FROM \"Evaluation\"
        UNION ALL SELECT COUNT(*) FROM \"Job\"
    ) counts;
" 2>/dev/null | tr -d ' ' || echo "0")

if [[ "$TOTAL_ROWS" == "0" || -z "$TOTAL_ROWS" ]]; then
    log_message "WARNING: Database is empty or inaccessible. Skipping backup."
    exit 0
fi

log_message "Database has $TOTAL_ROWS rows. Proceeding with backup..."

# Create the backup
if pg_dump -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_FILE" 2>>"$LOG_FILE"; then
    # Compress the backup
    gzip "$BACKUP_FILE"
    BACKUP_SIZE=$(ls -lh "${BACKUP_FILE}.gz" | awk '{print $5}')
    log_message "Backup completed successfully: ${BACKUP_FILE}.gz (Size: $BACKUP_SIZE)"
    
    # Verify the backup
    if gunzip -t "${BACKUP_FILE}.gz" 2>>"$LOG_FILE"; then
        log_message "Backup verification passed"
    else
        log_message "ERROR: Backup verification failed!"
    fi
else
    log_message "ERROR: Backup failed!"
    exit 1
fi

# Clean up old backups
log_message "Cleaning up backups older than $BACKUP_RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "automated_backup_*.sql.gz" -type f -mtime +$BACKUP_RETENTION_DAYS -delete

# List current backups
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "automated_backup_*.sql.gz" -type f | wc -l | tr -d ' ')
log_message "Current backup count: $BACKUP_COUNT"

# Create a symlink to the latest backup
ln -sf "${BACKUP_FILE}.gz" "$BACKUP_DIR/latest_backup.sql.gz"

log_message "Automated backup process completed"
echo ""