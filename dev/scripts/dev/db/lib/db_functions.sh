#!/usr/bin/env bash

# Common database functions for PostgreSQL operations
#
# This library provides wrapper functions for PostgreSQL commands that:
#   - Use Docker to run PostgreSQL commands (portable, version-controlled)
#   - Handle authentication via environment variables
#   - Provide consistent interface for local and production databases
#
# Available Functions:
#   psql_local <database> [args]      Run psql on local database
#   psql_prod [args]                  Run psql on production database
#   pg_dump_prod [args]               Run pg_dump on production database
#   copy_data <query> <table>         Copy data from prod to local via CSV
#
# Usage Example:
#   source lib/db_functions.sh
#   psql_prod -c "SELECT count(*) FROM \"User\";"
#   pg_dump_prod -t public.User > users.sql
#   copy_data "SELECT * FROM \"User\" LIMIT 100" "User"

set -euo pipefail
IFS=$'\n\t'

# Source common utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common_utils.sh"

# Configuration defaults
LOCAL_DB_USER=${LOCAL_DB_USER:-"postgres"}
LOCAL_DB_PASS=${LOCAL_DB_PASS:-"postgres"}
LOCAL_DB_NAME=${LOCAL_DB_NAME:-"roast_my_post"}
POSTGRES_VERSION=${POSTGRES_VERSION:-"16"}
PROD_DB_PORT=${PROD_DB_PORT:-25061}

# Helper functions
run_docker_pg() {
    docker run --network=host --rm "$@"
}

psql_local() {
    local db=$1
    shift
    run_docker_pg -e PGPASSWORD="$LOCAL_DB_PASS" -i postgres:$POSTGRES_VERSION psql -h localhost -U "$LOCAL_DB_USER" -d "$db" --set VERBOSITY=verbose "$@"
}

pg_dump_prod() {
    run_docker_pg -e PGPASSWORD="${PGPASSWORD}" postgres:$POSTGRES_VERSION pg_dump -v -h "${PROD_DB_HOST}" -p "${PROD_DB_PORT}" -U "${PROD_DB_USER}" -d "${PROD_DB_NAME}" "$@"
}

psql_prod() {
    run_docker_pg -e PGPASSWORD="${PGPASSWORD}" -i postgres:$POSTGRES_VERSION psql -h "${PROD_DB_HOST}" -p "${PROD_DB_PORT}" -U "${PROD_DB_USER}" -d "${PROD_DB_NAME}" --set VERBOSITY=verbose "$@"
}

copy_data() {
    local query="$1"
    local table="$2"
    psql_prod -c "\copy ($query) TO stdout WITH CSV;" | \
        psql_local "$LOCAL_DB_NAME" -c "\copy $table FROM stdin WITH CSV;"
}
