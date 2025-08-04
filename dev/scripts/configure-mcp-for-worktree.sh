#!/bin/bash

# configure-mcp-for-worktree.sh - Configure MCP servers for a specific worktree
#
# This script updates Claude's MCP configuration to work with a specific worktree
# by adjusting the paths in the configuration to point to the worktree's files.
#
# USAGE:
#   ./dev/scripts/configure-mcp-for-worktree.sh <branch>
#   ./dev/scripts/configure-mcp-for-worktree.sh --restore

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

CONFIG_DIR="$HOME/.config/roast-my-post-worktrees"
CLAUDE_CONFIG_DIR="$HOME/Library/Application Support/Claude"
CLAUDE_CONFIG_FILE="$CLAUDE_CONFIG_DIR/claude_desktop_config.json"
BACKUP_FILE="$CLAUDE_CONFIG_DIR/claude_desktop_config.backup.json"

# Function to restore original configuration
restore_config() {
    if [ -f "$BACKUP_FILE" ]; then
        cp "$BACKUP_FILE" "$CLAUDE_CONFIG_FILE"
        echo -e "${GREEN}✅ Restored original MCP configuration${NC}"
    else
        echo -e "${YELLOW}⚠️  No backup found to restore${NC}"
    fi
}

# Handle restore flag
if [ "$1" = "--restore" ]; then
    restore_config
    exit 0
fi

# Check for branch argument
if [ $# -lt 1 ]; then
    echo "Usage: $0 <branch>"
    echo "       $0 --restore"
    echo ""
    echo "This script configures Claude's MCP servers to work with a specific worktree."
    echo ""
    echo "Examples:"
    echo "  $0 feature-branch    # Configure for worktree"
    echo "  $0 --restore         # Restore original config"
    exit 1
fi

BRANCH="$1"
WORKTREE_CONFIG="$CONFIG_DIR/$BRANCH.json"

# Check if worktree exists
if [ ! -f "$WORKTREE_CONFIG" ]; then
    echo -e "${RED}Error: No worktree found for branch '$BRANCH'${NC}"
    echo "Available worktrees:"
    ls -1 "$CONFIG_DIR"/*.json 2>/dev/null | xargs -I {} basename {} .json | sed 's/^/  - /'
    exit 1
fi

# Get worktree path
WORKTREE_PATH=$(jq -r '.path' "$WORKTREE_CONFIG")
DEV_PORT=$(jq -r '.ports.dev' "$WORKTREE_CONFIG")

echo -e "${BLUE}Configuring MCP servers for worktree: $BRANCH${NC}"
echo "Worktree path: $WORKTREE_PATH"
echo "Dev port: $DEV_PORT"
echo ""

# Create backup if it doesn't exist
if [ ! -f "$BACKUP_FILE" ]; then
    cp "$CLAUDE_CONFIG_FILE" "$BACKUP_FILE"
    echo -e "${GREEN}✅ Created backup of original configuration${NC}"
fi

# Read current config
if [ ! -f "$CLAUDE_CONFIG_FILE" ]; then
    echo -e "${RED}Error: Claude configuration file not found${NC}"
    echo "Please ensure Claude Desktop is installed and has been run at least once."
    exit 1
fi

# Create temporary file for the new config
TEMP_CONFIG=$(mktemp)

# Read and modify the configuration using jq
jq --arg worktree_path "$WORKTREE_PATH" \
   --arg dev_port "$DEV_PORT" \
   '
   # Update roast-my-post MCP server if it exists
   if .mcpServers["roast-my-post"] then
     .mcpServers["roast-my-post"].args = [($worktree_path + "/apps/mcp-server/dist/index.js")] |
     .mcpServers["roast-my-post"].env.ROAST_MY_POST_MCP_API_BASE_URL = "http://localhost:" + $dev_port
   else . end |
   
   # Update filesystem MCP server if it exists (adjust allowed directories)
   if .mcpServers.filesystem then
     .mcpServers.filesystem.args = (
       .mcpServers.filesystem.args | 
       map(if . == "-a" then . else
         if test("/roast-my-post") then $worktree_path else . end
       end)
     )
   else . end
   ' "$CLAUDE_CONFIG_FILE" > "$TEMP_CONFIG"

# Check if jq succeeded
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to modify configuration${NC}"
    rm "$TEMP_CONFIG"
    exit 1
fi

# Move the temp file to the actual config
mv "$TEMP_CONFIG" "$CLAUDE_CONFIG_FILE"

echo -e "${GREEN}✅ Updated MCP configuration for worktree${NC}"
echo ""
echo "Changes made:"
echo "  • roast-my-post server now points to: $WORKTREE_PATH/apps/mcp-server/dist/index.js"
echo "  • API base URL updated to: http://localhost:$DEV_PORT"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: You must restart Claude Desktop for changes to take effect${NC}"
echo ""
echo "To restore original configuration later:"
echo "  $0 --restore"

# Remind about building MCP server
if [ ! -f "$WORKTREE_PATH/apps/mcp-server/dist/index.js" ]; then
    echo ""
    echo -e "${YELLOW}⚠️  MCP server not built in worktree. Build it with:${NC}"
    echo "  cd $WORKTREE_PATH"
    echo "  pnpm --filter @roast/mcp-server run build"
fi