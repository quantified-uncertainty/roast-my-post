#!/bin/bash

# worktree-tmux.sh - Manage git worktrees with tmux sessions for Roast My Post
#
# This script provides a complete solution for managing multiple git worktrees
# with automatic port assignment and tmux session management. Each worktree
# runs in isolation with its own ports while sharing the same database.
#
# USAGE:
#   ./scripts/worktree-tmux.sh create <branch> [<commit-ish>]
#   ./scripts/worktree-tmux.sh start <branch>
#   ./scripts/worktree-tmux.sh attach <branch>
#   ./scripts/worktree-tmux.sh stop <branch>
#   ./scripts/worktree-tmux.sh list
#   ./scripts/worktree-tmux.sh status
#
# COMMANDS:
#   create <branch> [base]  - Create new worktree with automatic setup
#                            - Installs dependencies (npm install)
#                            - Generates Prisma client
#                            - Assigns unique ports
#                            - Creates helper scripts
#
#   start <branch>         - Start tmux session with all processes
#                           - Launches dev server, job processor, prisma studio
#                           - Each process in its own window/pane
#
#   attach <branch>        - Attach to existing tmux session
#                           - Use Ctrl+B, D to detach
#
#   stop <branch>          - Stop tmux session (kills all processes)
#
#   list                   - Show all worktrees and their status
#
#   status                 - Show active tmux sessions
#
# TMUX LAYOUT:
#   Each worktree gets a tmux session named "rmp-<branch>" with 4 windows:
#
#   Window 0 "dev": Development server
#   ├── Pane 0.0 (70%): Next.js dev server (PORT=300X npm run dev)
#   └── Pane 0.1 (30%): Server logs and health checks
#
#   Window 1 "workers": Background processes  
#   ├── Pane 1.0 (50%): Job processor (npm run process-jobs-adaptive)
#   └── Pane 1.1 (50%): TypeScript watch mode (npm run typecheck --watch)
#
#   Window 2 "database": Database tools
#   ├── Pane 2.0 (50%): Prisma Studio (port 555X)
#   └── Pane 2.1 (50%): Database monitoring/queries
#
#   Window 3 "terminal": Free terminal for ad-hoc commands
#
# PORT ASSIGNMENTS:
#   Ports are automatically assigned based on worktree order:
#   - Main repo:     Dev=3000, Prisma=5555
#   - Worktree 1:    Dev=3001, Prisma=5556  
#   - Worktree 2:    Dev=3002, Prisma=5557
#   - etc.
#
# ENVIRONMENT SETUP:
#   - Copies all .env files from main repository
#   - Updates NEXTAUTH_URL and API URLs to use assigned ports
#   - Preserves all API keys and database connections
#   - Each worktree shares the same database (be careful with migrations!)
#
# TMUX NAVIGATION:
#   Ctrl+B, D        - Detach from session (processes keep running)
#   Ctrl+B, 0-3      - Switch between windows
#   Ctrl+B, arrows   - Switch between panes
#   Ctrl+B, [        - Enter scroll mode (q to exit)
#   Ctrl+B, z        - Toggle pane zoom
#   Ctrl+B, c        - Create new window
#   Ctrl+B, ,        - Rename current window
#
# EXAMPLE WORKFLOW:
#   # Create new feature branch worktree
#   ./scripts/worktree-tmux.sh create feature-awesome-thing
#   
#   # Start all processes in tmux
#   ./scripts/worktree-tmux.sh start feature-awesome-thing
#   
#   # Attach to see all processes
#   ./scripts/worktree-tmux.sh attach feature-awesome-thing
#   
#   # Later, stop everything
#   ./scripts/worktree-tmux.sh stop feature-awesome-thing
#   
#   # Remove worktree when done
#   git worktree remove ../feature-awesome-thing
#
# NOTES:
#   - All worktrees share the same database (via DATABASE_URL)
#   - Claude Code can open any worktree directory normally
#   - Each worktree has its own node_modules (independent deps)
#   - Config stored in ~/.config/roast-my-post-worktrees/
#   - Use 'list' command to see all ports if you forget
#
# TROUBLESHOOTING:
#   - Port already in use: Another worktree may be using it, check with 'list'
#   - Session won't start: Check if session already exists with 'tmux ls'
#   - Can't attach: Make sure you started the session first
#   - Dependencies fail: Check npm/node versions match main repository

