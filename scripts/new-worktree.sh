#!/bin/bash

# new-worktree.sh - Create a git worktree with .env files automatically copied
#
# This script creates a new git worktree and copies all .env files from the
# main repository to the new worktree, preserving your local configuration.
#
# USAGE:
#   ./scripts/new-worktree.sh <branch> [<commit-ish>]
#
# ARGUMENTS:
#   <branch>     - Name of the new branch to create (also used as worktree directory name)
#   <commit-ish> - Optional: base commit/branch (defaults to HEAD)
#
# EXAMPLES:
#   # Create a new feature branch worktree based on current HEAD
#   ./scripts/new-worktree.sh my-feature
#
#   # Create a fix branch based on main
#   ./scripts/new-worktree.sh fix-issue-123 main
#
#   # Create an experimental branch based on develop
#   ./scripts/new-worktree.sh experimental-feature develop
#
# WHAT IT DOES:
#   1. Creates a new git worktree at ../[branch-name]
#   2. Creates a new branch with the specified name
#   3. Copies all .env files from the main repository (excluding .env.example files)
#   4. Copies mcp-server/.env if it exists
#   5. Changes directory to the new worktree
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
echo "Copying .env files..."

# Copy root .env files
for env_file in "$GIT_ROOT"/.env*; do
    if [ -f "$env_file" ] && [[ ! "$env_file" =~ \.example$ ]]; then
        filename=$(basename "$env_file")
        cp "$env_file" "$WORKTREE_PATH/$filename"
        echo "  Copied $filename"
    fi
done

# Copy mcp-server .env if it exists
if [ -f "$GIT_ROOT/mcp-server/.env" ]; then
    mkdir -p "$WORKTREE_PATH/mcp-server"
    cp "$GIT_ROOT/mcp-server/.env" "$WORKTREE_PATH/mcp-server/.env"
    echo "  Copied mcp-server/.env"
fi

echo ""
echo "Worktree created successfully at: $WORKTREE_PATH"
echo "Branch: $BRANCH_NAME"
echo ""
echo "Changing to new worktree directory..."
cd "$WORKTREE_PATH"
echo "Now in: $(pwd)"
echo ""
echo "To remove this worktree later:"
echo "  git worktree remove $WORKTREE_PATH"
echo ""
echo "Note: This script changed your directory. You are now in the new worktree."