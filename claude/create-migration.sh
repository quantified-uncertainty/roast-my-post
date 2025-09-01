#!/bin/bash
# Helper script to create proper Prisma migration files

if [ -z "$1" ]; then
    echo "Usage: ./claude/create-migration.sh <migration_name>"
    echo "Example: ./claude/create-migration.sh add_user_status_column"
    exit 1
fi

MIGRATION_NAME="$1"
TIMESTAMP=$(date +%Y%m%d%H%M%S)
MIGRATION_DIR="internal-packages/db/prisma/migrations/${TIMESTAMP}_${MIGRATION_NAME}"

# Create migration directory
mkdir -p "$MIGRATION_DIR"

# Create migration.sql file
cat > "$MIGRATION_DIR/migration.sql" << 'EOF'
-- Add your SQL here
-- Example:
-- ALTER TABLE "User" ADD COLUMN "status" TEXT DEFAULT 'active';
EOF

echo "✅ Created migration: $MIGRATION_DIR/migration.sql"
echo "📝 Now edit the file and add your SQL commands"
echo "🔧 Then run: pnpm --filter @roast/db run db:push"