set -e

# Configuration
WORKTREE_BASE="../"
CONFIG_DIR="$HOME/.config/roast-my-post-worktrees"
mkdir -p "$CONFIG_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to get next available port set
get_next_ports() {
    local max_id=-1
    for config in "$CONFIG_DIR"/*.json; do
        if [ -f "$config" ]; then
            id=$(basename "$config" .json | grep -o '[0-9]*$')
            if [ -z "$id" ]; then
                id=0
            fi
            if [ "$id" -gt "$max_id" ]; then
                max_id=$id
            fi
        fi
    done
    local next_id=$((max_id + 1))
    echo "$((3000 + next_id)) $((5555 + next_id))"
}

# Function to create worktree with tmux setup
create_worktree() {
    local BRANCH="$1"
    local COMMIT="${2:-HEAD}"
    local WORKTREE_PATH="$WORKTREE_BASE$BRANCH"
    local GIT_ROOT=$(git rev-parse --show-toplevel)
    
    # Get ports
    read DEV_PORT PRISMA_PORT <<< $(get_next_ports)
    
    echo -e "${BLUE}Creating worktree for branch: $BRANCH${NC}"
    echo "Ports assigned: Dev=$DEV_PORT, Prisma=$PRISMA_PORT"
    
    # Create git worktree
    git worktree add -b "$BRANCH" "$WORKTREE_PATH" "$COMMIT"
    
    # Save configuration
    cat > "$CONFIG_DIR/$BRANCH.json" <<EOF
{
    "branch": "$BRANCH",
    "path": "$(cd "$WORKTREE_PATH" && pwd)",
    "dev_port": $DEV_PORT,
    "prisma_port": $PRISMA_PORT,
    "tmux_session": "rmp-$BRANCH",
    "created": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF
    
    # Copy and update .env files
    echo -e "${YELLOW}Setting up environment...${NC}"
    for env_file in "$GIT_ROOT"/.env*; do
        if [ -f "$env_file" ] && [[ ! "$env_file" =~ \.example$ ]]; then
            filename=$(basename "$env_file")
            cp "$env_file" "$WORKTREE_PATH/$filename"
            
            # Update ports in .env
            if [[ "$filename" =~ ^\.env ]]; then
                sed -i.bak "s|http://localhost:[0-9]*|http://localhost:$DEV_PORT|g" "$WORKTREE_PATH/$filename"
                rm "$WORKTREE_PATH/$filename.bak"
            fi
        fi
    done
    
    # Copy mcp-server .env
    if [ -f "$GIT_ROOT/apps/mcp-server/.env" ]; then
        mkdir -p "$WORKTREE_PATH/apps/mcp-server"
        cp "$GIT_ROOT/apps/mcp-server/.env" "$WORKTREE_PATH/apps/mcp-server/.env"
    fi
    
    # Install dependencies
    cd "$WORKTREE_PATH"
    echo -e "${YELLOW}Installing dependencies...${NC}"
    pnpm install
    pnpm --filter @roast/db run gen
    
    if [ -d "apps/mcp-server" ]; then
        cd apps/mcp-server && pnpm install && cd ../..
    fi
    
    # Create tmux helper script
    cat > tmux-session.sh <<'SCRIPT'
#!/bin/bash
# Quick access to this worktree's tmux session

SESSION="rmp-BRANCH_PLACEHOLDER"

case "${1:-attach}" in
    attach|a)
        tmux attach-session -t "$SESSION" 2>/dev/null || echo "Session not running. Use './tmux-session.sh start' first."
        ;;
    start|s)
        ../scripts/worktree-tmux.sh start BRANCH_PLACEHOLDER
        ;;
    stop)
        ../scripts/worktree-tmux.sh stop BRANCH_PLACEHOLDER
        ;;
    *)
        echo "Usage: ./tmux-session.sh {attach|start|stop}"
        ;;
esac
SCRIPT
    
    # Use different sed syntax for macOS compatibility
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/BRANCH_PLACEHOLDER/$BRANCH/g" tmux-session.sh
    else
        sed -i "s/BRANCH_PLACEHOLDER/$BRANCH/g" tmux-session.sh
    fi
    chmod +x tmux-session.sh
    
    echo -e "${GREEN}✓ Worktree created successfully!${NC}"
    echo ""
    echo "Next steps:"
    echo "  cd $WORKTREE_PATH"
    echo "  ./tmux-session.sh start    # Start all processes"
    echo "  ./tmux-session.sh attach   # Attach to tmux session"
}

# Function to start tmux session for a worktree
start_tmux_session() {
    local BRANCH="$1"
    local CONFIG_FILE="$CONFIG_DIR/$BRANCH.json"
    
    if [ ! -f "$CONFIG_FILE" ]; then
        echo -e "${RED}Error: No worktree found for branch '$BRANCH'${NC}"
        exit 1
    fi
    
    # Read configuration
    local WORKTREE_PATH=$(jq -r '.path' "$CONFIG_FILE")
    local DEV_PORT=$(jq -r '.dev_port' "$CONFIG_FILE")
    local PRISMA_PORT=$(jq -r '.prisma_port' "$CONFIG_FILE")
    local SESSION="rmp-$BRANCH"
    
    # Check if session already exists
    if tmux has-session -t "$SESSION" 2>/dev/null; then
        echo -e "${YELLOW}Session '$SESSION' already exists${NC}"
        echo "Use: tmux attach -t $SESSION"
        return
    fi
    
    cd "$WORKTREE_PATH"
    
    echo -e "${BLUE}Starting tmux session: $SESSION${NC}"
    
    # Create tmux session with first window
    tmux new-session -d -s "$SESSION" -n "dev" -c "$WORKTREE_PATH"
    
    # Window: Dev Server (with logs pane)
    tmux send-keys -t "$SESSION:dev" "echo 'Installing dependencies and building packages...'" C-m
    tmux send-keys -t "$SESSION:dev" "pnpm install && pnpm --filter @roast/domain run build && pnpm --filter @roast/db run build" C-m
    tmux send-keys -t "$SESSION:dev" "echo 'Starting dev server on port $DEV_PORT...'" C-m
    tmux send-keys -t "$SESSION:dev" "PORT=$DEV_PORT pnpm --filter @roast/web dev" C-m
    tmux split-window -t "$SESSION:dev" -h -c "$WORKTREE_PATH"
    tmux send-keys -t "$SESSION:dev.2" "echo 'Dev server logs will appear here'" C-m
    tmux send-keys -t "$SESSION:dev.2" "sleep 5 && curl -s http://localhost:$DEV_PORT/api/health || echo 'Server starting...'" C-m
    
    # Window: Workers
    tmux new-window -t "$SESSION" -n "workers" -c "$WORKTREE_PATH"
    tmux send-keys -t "$SESSION:workers" "echo 'Starting job processor...'" C-m
    tmux send-keys -t "$SESSION:workers" "pnpm run process-jobs" C-m
    tmux split-window -t "$SESSION:workers" -h -c "$WORKTREE_PATH"
    tmux send-keys -t "$SESSION:workers.2" "echo 'TypeScript watch mode...'" C-m
    tmux send-keys -t "$SESSION:workers.2" "pnpm --filter @roast/web run typecheck --watch" C-m
    
    # Window: Database
    tmux new-window -t "$SESSION" -n "database" -c "$WORKTREE_PATH"
    tmux send-keys -t "$SESSION:database" "echo 'Starting Prisma Studio on port $PRISMA_PORT...'" C-m
    tmux send-keys -t "$SESSION:database" "pnpm --filter @roast/db run db:studio -p $PRISMA_PORT" C-m
    tmux split-window -t "$SESSION:database" -h -c "$WORKTREE_PATH"
    tmux send-keys -t "$SESSION:database.2" "echo 'Database monitoring...'" C-m
    tmux send-keys -t "$SESSION:database.2" "# You can run database queries here" C-m
    
    # Window: Free terminal
    tmux new-window -t "$SESSION" -n "terminal" -c "$WORKTREE_PATH"
    tmux send-keys -t "$SESSION:terminal" "echo 'Free terminal for ad-hoc commands'" C-m
    tmux send-keys -t "$SESSION:terminal" "echo 'Branch: $BRANCH | Dev: $DEV_PORT | Prisma: $PRISMA_PORT'" C-m
    
    # Select first window
    tmux select-window -t "$SESSION:dev"
    
    echo -e "${GREEN}✓ Session started successfully!${NC}"
    echo ""
    echo "URLs:"
    echo "  Dev server: http://localhost:$DEV_PORT"
    echo "  Prisma Studio: http://localhost:$PRISMA_PORT"
    echo ""
    echo "Attach with: tmux attach -t $SESSION"
    echo ""
    echo "Tmux tips:"
    echo "  Ctrl+B, D     - Detach from session"
    echo "  Ctrl+B, 0-3   - Switch windows"
    echo "  Ctrl+B, arrow - Switch panes"
    echo "  Ctrl+B, [     - Scroll mode (q to exit)"
}

# Function to attach to session
attach_session() {
    local BRANCH="$1"
    local SESSION="rmp-$BRANCH"
    
    if tmux has-session -t "$SESSION" 2>/dev/null; then
        tmux attach-session -t "$SESSION"
    else
        echo -e "${RED}Session '$SESSION' not found${NC}"
        echo "Start it with: $0 start $BRANCH"
    fi
}

# Function to stop session
stop_session() {
    local BRANCH="$1"
    local SESSION="rmp-$BRANCH"
    
    if tmux has-session -t "$SESSION" 2>/dev/null; then
        echo -e "${YELLOW}Stopping session: $SESSION${NC}"
        tmux kill-session -t "$SESSION"
        echo -e "${GREEN}✓ Session stopped${NC}"
    else
        echo -e "${RED}Session '$SESSION' not found${NC}"
    fi
}

# Function to list worktrees
list_worktrees() {
    echo -e "${BLUE}Roast My Post Worktrees:${NC}"
    echo ""
    
    local found=false
    for config in "$CONFIG_DIR"/*.json; do
        if [ -f "$config" ]; then
            found=true
            local branch=$(jq -r '.branch' "$config")
            local dev_port=$(jq -r '.dev_port' "$config")
            local prisma_port=$(jq -r '.prisma_port' "$config")
            local session=$(jq -r '.tmux_session' "$config")
            local path=$(jq -r '.path' "$config")
            
            echo -e "${GREEN}$branch${NC}"
            echo "  Path: $path"
            echo "  Ports: Dev=$dev_port, Prisma=$prisma_port"
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
    fi
}

# Function to show status
show_status() {
    echo -e "${BLUE}Active tmux sessions:${NC}"
    echo ""
    tmux ls 2>/dev/null | grep "^rmp-" || echo "No active sessions"
    echo ""
    
    echo -e "${BLUE}Quick commands:${NC}"
    for config in "$CONFIG_DIR"/*.json; do
        if [ -f "$config" ]; then
            local branch=$(jq -r '.branch' "$config")
            local session=$(jq -r '.tmux_session' "$config")
            if tmux has-session -t "$session" 2>/dev/null; then
                echo "  tmux attach -t $session    # Attach to $branch"
            fi
        fi
    done
}

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
    attach|a)
        if [ $# -lt 2 ]; then
            echo "Usage: $0 attach <branch>"
            exit 1
        fi
        attach_session "$2"
        ;;
    stop)
        if [ $# -lt 2 ]; then
            echo "Usage: $0 stop <branch>"
            exit 1
        fi
        stop_session "$2"
        ;;
    list|ls)
        list_worktrees
        ;;
    status|st)
        show_status
        ;;
    *)
        echo "Roast My Post Worktree Manager (with tmux)"
        echo ""
        echo "Usage: $0 <command> [args]"
        echo ""
        echo "Commands:"
        echo "  create <branch> [base]  - Create new worktree"
        echo "  start <branch>          - Start tmux session"
        echo "  attach <branch>         - Attach to tmux session"
        echo "  stop <branch>           - Stop tmux session"
        echo "  list                    - List all worktrees"
        echo "  status                  - Show active sessions"
        echo ""
        echo "Example workflow:"
        echo "  $0 create feature-x     # Create worktree"
        echo "  $0 start feature-x      # Start all processes"
        echo "  $0 attach feature-x     # Attach to session"
        ;;
esac