#!/bin/bash

# Safe Prisma wrapper script
# This script adds safety checks before running potentially dangerous Prisma commands

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# In monorepo, project root is two levels up from dev/scripts
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
DB_PACKAGE_DIR="$PROJECT_ROOT/internal-packages/db"

# Function to create backup
create_backup() {
    local reason="$1"
    echo -e "${YELLOW}Creating backup: ${reason}${NC}"
    "$SCRIPT_DIR/backup-database.sh" "$reason" || {
        echo -e "${RED}Backup failed! Aborting operation.${NC}"
        exit 1
    }
}

# Function to count database rows
check_database_health() {
    echo -e "${YELLOW}Checking database health...${NC}"
    # Extract database name from DATABASE_URL if available
    local db_name="roast_my_post"
    if [[ -n "$DATABASE_URL" ]]; then
        db_name=$(echo $DATABASE_URL | sed -n 's/.*/\([^?]*\).*/\1/p')
    fi
    
    local total_rows=$(psql "$DATABASE_URL" -t -c "
        SELECT SUM(count) FROM (
            SELECT COUNT(*) as count FROM \"Agent\"
            UNION ALL SELECT COUNT(*) FROM \"Document\"
            UNION ALL SELECT COUNT(*) FROM \"Evaluation\"
            UNION ALL SELECT COUNT(*) FROM \"Job\"
        ) counts;
    " 2>/dev/null | tr -d ' ')
    
    if [[ "$total_rows" == "0" || -z "$total_rows" ]]; then
        echo -e "${RED}WARNING: Database appears to be empty!${NC}"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        echo -e "${GREEN}Database health check passed (${total_rows} total rows)${NC}"
    fi
}

# Check if we're in the wrong directory
if [[ "$PWD" != "$DB_PACKAGE_DIR" && "$PWD" != "$PROJECT_ROOT" ]]; then
    echo -e "${YELLOW}Note: Running from $PWD${NC}"
    echo "Switching to database package directory: $DB_PACKAGE_DIR"
fi

# Parse Prisma command
COMMAND="$1"
SUBCOMMAND="$2"

# Handle dangerous commands
if [[ "$COMMAND" == "db" ]]; then
    case "$SUBCOMMAND" in
        "push")
            echo -e "${RED}⚠️  WARNING: 'prisma db push' detected!${NC}"
            echo "This command can cause data loss when renaming columns."
            echo ""
            
            # Check for --accept-data-loss flag
            if [[ "$*" == *"--accept-data-loss"* ]]; then
                echo -e "${RED}DANGER: --accept-data-loss flag detected!${NC}"
                echo "This WILL delete data when renaming columns!"
                echo ""
                echo "Safer alternative for column renames:"
                echo "  1. Create a migration: npx prisma migrate dev"
                echo "  2. Edit the migration SQL to use ALTER TABLE RENAME COLUMN"
                echo ""
                read -p "Are you ABSOLUTELY SURE you want to continue? Type 'DELETE MY DATA' to proceed: " -r
                if [[ "$REPLY" != "DELETE MY DATA" ]]; then
                    echo "Operation cancelled."
                    exit 1
                fi
            fi
            
            check_database_health
            create_backup "pre-db-push"
            ;;
            
        "execute")
            echo -e "${YELLOW}Warning: Direct SQL execution detected${NC}"
            create_backup "pre-db-execute"
            ;;
    esac
elif [[ "$COMMAND" == "migrate" ]]; then
    case "$SUBCOMMAND" in
        "reset")
            echo -e "${RED}⚠️  WARNING: 'prisma migrate reset' will DELETE ALL DATA!${NC}"
            check_database_health
            read -p "Are you sure you want to reset the database? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
            create_backup "pre-migrate-reset"
            ;;
            
        "dev"|"deploy")
            # These are generally safe but backup anyway
            check_database_health
            create_backup "pre-migrate-${SUBCOMMAND}"
            ;;
    esac
fi

# Execute the Prisma command from the db package directory
echo -e "${GREEN}Executing: pnpm prisma $@${NC}"
cd "$DB_PACKAGE_DIR"
exec pnpm prisma "$@"