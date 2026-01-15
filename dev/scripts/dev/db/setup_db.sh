#!/usr/bin/env bash

# Script: setup_db.sh
# Description: Import production database schema and data to local development environment
#
# Prerequisites:
#   - Docker installed and running
#   - Access to production database credentials
#   - Local PostgreSQL running (or will be accessed via Docker)
#
# Required Environment Variables:
#   PGPASSWORD       Production database password
#   PROD_DB_USER     Production database username
#   PROD_DB_HOST     Production database host (e.g., your-db.db.ondigitalocean.com)
#   PROD_DB_NAME     Production database name
#
# Optional Environment Variables (with defaults):
#   LOCAL_DB_USER    Local database username (default: postgres)
#   LOCAL_DB_PASS    Local database password (default: postgres)
#   LOCAL_DB_NAME    Local database name (default: roast_my_post)
#   POSTGRES_VERSION PostgreSQL version (default: 16)
#   PROD_DB_PORT     Production database port (default: 25061)
#
# Usage:
#   1. Copy .env.prod.example to .env.prod and fill in credentials
#   2. source .env.prod
#   3. ./setup_db.sh
#
# What this script does:
#   1. Drops the existing local database (WARNING: destructive!)
#   2. Creates a fresh local database
#   3. Exports production schema and data using pg_dump
#   4. Updates schema ownership to match local database user
#   5. Imports schema and data into local database
#
# Troubleshooting:
#   - "PGPASSWORD environment variable is required"
#     → Make sure all required env vars are exported (check with: echo $PGPASSWORD)
#   - Connection timeout to production
#     → Verify your IP is whitelisted in production database firewall
#   - Permission denied on local database
#     → Ensure local PostgreSQL is running and user has superuser privileges

# Source common functions
source "$(dirname "$0")/lib/db_functions.sh"

# Check required environment variables
check_required_vars PGPASSWORD PROD_DB_USER PROD_DB_HOST PROD_DB_NAME

echo "Starting database setup..."

# Drop local database if exists
echo "Dropping existing database..."
psql_local postgres -v ON_ERROR_STOP=1 -c "drop database if exists $LOCAL_DB_NAME WITH (FORCE);"

# Create local database
echo "Creating new database from schema..."
cat pg_schema_local.sql | psql_local postgres -v ON_ERROR_STOP=1

# Export production schema and data
echo "Exporting production schema and data..."
pg_dump_prod --clean --if-exists -n public > schema.sql

# Update schema ownership
# echo "Updating schema ownership..."
sed -i "s/$PROD_DB_USER/$LOCAL_DB_USER/g; s/doadmin/$LOCAL_DB_USER/g" schema.sql
# sed -i "s/$PROD_DB_USER/$LOCAL_DB_USER/g; s/doadmin/$LOCAL_DB_USER/g" schema.sql

# Import production schema and data
echo "Importing production schema and data..."
cat schema.sql | psql_local "$LOCAL_DB_NAME"

# Clean up dump file
echo "Cleaning up dump file..."
rm -f schema.sql

echo "Database setup completed successfully!"
