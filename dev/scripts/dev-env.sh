#!/bin/bash

# Dev environment manager using zellij
# Usage: ./dev-env.sh [start|stop|status|attach]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SESSION_NAME="roast-dev"
LAYOUT_FILE="$SCRIPT_DIR/dev-env.kdl"

start_dev() {
    if zellij list-sessions 2>/dev/null | grep -q "$SESSION_NAME"; then
        echo "Session '$SESSION_NAME' already running"
        exit 0
    fi

    cd "$REPO_ROOT"
    zellij --session "$SESSION_NAME" --new-session-with-layout "$LAYOUT_FILE" &
    sleep 2
    echo "Dev session '$SESSION_NAME' started"
}

stop_dev() {
    if zellij list-sessions 2>/dev/null | grep -q "$SESSION_NAME"; then
        echo "Stopping dev environment..."
        zellij kill-session "$SESSION_NAME"
        echo "Session '$SESSION_NAME' stopped."
    else
        echo "Session '$SESSION_NAME' is not running."
    fi
}

status_dev() {
    if zellij list-sessions 2>/dev/null | grep -q "$SESSION_NAME"; then
        echo "Session '$SESSION_NAME' is running."
        zellij list-sessions | grep "$SESSION_NAME"
    else
        echo "Session '$SESSION_NAME' is not running."
    fi
}

attach_dev() {
    if zellij list-sessions 2>/dev/null | grep -q "$SESSION_NAME"; then
        zellij attach "$SESSION_NAME"
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
