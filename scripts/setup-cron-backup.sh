#!/bin/bash

# Script to set up automated daily backups via cron

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKUP_SCRIPT="$SCRIPT_DIR/automated-backup.sh"

echo "Setting up automated daily backups for Open Annotate database..."
echo ""

# Check if backup script exists
if [[ ! -f "$BACKUP_SCRIPT" ]]; then
    echo "Error: Backup script not found at $BACKUP_SCRIPT"
    exit 1
fi

# Display current cron jobs
echo "Current cron jobs:"
crontab -l 2>/dev/null || echo "No crontab for current user"
echo ""

# Ask user for backup time
echo "When would you like daily backups to run?"
echo "1) 2:00 AM (recommended)"
echo "2) 12:00 AM (midnight)"
echo "3) 6:00 AM"
echo "4) Custom time"
read -p "Select option (1-4): " -n 1 -r
echo ""

case $REPLY in
    1) CRON_TIME="0 2 * * *" ; TIME_DESC="2:00 AM daily" ;;
    2) CRON_TIME="0 0 * * *" ; TIME_DESC="midnight daily" ;;
    3) CRON_TIME="0 6 * * *" ; TIME_DESC="6:00 AM daily" ;;
    4) 
        read -p "Enter hour (0-23): " HOUR
        CRON_TIME="0 $HOUR * * *"
        TIME_DESC="${HOUR}:00 daily"
        ;;
    *) echo "Invalid option"; exit 1 ;;
esac

# Create the cron job entry
CRON_JOB="$CRON_TIME $BACKUP_SCRIPT"

echo ""
echo "Will add the following cron job:"
echo "$CRON_JOB"
echo "This will run backups at $TIME_DESC"
echo ""

read -p "Continue? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Add to crontab
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    
    echo "✅ Cron job added successfully!"
    echo ""
    echo "To verify, run: crontab -l"
    echo "To remove, run: crontab -e and delete the line"
    echo ""
    echo "Backups will be stored in: ~/open-annotate-backups/"
    echo "Logs will be at: ~/open-annotate-backups/backup.log"
    
    # Test the backup script
    read -p "Would you like to test the backup script now? (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Running backup script..."
        "$BACKUP_SCRIPT"
    fi
else
    echo "Setup cancelled."
fi