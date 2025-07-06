#!/bin/bash

# worktree-port-manager.sh - Smart port allocation for git worktrees
#
# Port allocation strategy:
#   Main repo:    3000-3099
#   Worktree 1:   3100-3199
#   Worktree 2:   3200-3299
#   etc.
#
# Within each range:
#   :00 - Next.js dev server
#   :55 - Prisma Studio
#   :06 - Storybook
#   :10 - MCP Server
#   etc.

set -e

# Configuration
CONFIG_DIR="$HOME/.config/roast-my-post-worktrees"
mkdir -p "$CONFIG_DIR"

# Port range configuration
BASE_PORT=3000
PORT_RANGE_SIZE=100

# Service offsets within each range
# Using case statement for compatibility
get_service_offset() {
    case "$1" in
        "dev") echo 0 ;;
        "prisma") echo 55 ;;
        "storybook") echo 6 ;;
        "mcp") echo 10 ;;
        "api-docs") echo 20 ;;
        "test") echo 30 ;;
        "monitor") echo 80 ;;
        *) echo 0 ;;
    esac
}

# Get the next available worktree ID
get_next_worktree_id() {
    local max_id=-1
    
    # Check existing configurations
    for config in "$CONFIG_DIR"/*.json; do
        if [ -f "$config" ]; then
            local id=$(jq -r '.worktree_id // -1' "$config" 2>/dev/null || echo -1)
            if [ "$id" -gt "$max_id" ]; then
                max_id=$id
            fi
        fi
    done
    
    # Main repo is ID 0, so start worktrees at 1
    if [ "$max_id" -eq -1 ]; then
        echo 1  # First worktree should be ID 1
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

# Get port range for a worktree
get_port_range() {
    local worktree_id=$1
    local start=$((BASE_PORT + (worktree_id * PORT_RANGE_SIZE)))
    local end=$((start + PORT_RANGE_SIZE - 1))
    echo "$start-$end"
}

# Save worktree configuration
save_worktree_config() {
    local branch=$1
    local worktree_id=$2
    local path=$3
    
    local config_file="$CONFIG_DIR/$branch.json"
    
    # Calculate all service ports
    local dev_port=$(calculate_port $worktree_id "dev")
    local prisma_port=$(calculate_port $worktree_id "prisma")
    local storybook_port=$(calculate_port $worktree_id "storybook")
    local mcp_port=$(calculate_port $worktree_id "mcp")
    
    cat > "$config_file" <<EOF
{
    "branch": "$branch",
    "worktree_id": $worktree_id,
    "path": "$path",
    "port_range": "$(get_port_range $worktree_id)",
    "ports": {
        "dev": $dev_port,
        "prisma": $prisma_port,
        "storybook": $storybook_port,
        "mcp": $mcp_port,
        "api_docs": $(calculate_port $worktree_id "api-docs"),
        "test": $(calculate_port $worktree_id "test"),
        "monitor": $(calculate_port $worktree_id "monitor")
    },
    "created": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF
    
    echo "Configuration saved to: $config_file"
}

# Show port allocation table
show_port_allocation() {
    echo "🌳 Roast My Post - Port Allocation Table"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # Show main repo
    echo "📁 Main Repository (ID: 0)"
    echo "   Port Range: $(get_port_range 0)"
    echo "   Services:"
    echo "   - dev         : $(calculate_port 0 'dev')"
    echo "   - prisma      : $(calculate_port 0 'prisma')"
    echo "   - storybook   : $(calculate_port 0 'storybook')"
    echo "   - mcp         : $(calculate_port 0 'mcp')"
    echo "   - api-docs    : $(calculate_port 0 'api-docs')"
    echo "   - test        : $(calculate_port 0 'test')"
    echo "   - monitor     : $(calculate_port 0 'monitor')"
    echo ""
    
    # Show worktrees
    for config in "$CONFIG_DIR"/*.json; do
        if [ -f "$config" ]; then
            local branch=$(jq -r '.branch' "$config")
            local id=$(jq -r '.worktree_id' "$config")
            local range=$(jq -r '.port_range' "$config")
            
            echo "🌿 $branch (ID: $id)"
            echo "   Port Range: $range"
            echo "   Services:"
            jq -r '.ports | to_entries | .[] | "   - \(.key): \(.value)"' "$config" | sort
            echo ""
        fi
    done
}

# Get config for a branch
get_branch_config() {
    local branch=$1
    local config_file="$CONFIG_DIR/$branch.json"
    
    if [ -f "$config_file" ]; then
        cat "$config_file"
    else
        echo "{}"
    fi
}

# Check for port conflicts
check_port_conflicts() {
    local port=$1
    
    # Check if port is in use
    if lsof -i :$port >/dev/null 2>&1; then
        local process=$(lsof -i :$port | grep LISTEN | awk '{print $1}' | head -1)
        echo "⚠️  Port $port is already in use by: $process"
        return 1
    fi
    
    return 0
}

# Main command handling
case "${1:-help}" in
    allocate)
        if [ $# -lt 3 ]; then
            echo "Usage: $0 allocate <branch> <path>"
            exit 1
        fi
        worktree_id=$(get_next_worktree_id)
        save_worktree_config "$2" "$worktree_id" "$3"
        ;;
        
    show)
        show_port_allocation
        ;;
        
    get)
        if [ $# -lt 2 ]; then
            echo "Usage: $0 get <branch>"
            exit 1
        fi
        get_branch_config "$2"
        ;;
        
    check)
        if [ $# -lt 2 ]; then
            echo "Usage: $0 check <branch>"
            exit 1
        fi
        config=$(get_branch_config "$2")
        if [ "$config" = "{}" ]; then
            echo "No configuration found for branch: $2"
            exit 1
        fi
        
        echo "Checking ports for $2..."
        echo "$config" | jq -r '.ports | to_entries | .[] | "\(.value) \(.key)"' | while read port service; do
            if check_port_conflicts $port; then
                echo "✅ Port $port ($service) is available"
            fi
        done
        ;;
        
    *)
        echo "Roast My Post - Port Manager"
        echo ""
        echo "Usage: $0 <command> [args]"
        echo ""
        echo "Commands:"
        echo "  allocate <branch> <path>  - Allocate ports for a new worktree"
        echo "  show                      - Show all port allocations"
        echo "  get <branch>              - Get configuration for a branch"
        echo "  check <branch>            - Check if allocated ports are free"
        echo ""
        echo "Port Allocation Strategy:"
        echo "  Each worktree gets 100 ports (e.g., 3000-3099, 3100-3199)"
        echo "  Standard services always use the same offset:"
        echo "    :00 = Dev server"
        echo "    :55 = Prisma Studio"
        echo "    :06 = Storybook"
        echo "    etc."
        ;;
esac