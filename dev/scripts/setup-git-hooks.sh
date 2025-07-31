#!/bin/bash

# setup-git-hooks.sh - Install git hooks for Claude permission syncing
#
# This sets up a post-checkout hook that automatically syncs Claude permissions
# when switching branches or creating new ones.

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Create post-checkout hook
create_post_checkout_hook() {
    local HOOK_FILE="$1/.git/hooks/post-checkout"
    
    cat > "$HOOK_FILE" << 'EOF'
#!/bin/bash
# post-checkout hook - Sync Claude permissions when switching branches

# Get the checkout type (1 = branch checkout, 0 = file checkout)
CHECKOUT_TYPE=$3

# Only run for branch checkouts
if [ "$CHECKOUT_TYPE" = "1" ]; then
    # Find sync script
    SYNC_SCRIPT="$(git rev-parse --show-toplevel)/dev/scripts/sync-claude-permissions.sh"
    
    if [ -f "$SYNC_SCRIPT" ]; then
        echo "Syncing Claude permissions..."
        "$SYNC_SCRIPT" >/dev/null 2>&1 || true
    fi
fi
EOF
    
    chmod +x "$HOOK_FILE"
    echo -e "${GREEN}✓${NC} Created post-checkout hook in: $1"
}

# Main setup
main() {
    echo -e "${BLUE}Setting up git hooks for Claude permission syncing...${NC}"
    echo ""
    
    # Install in main repo
    if [ -d ".git" ]; then
        create_post_checkout_hook "."
    fi
    
    # Install in all worktrees
    if command -v git &> /dev/null; then
        git worktree list --porcelain | grep "^worktree " | cut -d' ' -f2- | while IFS= read -r worktree; do
            if [ -d "$worktree/.git" ] || [ -f "$worktree/.git" ]; then
                create_post_checkout_hook "$worktree"
            fi
        done
    fi
    
    echo ""
    echo -e "${GREEN}Setup complete!${NC}"
    echo ""
    echo "Claude permissions will now sync automatically when:"
    echo "  • Creating new branches"
    echo "  • Switching between branches"
    echo "  • Checking out commits"
    echo ""
    echo "You can also manually sync with:"
    echo "  ./dev/scripts/sync-claude-permissions.sh"
}

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}Error: Not in a git repository${NC}"
    exit 1
fi

main