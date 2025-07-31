#!/bin/bash

# worktree-manager.sh - Complete git worktree management with tmux and smart port allocation
#
# This script provides a unified solution for managing multiple git worktrees with:
# - Automatic port allocation (100 ports per worktree)
# - tmux session management with organized windows
# - Environment setup and dependency installation
#
# PORT ALLOCATION STRATEGY:
#   Main repo:    3000-3099
#   Worktree 1:   3100-3199
#   Worktree 2:   3200-3299
#   etc.
#
# Within each range:
#   :00 - Next.js dev server
#   :06 - Storybook (future)
#   :10 - MCP Server (future)
#   etc.
#
# USAGE:
#   ./dev/scripts/worktree-manager.sh create <branch> [<commit-ish>]
#   ./dev/scripts/worktree-manager.sh start <branch>
#   ./dev/scripts/worktree-manager.sh attach <branch>
#   ./dev/scripts/worktree-manager.sh stop <branch>
#   ./dev/scripts/worktree-manager.sh list
#   ./dev/scripts/worktree-manager.sh ports
#   ./dev/scripts/worktree-manager.sh remove <branch>

set -e

# Configuration
CONFIG_DIR="$HOME/.config/roast-my-post-worktrees"
WORKTREE_BASE="../"
BASE_PORT=3000
PORT_RANGE_SIZE=100

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check required dependencies
check_dependencies() {
    local missing_deps=()
    
    if ! command -v tmux &> /dev/null; then
        missing_deps+=("tmux")
    fi
    
    if ! command -v jq &> /dev/null; then
        missing_deps+=("jq")
    fi
    
    if ! command -v git &> /dev/null; then
        missing_deps+=("git")
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        echo -e "${RED}Error: Missing required dependencies:${NC}"
        printf '%s\n' "${missing_deps[@]}"
        echo ""
        echo "Install them with:"
        echo "  brew install ${missing_deps[*]}"
        exit 1
    fi
}

# Validate branch name
validate_branch_name() {
    local branch="$1"
    
    # Check for empty branch name
    if [ -z "$branch" ]; then
        echo -e "${RED}Error: Branch name cannot be empty${NC}"
        exit 1
    fi
    
    # Check for invalid characters
    if [[ ! "$branch" =~ ^[a-zA-Z0-9._/-]+$ ]]; then
        echo -e "${RED}Error: Invalid branch name. Use only alphanumeric characters, dots, underscores, slashes, and hyphens.${NC}"
        exit 1
    fi
    
    # Check if branch name is too long
    if [ ${#branch} -gt 100 ]; then
        echo -e "${RED}Error: Branch name too long (max 100 characters)${NC}"
        exit 1
    fi
}

# Create config directory
mkdir -p "$CONFIG_DIR"

# Service port offsets
get_service_offset() {
    case "$1" in
        "dev") echo 0 ;;
        "storybook") echo 6 ;;
        "mcp") echo 10 ;;
        "api-docs") echo 20 ;;
        "test") echo 30 ;;
        "monitor") echo 80 ;;
        *) echo 0 ;;
    esac
}

