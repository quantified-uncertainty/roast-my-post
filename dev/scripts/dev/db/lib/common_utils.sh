#!/usr/bin/env bash

# Common utility functions for scripts
set -euo pipefail
IFS=$'\n\t'

# Check required environment variables
check_required_vars() {
    local required_vars=("$@")
    for var in "${required_vars[@]}"; do
        if [ -z "${!var:-}" ]; then
            echo "Error: $var environment variable is required"
            exit 1
        fi
    done
}

# Check if commands are installed
check_command() {
    local cmds=("$@")
    for cmd in "${cmds[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            echo "Error: $cmd is required but not installed. Please install $cmd first."
            exit 1
        fi
    done
}
