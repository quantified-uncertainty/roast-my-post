#!/bin/bash

# Dev environment manager using tmux
# Usage: ./dev-env.sh [start|stop|status|attach]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SESSION_NAME="roast-dev"

start_dev() {
    if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
        echo "Session '$SESSION_NAME' already running"
        exit 0
    fi

    cd "$REPO_ROOT"

    # Create new detached session with first window for web
    tmux new-session -d -s "$SESSION_NAME" -n "dev" -c "$REPO_ROOT"

    # Split vertically and run jobs in right pane
    tmux split-window -h -t "$SESSION_NAME:dev" -c "$REPO_ROOT/internal-packages/jobs"

    # Run web dev server in left pane
    tmux send-keys -t "$SESSION_NAME:dev.0" "pnpm run dev -H 0.0.0.0" Enter

    # Run jobs processor in right pane
    tmux send-keys -t "$SESSION_NAME:dev.1" "NODE_ENV=development pnpm run process-pgboss" Enter

    # Select left pane
    tmux select-pane -t "$SESSION_NAME:dev.0"

    echo "Dev session '$SESSION_NAME' started"
    echo "Use './dev-env.sh attach' or 'tmux attach -t $SESSION_NAME' to attach"
}

stop_dev() {
    if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
        echo "Stopping dev environment..."
        tmux kill-session -t "$SESSION_NAME"
        echo "Session '$SESSION_NAME' stopped."
    else
        echo "Session '$SESSION_NAME' is not running."
    fi
}

status_dev() {
    if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
        echo "Session '$SESSION_NAME' is running."
        tmux list-windows -t "$SESSION_NAME"
    else
        echo "Session '$SESSION_NAME' is not running."
    fi
}

attach_dev() {
    if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
        tmux attach -t "$SESSION_NAME"
    else
        echo "Session '$SESSION_NAME' is not running. Use 'start' first."
    fi
}

case "${1:-start}" in
    start)
        start_dev
        ;;
    stop)
        stop_dev
        ;;
    status)
        status_dev
        ;;
    attach)
        attach_dev
        ;;
    *)
        echo "Usage: $0 [start|stop|status|attach]"
        exit 1
        ;;
esac