# Get next available worktree ID
get_next_worktree_id() {
    local max_id=-1
    
    for config in "$CONFIG_DIR"/*.json; do
        if [ -f "$config" ]; then
            local id=$(jq -r '.worktree_id // -1' "$config" 2>/dev/null || echo -1)
            if [ "$id" -gt "$max_id" ]; then
                max_id=$id
            fi
        fi
    done
    
    # Main repo is ID 0, worktrees start at 1
    if [ "$max_id" -eq -1 ]; then
        echo 1
    else
        echo $((max_id + 1))
    fi
}

# Calculate port for a service
calculate_port() {
    local worktree_id=$1
    local service=$2
    local offset=$(get_service_offset "$service")
    echo $((BASE_PORT + (worktree_id * PORT_RANGE_SIZE) + offset))
}

# Create worktree with full setup
create_worktree() {
    local BRANCH="$1"
    local COMMIT="${2:-HEAD}"
    
    # Validate inputs
    validate_branch_name "$BRANCH"
    
    local WORKTREE_PATH="$WORKTREE_BASE$BRANCH"
    local GIT_ROOT=$(git rev-parse --show-toplevel)
    
    # Get worktree ID and calculate ports
    local WORKTREE_ID=$(get_next_worktree_id)
    local DEV_PORT=$(calculate_port $WORKTREE_ID "dev")
    
    echo -e "${BLUE}Creating worktree for branch: $BRANCH${NC}"
    echo "Worktree ID: $WORKTREE_ID"
    echo "Port range: $((BASE_PORT + WORKTREE_ID * PORT_RANGE_SIZE))-$((BASE_PORT + (WORKTREE_ID + 1) * PORT_RANGE_SIZE - 1))"
    echo "Dev server: $DEV_PORT"
    echo ""
    
    # Create git worktree
    echo "Creating git worktree..."
    # Check if branch exists
    if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
        # Branch exists, don't create it
        git worktree add "$WORKTREE_PATH" "$BRANCH"
    else
        # Branch doesn't exist, create it
        git worktree add -b "$BRANCH" "$WORKTREE_PATH" "$COMMIT"
    fi
    
    # Save configuration
    local CONFIG_FILE="$CONFIG_DIR/$BRANCH.json"
    cat > "$CONFIG_FILE" <<EOF
{
    "branch": "$BRANCH",
    "worktree_id": $WORKTREE_ID,
    "path": "$(cd "$WORKTREE_PATH" && pwd)",
    "port_range": "$((BASE_PORT + WORKTREE_ID * PORT_RANGE_SIZE))-$((BASE_PORT + (WORKTREE_ID + 1) * PORT_RANGE_SIZE - 1))",
    "ports": {
        "dev": $DEV_PORT,
        "storybook": $(calculate_port $WORKTREE_ID "storybook"),
        "mcp": $(calculate_port $WORKTREE_ID "mcp"),
        "api_docs": $(calculate_port $WORKTREE_ID "api-docs"),
        "test": $(calculate_port $WORKTREE_ID "test"),
        "monitor": $(calculate_port $WORKTREE_ID "monitor")
    },
    "tmux_session": "$BRANCH",
    "created": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF
    
    # Copy and update .env files
    echo -e "${YELLOW}Setting up environment...${NC}"
    
    # Copy root .env files (for monorepo-wide configs)
    for env_file in "$GIT_ROOT"/.env*; do
        if [ -f "$env_file" ] && [[ ! "$env_file" =~ \.example$ ]]; then
            filename=$(basename "$env_file")
            cp "$env_file" "$WORKTREE_PATH/$filename"
            
            # Update port references
            if [[ "$filename" =~ ^\.env ]]; then
                # macOS compatible sed
                sed -i '' "s|http://localhost:[0-9]*|http://localhost:$DEV_PORT|g" "$WORKTREE_PATH/$filename"
            fi
            echo "  ✓ Copied and updated root $filename"
        fi
    done
    
    # Copy web app .env files
    if [ -d "$GIT_ROOT/apps/web" ]; then
        for env_file in "$GIT_ROOT/apps/web"/.env*; do
            if [ -f "$env_file" ] && [[ ! "$env_file" =~ \.example$ ]]; then
                filename=$(basename "$env_file")
                mkdir -p "$WORKTREE_PATH/apps/web"
                cp "$env_file" "$WORKTREE_PATH/apps/web/$filename"
                
                # Update port references
                if [[ "$filename" =~ ^\.env ]]; then
                    sed -i '' "s|http://localhost:[0-9]*|http://localhost:$DEV_PORT|g" "$WORKTREE_PATH/apps/web/$filename"
                fi
                echo "  ✓ Copied and updated apps/web/$filename"
            fi
        done
    fi
    
    # Copy MCP server .env
    if [ -f "$GIT_ROOT/apps/mcp-server/.env" ]; then
        mkdir -p "$WORKTREE_PATH/apps/mcp-server"
        cp "$GIT_ROOT/apps/mcp-server/.env" "$WORKTREE_PATH/apps/mcp-server/.env"
        echo "  ✓ Copied apps/mcp-server/.env"
    fi
    
    # Set up Claude permissions
    # Copy actual settings.local.json if it exists, otherwise use template
    if [ -f "$GIT_ROOT/.claude/settings.local.json" ]; then
        mkdir -p "$WORKTREE_PATH/.claude"
        cp "$GIT_ROOT/.claude/settings.local.json" "$WORKTREE_PATH/.claude/settings.local.json"
        echo "  ✓ Copied Claude permissions from main repo"
    elif [ -f "$GIT_ROOT/.claude/settings.local.json.template" ]; then
        mkdir -p "$WORKTREE_PATH/.claude"
        cp "$GIT_ROOT/.claude/settings.local.json.template" "$WORKTREE_PATH/.claude/settings.local.json"
        echo "  ✓ Set up Claude permissions from template"
    fi
    
    # Create Claude workspace file to ensure proper recognition
    echo "$WORKTREE_PATH" > "$WORKTREE_PATH/.claude_workspace"
    echo "  ✓ Created Claude workspace file"
    
    # Install dependencies
    cd "$WORKTREE_PATH"
    echo ""
    echo -e "${YELLOW}Installing dependencies...${NC}"
    pnpm install --silent
    pnpm --filter @roast/db run gen
    
    # MCP server dependencies are handled by workspace root install
    
    echo ""
    echo -e "${GREEN}✅ Worktree created successfully!${NC}"
    echo ""
    echo "📍 Location: $WORKTREE_PATH"
    echo "🌿 Branch: $BRANCH"
    echo "🔢 Worktree ID: $WORKTREE_ID"
    echo "📡 Port: Dev=$DEV_PORT"
    echo ""
    echo "Next steps:"
    echo "  $0 start $BRANCH    # Start all processes"
    echo "  $0 attach $BRANCH   # Attach to tmux session"
    echo ""
    echo "Claude permissions:"
    echo "  • Permissions copied from main repo"
    echo "  • To sync later: ./dev/scripts/sync-claude-permissions.sh"
    echo "  • For auto-sync: ./dev/scripts/setup-git-hooks.sh"
}

# Start tmux session
start_tmux_session() {
    local BRANCH="$1"
    local CONFIG_FILE="$CONFIG_DIR/$BRANCH.json"
    
    if [ ! -f "$CONFIG_FILE" ]; then
        echo -e "${RED}Error: No worktree found for branch '$BRANCH'${NC}"
        echo "Run: $0 create $BRANCH"
        exit 1
    fi
    
    # Read configuration
    local WORKTREE_PATH=$(jq -r '.path' "$CONFIG_FILE")
    local DEV_PORT=$(jq -r '.ports.dev' "$CONFIG_FILE")
    local SESSION="$BRANCH"
    
    # Kill existing session if it exists
    tmux kill-session -t "$SESSION" 2>/dev/null || true
    
    echo -e "${BLUE}Starting tmux session: $SESSION${NC}"
    echo "Worktree: $WORKTREE_PATH"
    echo "Port: Dev=$DEV_PORT"
    
    # Create tmux session with windows
    tmux new-session -d -s "$SESSION" -n "dev"
    
    # Window 0: Dev Server
    tmux send-keys -t "$SESSION:dev" "cd '$WORKTREE_PATH'" C-m
    tmux send-keys -t "$SESSION:dev" "echo '🚀 Starting dev server on port $DEV_PORT...'" C-m
    tmux send-keys -t "$SESSION:dev" "PORT=$DEV_PORT pnpm --filter @roast/web run dev" C-m
    
    # Window 1: Workers
    tmux new-window -t "$SESSION" -n "workers"
    tmux send-keys -t "$SESSION:workers" "cd '$WORKTREE_PATH'" C-m
    tmux send-keys -t "$SESSION:workers" "echo '⚙️  Job processor disabled for worktrees'" C-m
    tmux send-keys -t "$SESSION:workers" "echo ''" C-m
    tmux send-keys -t "$SESSION:workers" "echo 'To avoid conflicts with multiple worktrees accessing the same database,'" C-m
    tmux send-keys -t "$SESSION:workers" "echo 'job processing should only run from the main repository.'" C-m
    tmux send-keys -t "$SESSION:workers" "echo ''" C-m
    tmux send-keys -t "$SESSION:workers" "echo 'If you need to run jobs manually from this worktree:'" C-m
    tmux send-keys -t "$SESSION:workers" "echo '  pnpm --filter @roast/web run process-jobs-adaptive'" C-m
    
    # Window 2: Claude Code
    tmux new-window -t "$SESSION" -n "claude"
    tmux send-keys -t "$SESSION:claude" "cd '$WORKTREE_PATH'" C-m
    tmux send-keys -t "$SESSION:claude" "export CLAUDE_DEV_SERVER_URL='http://localhost:$DEV_PORT'" C-m
    tmux send-keys -t "$SESSION:claude" "export CLAUDE_WORKTREE_BRANCH='$BRANCH'" C-m
    tmux send-keys -t "$SESSION:claude" "clear" C-m
    tmux send-keys -t "$SESSION:claude" "echo '🤖 Claude Code - Worktree: $BRANCH'" C-m
    tmux send-keys -t "$SESSION:claude" "echo '🌐 Dev server: http://localhost:$DEV_PORT'" C-m
    tmux send-keys -t "$SESSION:claude" "echo '📁 Working directory: $WORKTREE_PATH'" C-m
    tmux send-keys -t "$SESSION:claude" "echo ''" C-m
    tmux send-keys -t "$SESSION:claude" "echo '📊 Git Status:'" C-m
    tmux send-keys -t "$SESSION:claude" "git status -sb" C-m
    tmux send-keys -t "$SESSION:claude" "echo ''" C-m
    tmux send-keys -t "$SESSION:claude" "echo 'Environment variables set:'" C-m
    tmux send-keys -t "$SESSION:claude" "echo '  CLAUDE_DEV_SERVER_URL=http://localhost:$DEV_PORT'" C-m
    tmux send-keys -t "$SESSION:claude" "echo '  CLAUDE_WORKTREE_BRANCH=$BRANCH'" C-m
    tmux send-keys -t "$SESSION:claude" "echo ''" C-m
    tmux send-keys -t "$SESSION:claude" "echo 'Starting Claude Code with workspace context...'" C-m
    tmux send-keys -t "$SESSION:claude" "claude" C-m
    
    # Select first window
    tmux select-window -t "$SESSION:dev"
    
    echo -e "${GREEN}✅ Session started successfully!${NC}"
    echo ""
    echo "To attach: tmux attach -t $SESSION"
}

# List worktrees
list_worktrees() {
    echo -e "${BLUE}Roast My Post Worktrees:${NC}"
    echo ""
    
    local found=false
    for config in "$CONFIG_DIR"/*.json; do
        if [ -f "$config" ]; then
            found=true
            local branch=$(jq -r '.branch' "$config")
            local id=$(jq -r '.worktree_id' "$config")
            local dev_port=$(jq -r '.ports.dev' "$config")
            local session=$(jq -r '.tmux_session' "$config")
            local path=$(jq -r '.path' "$config")
            
            echo -e "${GREEN}$branch${NC} (ID: $id)"
            echo "  Path: $path"
            echo "  Ports: Dev=$dev_port"
            echo -n "  Session: $session "
            
            if tmux has-session -t "$session" 2>/dev/null; then
                echo -e "${GREEN}[RUNNING]${NC}"
            else
                echo -e "${YELLOW}[STOPPED]${NC}"
            fi
            echo ""
        fi
    done
    
    if [ "$found" = false ]; then
        echo "No worktrees found."
        echo "Create one with: $0 create <branch>"
    fi
}

# Show port allocation
show_ports() {
    echo -e "${BLUE}Port Allocation Table${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # Main repo
    echo "📁 Main Repository (ID: 0)"
    echo "   Port Range: 3000-3099"
    echo "   - dev: 3000"
    echo ""
    
    # Worktrees
    for config in "$CONFIG_DIR"/*.json; do
        if [ -f "$config" ]; then
            local branch=$(jq -r '.branch' "$config")
            local id=$(jq -r '.worktree_id' "$config")
            local range=$(jq -r '.port_range' "$config")
            
            echo "🌿 $branch (ID: $id)"
            echo "   Port Range: $range"
            echo -n "   - "
            jq -r '.ports | to_entries | map("\(.key): \(.value)") | join(", ")' "$config"
            echo ""
        fi
    done
}

# Remove worktree
remove_worktree() {
    local BRANCH="$1"
    local CONFIG_FILE="$CONFIG_DIR/$BRANCH.json"
    
    if [ ! -f "$CONFIG_FILE" ]; then
        echo -e "${RED}Error: No configuration found for branch '$BRANCH'${NC}"
        exit 1
    fi
    
    local WORKTREE_PATH=$(jq -r '.path' "$CONFIG_FILE")
    local SESSION="$BRANCH"
    
    # Stop tmux session
    if tmux has-session -t "$SESSION" 2>/dev/null; then
        echo "Stopping tmux session..."
        tmux kill-session -t "$SESSION"
    fi
    
    # Remove git worktree
    echo "Removing git worktree..."
    git worktree remove "$WORKTREE_PATH" 2>/dev/null || true
    
    # Remove configuration
    rm "$CONFIG_FILE"
    
    echo -e "${GREEN}✓ Worktree removed${NC}"
    
    # Ask about branch deletion
    echo ""
    read -p "Delete branch '$BRANCH'? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git branch -d "$BRANCH" 2>/dev/null || git branch -D "$BRANCH"
        echo -e "${GREEN}✓ Branch deleted${NC}"
    fi
}

# Check dependencies before any commands
check_dependencies

# Main command handling
case "${1:-help}" in
    create)
        if [ $# -lt 2 ]; then
            echo "Usage: $0 create <branch> [<commit-ish>]"
            exit 1
        fi
        create_worktree "$2" "${3:-HEAD}"
        ;;
        
    start)
        if [ $# -lt 2 ]; then
            echo "Usage: $0 start <branch>"
            exit 1
        fi
        start_tmux_session "$2"
        ;;
        
    attach)
        if [ $# -lt 2 ]; then
            echo "Usage: $0 attach <branch>"
            exit 1
        fi
        tmux attach -t "$2"
        ;;
        
    stop)
        if [ $# -lt 2 ]; then
            echo "Usage: $0 stop <branch>"
            exit 1
        fi
        tmux kill-session -t "$2"
        echo "Session stopped"
        ;;
        
    list|ls)
        list_worktrees
        ;;
        
    ports)
        show_ports
        ;;
        
    remove|rm)
        if [ $# -lt 2 ]; then
            echo "Usage: $0 remove <branch>"
            exit 1
        fi
        remove_worktree "$2"
        ;;
        
    *)
        echo "Roast My Post - Worktree Manager"
        echo ""
        echo "Usage: $0 <command> [args]"
        echo ""
        echo "Commands:"
        echo "  create <branch> [base]  - Create new worktree with setup"
        echo "  start <branch>          - Start tmux session with all processes"
        echo "  attach <branch>         - Attach to tmux session"
        echo "  stop <branch>           - Stop tmux session"
        echo "  list                    - List all worktrees"
        echo "  ports                   - Show port allocation table"
        echo "  remove <branch>         - Remove worktree and cleanup"
        echo ""
        echo "Example workflow:"
        echo "  $0 create feature-awesome"
        echo "  $0 start feature-awesome"
        echo "  $0 attach feature-awesome"
        echo ""
        echo "Port allocation:"
        echo "  Main: 3000-3099, Worktree 1: 3100-3199, etc."
        echo "  Each gets 100 ports with standard offsets"
        ;;
esac