#!/bin/bash

# sync-claude-permissions.sh - Sync Claude permissions across worktrees and branches
#
# This script helps maintain consistent Claude Code permissions when:
# 1. Creating new branches in worktrees
# 2. Switching between branches
# 3. Updating permissions across all worktrees
#
# Usage:
#   ./dev/scripts/sync-claude-permissions.sh               # Sync to current directory
#   ./dev/scripts/sync-claude-permissions.sh --all         # Sync to all worktrees
#   ./dev/scripts/sync-claude-permissions.sh <path>        # Sync to specific path

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Find the main repository root (where .git directory is)
find_main_repo() {
    local current="$PWD"
    while [ "$current" != "/" ]; do
        if [ -f "$current/.git" ]; then
            # This is a worktree, get the main repo
            local gitdir=$(cat "$current/.git" | grep "gitdir:" | cut -d' ' -f2)
            # Navigate from .git/worktrees/branch to main repo
            echo "$(cd "$current/$(dirname "$gitdir")/../.." && pwd)"
            return
        elif [ -d "$current/.git" ]; then
            # This is the main repo
            echo "$current"
            return
        fi
        current="$(dirname "$current")"
    done
    echo ""
}

# Sync permissions to a specific directory
sync_to_directory() {
    local TARGET_DIR="$1"
    local MAIN_REPO="$2"
    local SOURCE_FILE="$MAIN_REPO/.claude/settings.local.json"
    
    if [ ! -f "$SOURCE_FILE" ]; then
        echo -e "${RED}Error: No Claude settings found in main repository${NC}"
        echo "Expected at: $SOURCE_FILE"
        exit 1
    fi
    
    # Create .claude directory if needed
    mkdir -p "$TARGET_DIR/.claude"
    
    # Copy permissions
    if cp "$SOURCE_FILE" "$TARGET_DIR/.claude/settings.local.json"; then
        echo -e "${GREEN}✓${NC} Synced permissions to: $TARGET_DIR"
        
        # Also create/update workspace file
        echo "$TARGET_DIR" > "$TARGET_DIR/.claude_workspace"
        echo -e "${GREEN}✓${NC} Updated workspace file"
    else
        echo -e "${RED}✗${NC} Failed to sync to: $TARGET_DIR"
        return 1
    fi
}

# Main logic
main() {
    local MAIN_REPO=$(find_main_repo)
    
    if [ -z "$MAIN_REPO" ]; then
        echo -e "${RED}Error: Could not find main repository root${NC}"
        exit 1
    fi
    
    echo -e "${BLUE}Main repository:${NC} $MAIN_REPO"
    echo ""
    
    case "${1:-current}" in
        --all|-a)
            echo -e "${BLUE}Syncing to all worktrees...${NC}"
            echo ""
            
            # Get all worktrees
            local worktrees=$(git worktree list --porcelain | grep "^worktree " | cut -d' ' -f2-)
            
            while IFS= read -r worktree; do
                if [ "$worktree" != "$MAIN_REPO" ]; then
                    sync_to_directory "$worktree" "$MAIN_REPO"
                fi
            done <<< "$worktrees"
            
            # Also sync main repo
            sync_to_directory "$MAIN_REPO" "$MAIN_REPO"
            ;;
            
        --help|-h)
            echo "sync-claude-permissions.sh - Sync Claude Code permissions"
            echo ""
            echo "Usage:"
            echo "  $0                    # Sync to current directory"
            echo "  $0 --all             # Sync to all worktrees"
            echo "  $0 <path>            # Sync to specific path"
            echo ""
            echo "Examples:"
            echo "  $0                    # Update current worktree"
            echo "  $0 --all             # Update all worktrees"
            echo "  $0 ../feature-branch  # Update specific worktree"
            ;;
            
        current)
            # Sync to current directory
            sync_to_directory "$PWD" "$MAIN_REPO"
            ;;
            
        *)
            # Sync to specified directory
            if [ -d "$1" ]; then
                sync_to_directory "$1" "$MAIN_REPO"
            else
                echo -e "${RED}Error: Directory not found: $1${NC}"
                exit 1
            fi
            ;;
    esac
    
    echo ""
    echo -e "${GREEN}Done!${NC}"
    
    # Show tip if in a worktree
    if [ "$PWD" != "$MAIN_REPO" ] && [ -f "$PWD/.git" ]; then
        echo ""
        echo -e "${YELLOW}Tip:${NC} You may need to restart Claude Code for changes to take effect"
    fi
}

main "$@"