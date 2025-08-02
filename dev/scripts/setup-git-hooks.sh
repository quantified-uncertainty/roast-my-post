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

# Create shared permission fix script
create_shared_functions() {
    cat << 'EOF'
# Shared function to fix permissions
fix_permissions() {
    echo "  → Fixing script permissions..."
    find dev/scripts/ -name "*.sh" -exec chmod +x {} \; 2>/dev/null || true
    find dev/scripts/ -name "*.py" -exec chmod +x {} \; 2>/dev/null || true
    
    # Fix other common executable files
    find . -name "*.js" -path "*/bin/*" -exec chmod +x {} \; 2>/dev/null || true
    find . -name "gradlew" -exec chmod +x {} \; 2>/dev/null || true
}

# Shared function to sync Claude permissions
sync_claude_permissions() {
    SYNC_SCRIPT="$(git rev-parse --show-toplevel)/dev/scripts/sync-claude-permissions.sh"
    if [ -f "$SYNC_SCRIPT" ] && [ -x "$SYNC_SCRIPT" ]; then
        echo "  → Syncing Claude permissions..."
        "$SYNC_SCRIPT" >/dev/null 2>&1 || true
    fi
}
EOF
}

# Create post-checkout hook
create_post_checkout_hook() {
    local HOOK_FILE="$1/.git/hooks/post-checkout"
    
    cat > "$HOOK_FILE" << 'EOF'
#!/bin/bash
# post-checkout hook - Fix permissions and sync Claude settings when switching branches

# Get the checkout type (1 = branch checkout, 0 = file checkout)
CHECKOUT_TYPE=$3

# Only run for branch checkouts
if [ "$CHECKOUT_TYPE" = "1" ]; then
    echo "🔧 Running post-checkout hooks..."
    
    # Source the fix-permissions script if available
    FIX_SCRIPT="$(git rev-parse --show-toplevel)/dev/scripts/fix-permissions.sh"
    if [ -f "$FIX_SCRIPT" ] && [ -x "$FIX_SCRIPT" ]; then
        "$FIX_SCRIPT" >/dev/null 2>&1 || true
    else
        # Fallback to inline permission fixing
        find dev/scripts/ -name "*.sh" -exec chmod +x {} \; 2>/dev/null || true
        find dev/scripts/ -name "*.py" -exec chmod +x {} \; 2>/dev/null || true
        find . -name "*.js" -path "*/bin/*" -exec chmod +x {} \; 2>/dev/null || true
        find . -name "gradlew" -exec chmod +x {} \; 2>/dev/null || true
    fi
    
    # Sync Claude permissions
    SYNC_SCRIPT="$(git rev-parse --show-toplevel)/dev/scripts/sync-claude-permissions.sh"
    if [ -f "$SYNC_SCRIPT" ] && [ -x "$SYNC_SCRIPT" ]; then
        echo "  → Syncing Claude permissions..."
        "$SYNC_SCRIPT" >/dev/null 2>&1 || true
    fi
    
    echo "✅ Post-checkout hooks completed!"
fi
EOF
    
    chmod +x "$HOOK_FILE"
    echo -e "${GREEN}✓${NC} Created post-checkout hook in: $1"
}

# Create post-merge hook
create_post_merge_hook() {
    local HOOK_FILE="$1/.git/hooks/post-merge"
    
    cat > "$HOOK_FILE" << 'EOF'
#!/bin/bash
# post-merge hook - Fix permissions after git pull/merge

echo "🔧 Running post-merge hooks..."

# Source the fix-permissions script if available
FIX_SCRIPT="$(git rev-parse --show-toplevel)/dev/scripts/fix-permissions.sh"
if [ -f "$FIX_SCRIPT" ] && [ -x "$FIX_SCRIPT" ]; then
    "$FIX_SCRIPT" >/dev/null 2>&1 || true
else
    # Fallback to inline permission fixing
    echo "  → Fixing script permissions..."
    find dev/scripts/ -name "*.sh" -exec chmod +x {} \; 2>/dev/null || true
    find dev/scripts/ -name "*.py" -exec chmod +x {} \; 2>/dev/null || true
    find . -name "*.js" -path "*/bin/*" -exec chmod +x {} \; 2>/dev/null || true
    find . -name "gradlew" -exec chmod +x {} \; 2>/dev/null || true
fi

echo "✅ Post-merge hooks completed!"
EOF
    
    chmod +x "$HOOK_FILE"
    echo -e "${GREEN}✓${NC} Created post-merge hook in: $1"
}

# Main setup
main() {
    echo -e "${BLUE}Setting up git hooks for Claude permission syncing...${NC}"
    echo ""
    
    # Install in main repo
    if [ -d ".git" ]; then
        create_post_checkout_hook "."
        create_post_merge_hook "."
    fi
    
    # Install in all worktrees
    if command -v git &> /dev/null; then
        git worktree list --porcelain | grep "^worktree " | cut -d' ' -f2- | while IFS= read -r worktree; do
            if [ -d "$worktree/.git" ] || [ -f "$worktree/.git" ]; then
                create_post_checkout_hook "$worktree"
                create_post_merge_hook "$worktree"
            fi
        done
    fi
    
    echo ""
    echo -e "${GREEN}Setup complete!${NC}"
    echo ""
    echo "Git hooks will now automatically:"
    echo "  • Fix script permissions when switching branches"
    echo "  • Fix script permissions after git pull/merge"
    echo "  • Sync Claude permissions when switching branches"
    echo ""
    echo "Hooks installed:"
    echo "  • post-checkout - runs after branch switches"
    echo "  • post-merge - runs after git pull/merge"
    echo ""
    echo "You can also manually run:"
    echo "  • ./dev/scripts/sync-claude-permissions.sh - sync Claude settings"
    echo "  • chmod +x dev/scripts/*.sh - fix script permissions"
}

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}Error: Not in a git repository${NC}"
    exit 1
fi

main