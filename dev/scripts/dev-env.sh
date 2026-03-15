#!/bin/bash

# Dev environment manager using tmux
# Usage: ./dev-env.sh [start|stop|status|attach|restart]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/dev/docker-compose.dev.yml"
SESSION_NAME="roast-dev"

start_dev() {
    if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
        echo "Session '$SESSION_NAME' already running"
        exit 0
    fi

    cd "$REPO_ROOT"

    # Window 0 "db": Postgres in foreground
    tmux new-session -d -s "$SESSION_NAME" -n "db" -c "$REPO_ROOT"
    tmux send-keys -t "$SESSION_NAME:db" "docker compose -f $COMPOSE_FILE up" Enter

    # Wait for Postgres to be ready
    echo "Waiting for Postgres..."
    for i in $(seq 1 30); do
        if docker compose -f "$COMPOSE_FILE" exec -T db pg_isready -U postgres >/dev/null 2>&1; then
            echo "Postgres ready"
            break
        fi
        sleep 1
    done

    # Window 1 "dev": web (left) + worker (right)
    tmux new-window -t "$SESSION_NAME" -n "dev" -c "$REPO_ROOT"
    tmux send-keys -t "$SESSION_NAME:dev.0" "pnpm run dev -H 0.0.0.0" Enter

    tmux split-window -h -t "$SESSION_NAME:dev" -c "$REPO_ROOT/internal-packages/jobs"
    tmux send-keys -t "$SESSION_NAME:dev.1" "NODE_ENV=development pnpm run process-pgboss" Enter

    # Start on the dev window
    tmux select-window -t "$SESSION_NAME:dev"
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
    # Stop Postgres container
    docker compose -f "$COMPOSE_FILE" stop 2>/dev/null
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

restart_dev() {
    if ! tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
        echo "Session '$SESSION_NAME' is not running. Starting fresh..."
        start_dev
        return
    fi

    echo "Restarting dev environment..."

    # Send Ctrl+C to web and worker panes (not postgres)
    tmux send-keys -t "$SESSION_NAME:dev.0" C-c
    tmux send-keys -t "$SESSION_NAME:dev.1" C-c

    # Wait a moment for processes to die
    sleep 1

    # Clear visible screen and scrollback buffer in web and worker panes
    tmux send-keys -t "$SESSION_NAME:dev.0" "clear" Enter
    tmux send-keys -t "$SESSION_NAME:dev.1" "clear" Enter
    sleep 0.2
    tmux clear-history -t "$SESSION_NAME:dev.0"
    tmux clear-history -t "$SESSION_NAME:dev.1"

    # Re-run the commands
    tmux send-keys -t "$SESSION_NAME:dev.0" "pnpm run dev -H 0.0.0.0" Enter
    tmux send-keys -t "$SESSION_NAME:dev.1" "NODE_ENV=development pnpm run process-pgboss" Enter

    echo "Dev environment restarted in existing session."
}

psql_dev() {
    source "$SCRIPT_DIR/dev/db/lib/db_functions.sh"
    psql_local "${LOCAL_DB_NAME:-roast_my_post}" "$@"
}

psql_prod_cmd() {
    source "$SCRIPT_DIR/dev/db/lib/db_functions.sh"
    psql_prod "$@"
}

psql_staging_cmd() {
    source "$SCRIPT_DIR/dev/db/lib/db_functions.sh"
    psql_staging "$@"
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
    restart)
        restart_dev
        ;;
    psql)
        shift
        psql_dev "$@"
        ;;
    psql-prod)
        shift
        psql_prod_cmd "$@"
        ;;
    psql-staging)
        shift
        psql_staging_cmd "$@"
        ;;
    *)
        echo "Usage: $0 [start|stop|status|attach|restart|psql|psql-prod|psql-staging]"
        exit 1
        ;;
esac
