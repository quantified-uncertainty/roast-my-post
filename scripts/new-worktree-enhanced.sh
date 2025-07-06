#!/bin/bash

# new-worktree-enhanced.sh - Create a git worktree with full setup
#
# This enhanced version creates a new git worktree and:
# - Copies all .env files from the main repository
# - Runs npm install for both root and mcp-server
# - Generates Prisma client
# - Shows helpful next steps including port configuration
#
# USAGE:
#   ./scripts/new-worktree-enhanced.sh <branch> [<commit-ish>]
#
# ARGUMENTS:
#   <branch>     - Name of the new branch to create (also used as worktree directory name)
#   <commit-ish> - Optional: base commit/branch (defaults to HEAD)
#
# EXAMPLES:
#   # Create a new feature branch worktree based on current HEAD
#   ./scripts/new-worktree-enhanced.sh my-feature
#
#   # Create a fix branch based on main
#   ./scripts/new-worktree-enhanced.sh fix-issue-123 main
#
#   # Create an experimental branch based on develop
#   ./scripts/new-worktree-enhanced.sh experimental-feature develop
#
# TO REMOVE A WORKTREE:
#   git worktree remove ../[branch-name]
#   git branch -d [branch-name]  # to also delete the branch

set -e

# Check if we have the required arguments
if [ $# -lt 1 ]; then
    echo "Usage: $0 <branch> [<commit-ish>]"
    echo "Example: $0 my-feature"
    echo "Example: $0 fix-issue-123 main"
    exit 1
fi

BRANCH_NAME="$1"
COMMIT_ISH="${2:-HEAD}"
WORKTREE_PATH="../$BRANCH_NAME"

# Get the root directory of the current git repository
GIT_ROOT=$(git rev-parse --show-toplevel)

# Create the worktree
echo "Creating worktree at $WORKTREE_PATH for branch $BRANCH_NAME..."
git worktree add -b "$BRANCH_NAME" "$WORKTREE_PATH" "$COMMIT_ISH"

# Copy .env files
echo ""
echo "Copying .env files..."

# Copy root .env files
for env_file in "$GIT_ROOT"/.env*; do
    if [ -f "$env_file" ] && [[ ! "$env_file" =~ \.example$ ]]; then
        filename=$(basename "$env_file")
        cp "$env_file" "$WORKTREE_PATH/$filename"
        echo "  ✓ Copied $filename"
    fi
done

# Copy mcp-server .env if it exists
if [ -f "$GIT_ROOT/mcp-server/.env" ]; then
    mkdir -p "$WORKTREE_PATH/mcp-server"
    cp "$GIT_ROOT/mcp-server/.env" "$WORKTREE_PATH/mcp-server/.env"
    echo "  ✓ Copied mcp-server/.env"
fi

# Change to new worktree directory
cd "$WORKTREE_PATH"

# Install dependencies
echo ""
echo "Installing dependencies..."
echo "  This may take a few minutes..."
npm install

# Generate Prisma client
echo ""
echo "Generating Prisma client..."
npx prisma generate

# Install mcp-server dependencies if the directory exists
if [ -d "mcp-server" ]; then
    echo ""
    echo "Installing mcp-server dependencies..."
    cd mcp-server
    npm install
    cd ..
fi

# Success message
echo ""
echo "✅ Worktree created and set up successfully!"
echo ""
echo "📍 Location: $WORKTREE_PATH"
echo "🌿 Branch: $BRANCH_NAME"
echo "📂 Current directory: $(pwd)"
echo ""
echo "🚀 Next steps:"
echo ""
echo "  # Start development server:"
echo "  npm run dev"
echo ""
echo "  # If port 3000 is in use (main worktree running), use a different port:"
echo "  PORT=3001 npm run dev"
echo ""
echo "  # To open in Claude Code:"
echo "  # Open Claude Code and navigate to: $(pwd)"
echo ""
echo "⚠️  Important notes:"
echo "  - Both worktrees share the same database (via .env)"
echo "  - Be careful with database migrations in multiple worktrees"
echo "  - Stop dev servers in other worktrees to avoid port conflicts"
echo ""
echo "🗑️  To remove this worktree later:"
echo "  git worktree remove $WORKTREE_PATH"
echo "  git branch -d $BRANCH_NAME  # to also delete the branch"